import { useState, useEffect, useRef } from 'react';
import { PerformanceAnalyzer, exportPerformanceReport, exportPerformanceCSV, type PerformanceReport } from '../lib/performanceAnalyzer';
import { Term } from '../components/Term';
import { toast, ToastContainer, type ToastMessage } from '../components/Toast';

interface TestConfig {
  batchSize: number;
  sequenceLength: number;
  iterations: number;
}

type ViewMode = 'config' | 'running' | 'results';

export default function PerformancePage() {
  const [viewMode, setViewMode] = useState<ViewMode>('config');
  const [config, setConfig] = useState<TestConfig>({
    batchSize: 1,
    sequenceLength: 128,
    iterations: 10,
  });
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [device, setDevice] = useState<'webgpu' | 'wasm'>('webgpu');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const analyzerRef = useRef<PerformanceAnalyzer | null>(null);

  useEffect(() => {
    const unsubscribe = toast.subscribe(setToasts);
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    // 检测当前设备类型（简化版）
    const detectedDevice = 'gpu' in navigator ? 'webgpu' : 'wasm';
    setDevice(detectedDevice);
    analyzerRef.current = new PerformanceAnalyzer(detectedDevice);
  }, []);

  const handleRunTest = async () => {
    if (!analyzerRef.current) return;

    setRunning(true);
    setViewMode('running');
    setProgress(0);

    const analyzer = analyzerRef.current;
    analyzer.clear();

    try {
      for (let i = 0; i < config.iterations; i++) {
        // 模拟推理过程
        analyzer.start();

        // 实际项目中，这里应该调用 worker 进行真实推理
        await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 50));

        analyzer.end();
        setProgress(((i + 1) / config.iterations) * 100);
      }

      // 生成报告
      const generatedReport = analyzer.generateReport('Phi-3.5-mini', {
        batchSize: config.batchSize,
        sequenceLength: config.sequenceLength,
        quantization: device === 'webgpu' ? 'q4f16' : 'q4',
      });

      setReport(generatedReport);
      setViewMode('results');
      toast.success('测试完成', `完成 ${config.iterations} 次推理，平均 ${generatedReport.metrics.avgInferenceTime.toFixed(1)}ms`);
    } catch (err) {
      console.error('性能测试失败:', err);
      toast.error('测试失败', '性能测试过程出错，请重试');
    } finally {
      setRunning(false);
    }
  };

  const handleExportJSON = () => {
    if (!report) return;

    const json = exportPerformanceReport(report);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('导出成功', '性能报告已导出为 JSON 文件');
  };

  const handleExportCSV = () => {
    if (!report) return;

    const csv = exportPerformanceCSV(report);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('导出成功', '性能报告已导出为 CSV 文件');
  };

  return (
    <div className="flex h-full flex-col">
      <ToastContainer toasts={toasts} onClose={(id) => toast.close(id)} />

      <header className="border-b border-line bg-surface-1 px-6 py-4">
        <h1 className="text-[18px] font-semibold text-ink">模型性能分析</h1>
        <p className="mt-1 text-[12px] text-ink-2">
          推理性能测试、吞吐量分析、内存占用监控
        </p>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 左侧控制面板 */}
        <aside className="w-80 overflow-y-auto border-r border-line bg-surface p-5 space-y-5">
          <section className="space-y-3">
            <h2 className="text-[13px] font-medium text-ink">测试配置</h2>

            <div className="rounded-md border border-obs-line bg-obs-2 px-3 py-2 text-[12px] text-obs-ink">
              <p className="flex justify-between">
                <span>设备类型</span>
                <span className="font-medium">
                  {device === 'webgpu' ? 'GPU 加速' : 'CPU 模式'}
                </span>
              </p>
              <p className="mt-1 flex justify-between">
                <span>量化方式</span>
                <span className="font-medium">
                  {device === 'webgpu' ? 'q4f16' : 'q4'}
                </span>
              </p>
            </div>

            <label className="block text-[12px] text-ink-2">
              <span className="mb-1 flex justify-between">
                <span>Batch Size</span>
                <span className="font-medium text-ink">{config.batchSize}</span>
              </span>
              <input
                type="range"
                min={1}
                max={8}
                step={1}
                className="w-full accent-accent"
                value={config.batchSize}
                onChange={(e) =>
                  setConfig({ ...config, batchSize: Number(e.target.value) })
                }
                disabled={running}
              />
            </label>

            <label className="block text-[12px] text-ink-2">
              <span className="mb-1 flex justify-between">
                <span>序列长度</span>
                <span className="font-medium text-ink">{config.sequenceLength}</span>
              </span>
              <input
                type="range"
                min={64}
                max={512}
                step={64}
                className="w-full accent-accent"
                value={config.sequenceLength}
                onChange={(e) =>
                  setConfig({ ...config, sequenceLength: Number(e.target.value) })
                }
                disabled={running}
              />
            </label>

            <label className="block text-[12px] text-ink-2">
              <span className="mb-1 flex justify-between">
                <span>测试次数</span>
                <span className="font-medium text-ink">{config.iterations}</span>
              </span>
              <input
                type="range"
                min={5}
                max={50}
                step={5}
                className="w-full accent-accent"
                value={config.iterations}
                onChange={(e) =>
                  setConfig({ ...config, iterations: Number(e.target.value) })
                }
                disabled={running}
              />
            </label>

            <button
              type="button"
              className="w-full rounded-md bg-measure-500 px-4 py-2.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              onClick={handleRunTest}
              disabled={running}
            >
              {running ? '测试中...' : '开始测试'}
            </button>
          </section>

          {report && (
            <section className="space-y-3">
              <h2 className="text-[13px] font-medium text-ink">导出报告</h2>

              <button
                type="button"
                className="w-full rounded-md border border-line bg-obs-2 px-4 py-2 text-[13px] text-ink-2 transition-colors hover:border-accent hover:text-ink"
                onClick={handleExportJSON}
              >
                导出 JSON
              </button>

              <button
                type="button"
                className="w-full rounded-md border border-line bg-obs-2 px-4 py-2 text-[13px] text-ink-2 transition-colors hover:border-accent hover:text-ink"
                onClick={handleExportCSV}
              >
                导出 CSV
              </button>
            </section>
          )}
        </aside>

        {/* 右侧内容区域 */}
        <main className="flex-1 overflow-y-auto bg-obs-1 p-6">
          {viewMode === 'config' && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="text-[14px] text-obs-ink2">配置测试参数并开始测试</p>
                <p className="mt-2 text-[12px] text-obs-ink2/60">
                  测试将运行 {config.iterations} 次，每次序列长度 {config.sequenceLength}
                </p>
              </div>
            </div>
          )}

          {viewMode === 'running' && (
            <div className="flex h-full items-center justify-center">
              <div className="w-full max-w-md space-y-4 text-center">
                <p className="text-[14px] text-obs-ink">性能测试进行中...</p>

                <div className="h-2 w-full overflow-hidden rounded-full bg-obs-2">
                  <div
                    className="h-full rounded-full bg-measure-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <p className="text-[12px] text-obs-ink2">
                  {Math.round(progress)}% 完成
                </p>
              </div>
            </div>
          )}

          {viewMode === 'results' && report && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[14px] font-medium text-obs-ink">测试结果</h3>
                <button
                  type="button"
                  className="rounded-md border border-obs-line bg-obs-2 px-3 py-1.5 text-[12px] text-obs-ink2 transition-colors hover:border-measure-400/40 hover:text-obs-ink"
                  onClick={() => setViewMode('config')}
                >
                  返回配置
                </button>
              </div>

              {/* 关键指标卡片 */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-md border border-obs-line bg-obs-2 p-4">
                  <p className="text-[11px] text-obs-ink2">平均推理时间</p>
                  <p className="mt-1 text-[20px] font-semibold text-obs-ink">
                    {report.metrics.avgInferenceTime.toFixed(1)}
                    <span className="ml-1 text-[12px] font-normal text-obs-ink2">ms</span>
                  </p>
                </div>

                <div className="rounded-md border border-obs-line bg-obs-2 p-4">
                  <p className="text-[11px] text-obs-ink2">
                    <Term id="tokens_per_second">吞吐量</Term>
                  </p>
                  <p className="mt-1 text-[20px] font-semibold text-obs-ink">
                    {report.metrics.throughput.toFixed(1)}
                    <span className="ml-1 text-[12px] font-normal text-obs-ink2">t/s</span>
                  </p>
                </div>

                <div className="rounded-md border border-obs-line bg-obs-2 p-4">
                  <p className="text-[11px] text-obs-ink2">内存峰值</p>
                  <p className="mt-1 text-[20px] font-semibold text-obs-ink">
                    {report.metrics.peakMemoryMB.toFixed(0)}
                    <span className="ml-1 text-[12px] font-normal text-obs-ink2">MB</span>
                  </p>
                </div>

                <div className="rounded-md border border-obs-line bg-obs-2 p-4">
                  <p className="text-[11px] text-obs-ink2">测试次数</p>
                  <p className="mt-1 text-[20px] font-semibold text-obs-ink">
                    {report.profiles.length}
                    <span className="ml-1 text-[12px] font-normal text-obs-ink2">次</span>
                  </p>
                </div>
              </div>

              {/* 详细性能数据 */}
              <div className="space-y-3">
                <h4 className="text-[13px] font-medium text-obs-ink">详细数据</h4>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr>
                        <th className="border border-obs-line bg-obs-2 p-2 text-left text-obs-ink2">
                          #
                        </th>
                        <th className="border border-obs-line bg-obs-2 p-2 text-left text-obs-ink2">
                          时间戳
                        </th>
                        <th className="border border-obs-line bg-obs-2 p-2 text-right text-obs-ink2">
                          推理时间 (ms)
                        </th>
                        <th className="border border-obs-line bg-obs-2 p-2 text-right text-obs-ink2">
                          设备
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.profiles.map((profile, i) => (
                        <tr key={i}>
                          <td className="border border-obs-line bg-obs-1 p-2 text-obs-ink">
                            {i + 1}
                          </td>
                          <td className="border border-obs-line bg-obs-1 p-2 text-obs-ink2">
                            {new Date(profile.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="border border-obs-line bg-obs-1 p-2 text-right tabular-nums text-obs-ink">
                            {profile.totalTime.toFixed(2)}
                          </td>
                          <td className="border border-obs-line bg-obs-1 p-2 text-right text-obs-ink2">
                            {profile.device}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 测试配置 */}
              <div className="space-y-2 rounded-md border border-obs-line bg-obs-2 p-4">
                <h4 className="text-[12px] font-medium text-obs-ink">测试配置</h4>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-obs-ink2">
                  <p>
                    模型: <span className="text-obs-ink">{report.modelId}</span>
                  </p>
                  <p>
                    设备: <span className="text-obs-ink">{report.device}</span>
                  </p>
                  <p>
                    Batch Size:{' '}
                    <span className="text-obs-ink">{report.config.batchSize}</span>
                  </p>
                  <p>
                    序列长度:{' '}
                    <span className="text-obs-ink">{report.config.sequenceLength}</span>
                  </p>
                  <p>
                    量化方式:{' '}
                    <span className="text-obs-ink">{report.config.quantization}</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
