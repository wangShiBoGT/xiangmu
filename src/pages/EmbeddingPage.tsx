import { useState, useRef, useEffect } from 'react';
import {
  loadEmbeddingModel,
  textToEmbedding,
  computeSimilarity,
  isEmbeddingModelLoaded,
  type EmbeddingResult,
} from '../lib/embedding';
import { reduceDimensions, type DimensionReductionOptions } from '../lib/dimensionReduction';
import EmbeddingVisualization, { type VisPoint } from '../components/EmbeddingVisualization';
import { Term } from '../components/Term';
import { toast, ToastContainer, type ToastMessage } from '../components/Toast';

interface TextItem {
  id: string;
  text: string;
  embedding: Float32Array | null;
  durationMs?: number;
}

type ViewMode = 'input' | 'visualize' | 'similarity';

export default function EmbeddingPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('input');
  const [texts, setTexts] = useState<TextItem[]>([
    { id: crypto.randomUUID(), text: '', embedding: null },
  ]);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [visualPoints, setVisualPoints] = useState<VisPoint[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [algorithm, setAlgorithm] = useState<'tsne' | 'umap'>('umap');
  const [dimensions, setDimensions] = useState<2 | 3>(3);
  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const unsubscribe = toast.subscribe(setToasts);
    return () => {
      unsubscribe();
    };
  }, []);

  const handleAddText = () => {
    setTexts([...texts, { id: crypto.randomUUID(), text: '', embedding: null }]);
  };

  const handleRemoveText = (id: string) => {
    setTexts(texts.filter((t) => t.id !== id));
  };

  const handleTextChange = (id: string, text: string) => {
    setTexts(texts.map((t) => (t.id === id ? { ...t, text } : t)));
  };

  const handleLoadModel = async () => {
    try {
      setProcessing(true);
      await loadEmbeddingModel('Xenova/all-MiniLM-L6-v2', (progress) => {
        setLoadProgress(Math.round(progress));
      });
      setModelLoaded(true);
      toast.success('模型加载成功', '384 维 Embedding 模型已就绪');
    } catch (err) {
      console.error('模型加载失败:', err);
      toast.error('模型加载失败', '请检查网络连接并重试');
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerateEmbeddings = async () => {
    if (!isEmbeddingModelLoaded()) {
      toast.warning('请先加载模型', '需要先加载 Embedding 模型才能生成向量');
      return;
    }

    const validTexts = texts.filter((t) => t.text.trim().length > 0);
    if (validTexts.length === 0) {
      toast.warning('请输入文本', '至少需要输入一段文本才能生成向量');
      return;
    }

    try {
      setProcessing(true);

      const results: TextItem[] = [];
      for (const item of validTexts) {
        const result: EmbeddingResult = await textToEmbedding(item.text, {
          pooling: 'mean',
          normalize: true,
        });
        results.push({
          ...item,
          embedding: result.embedding,
          durationMs: result.durationMs,
        });
      }

      setTexts(results);
      toast.success(
        '向量生成完成',
        `已生成 ${results.length} 个向量（${results[0].embedding!.length} 维）`
      );
    } catch (err) {
      console.error('向量化失败:', err);
      toast.error('向量化失败', '生成向量时出错，请重试');
    } finally {
      setProcessing(false);
    }
  };

  const handleVisualize = async () => {
    const embeddedTexts = texts.filter((t) => t.embedding !== null);
    if (embeddedTexts.length < 2) {
      toast.warning('文本数量不足', '至少需要 2 个已向量化的文本才能进行可视化');
      return;
    }

    try {
      setProcessing(true);

      const embeddings = embeddedTexts.map((t) => t.embedding!);
      const options: DimensionReductionOptions = {
        algorithm,
        dimensions,
        iterations: algorithm === 'tsne' ? 1000 : undefined,
        perplexity: algorithm === 'tsne' ? Math.min(30, embeddedTexts.length - 1) : undefined,
      };

      const reduced = await reduceDimensions(embeddings, options, (progress) => {
        console.log(`降维进度: ${progress}%`);
      });

      const points: VisPoint[] = reduced.map((pt) => {
        const coords = pt.coordinates;
        return {
          index: pt.index,
          position:
            coords.length === 3
              ? [coords[0], coords[1], coords[2]]
              : [coords[0], coords[1], 0],
          label: embeddedTexts[pt.index].text.slice(0, 40) + '...',
          color: '#38bdf8',
        };
      });

      setVisualPoints(points);
      setViewMode('visualize');
      toast.success(
        '可视化完成',
        `使用 ${algorithm.toUpperCase()} 算法降维到 ${dimensions}D 空间`
      );
    } catch (err) {
      console.error('可视化失败:', err);
      toast.error('可视化失败', '降维过程出错，请重试');
    } finally {
      setProcessing(false);
    }
  };

  const handleShowSimilarity = () => {
    const embeddedTexts = texts.filter((t) => t.embedding !== null);
    if (embeddedTexts.length < 2) {
      toast.warning('文本数量不足', '至少需要 2 个已向量化的文本才能计算相似度');
      return;
    }
    setViewMode('similarity');
  };

  const handleExportJSON = () => {
    const data = texts
      .filter((t) => t.embedding !== null)
      .map((t) => ({
        text: t.text,
        embedding: Array.from(t.embedding!),
        durationMs: t.durationMs,
      }));

    if (data.length === 0) {
      toast.warning('无数据可导出', '请先生成向量后再导出');
      return;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `embeddings-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('导出成功', `已导出 ${data.length} 个向量到 JSON 文件`);
  };

  const renderSimilarityMatrix = () => {
    const embeddedTexts = texts.filter((t) => t.embedding !== null);
    const n = embeddedTexts.length;

    const matrix: number[][] = Array(n)
      .fill(0)
      .map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1.0;
        } else {
          const sim = computeSimilarity(embeddedTexts[i].embedding!, embeddedTexts[j].embedding!);
          matrix[i][j] = sim.cosine;
        }
      }
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-medium text-obs-ink">
            余弦相似度矩阵
          </h3>
          <button
            type="button"
            className="rounded-md border border-obs-line bg-obs-2 px-3 py-1.5 text-[12px] text-obs-ink2 transition-colors hover:border-measure-400/40 hover:text-obs-ink"
            onClick={() => setViewMode('input')}
          >
            返回输入
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr>
                <th className="border border-obs-line bg-obs-2 p-2 text-left text-obs-ink2">
                  文本
                </th>
                {embeddedTexts.map((_, i) => (
                  <th
                    key={i}
                    className="border border-obs-line bg-obs-2 p-2 text-center text-obs-ink2"
                  >
                    #{i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {embeddedTexts.map((text, i) => (
                <tr key={i}>
                  <td className="border border-obs-line bg-obs-1 p-2 text-obs-ink">
                    <span className="block max-w-[200px] truncate" title={text.text}>
                      #{i + 1}: {text.text}
                    </span>
                  </td>
                  {matrix[i].map((sim, j) => {
                    const bgColor =
                      i === j
                        ? 'bg-obs-2'
                        : sim > 0.7
                        ? 'bg-emerald-500/30'
                        : sim > 0.4
                        ? 'bg-measure-500/20'
                        : 'bg-obs-1';
                    return (
                      <td
                        key={j}
                        className={`border border-obs-line p-2 text-center tabular-nums ${bgColor}`}
                      >
                        {sim.toFixed(3)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-obs-ink2">
          相似度范围: [-1, 1] · 绿色 &gt; 0.7（高相似） · 蓝色 0.4~0.7（中等） · 灰色 &lt; 0.4（低相似）
        </p>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <ToastContainer toasts={toasts} onClose={(id) => toast.close(id)} />

      <header className="border-b border-line bg-surface-1 px-6 py-4">
        <h1 className="text-[18px] font-semibold text-ink">
          <Term id="embedding">Embedding</Term> 向量可视化
        </h1>
        <p className="mt-1 text-[12px] text-ink-2">
          将文本转换为高维向量，通过 t-SNE/UMAP 降维到 3D 空间进行可视化
        </p>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 左侧控制面板 */}
        <aside className="w-80 overflow-y-auto border-r border-line bg-surface p-5 space-y-5">
          {/* 模型加载 */}
          <section className="space-y-3">
            <h2 className="text-[13px] font-medium text-ink">1. 加载模型</h2>
            {!modelLoaded ? (
              <button
                type="button"
                className="w-full rounded-md bg-accent px-4 py-2.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                onClick={handleLoadModel}
                disabled={processing}
              >
                {processing ? `加载中... ${loadProgress}%` : '加载 Xenova/all-MiniLM-L6-v2'}
              </button>
            ) : (
              <div className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-[12px] text-emerald-200">
                ✓ 模型已加载（384 维）
              </div>
            )}
          </section>

          {/* 文本输入 */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-medium text-ink">2. 输入文本</h2>
              <button
                type="button"
                className="text-[12px] text-accent hover:underline"
                onClick={handleAddText}
              >
                + 添加
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {texts.map((item) => (
                <div key={item.id} className="relative">
                  <textarea
                    ref={(el) => {
                      if (el) textareaRefs.current.set(item.id, el);
                    }}
                    className="w-full resize-none rounded-md border border-line bg-surface-1 px-3 py-2 text-[12px] text-ink placeholder-ink-3 focus:border-accent focus:outline-none"
                    rows={2}
                    placeholder="输入一段文本..."
                    value={item.text}
                    onChange={(e) => handleTextChange(item.id, e.target.value)}
                  />
                  {texts.length > 1 && (
                    <button
                      type="button"
                      className="absolute right-2 top-2 text-[11px] text-ink-3 hover:text-ink"
                      onClick={() => handleRemoveText(item.id)}
                    >
                      ✕
                    </button>
                  )}
                  {item.embedding && (
                    <span className="absolute bottom-2 right-2 text-[10px] text-emerald-400">
                      ✓ {item.durationMs?.toFixed(0)}ms
                    </span>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              className="w-full rounded-md border border-accent bg-accent/10 px-4 py-2 text-[13px] font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
              onClick={handleGenerateEmbeddings}
              disabled={!modelLoaded || processing}
            >
              {processing ? '生成中...' : '生成向量'}
            </button>
          </section>

          {/* 可视化设置 */}
          <section className="space-y-3">
            <h2 className="text-[13px] font-medium text-ink">3. 可视化</h2>

            <label className="block text-[12px] text-ink-2">
              <span className="mb-1 block">降维算法</span>
              <select
                className="w-full rounded-[6px] border border-line bg-surface-1 px-3 py-2 text-[12px] text-ink transition-colors focus:border-accent focus:outline-none hover:border-line/80"
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value as 'tsne' | 'umap')}
              >
                <option value="umap">UMAP（快速）</option>
                <option value="tsne">t-SNE（精确）</option>
              </select>
            </label>

            <label className="block text-[12px] text-ink-2">
              <span className="mb-1 block">目标维度</span>
              <select
                className="w-full rounded-[6px] border border-line bg-surface-1 px-3 py-2 text-[12px] text-ink transition-colors focus:border-accent focus:outline-none hover:border-line/80"
                value={dimensions}
                onChange={(e) => setDimensions(Number(e.target.value) as 2 | 3)}
              >
                <option value={2}>2D</option>
                <option value={3}>3D</option>
              </select>
            </label>

            <button
              type="button"
              className="w-full rounded-md bg-measure-500 px-4 py-2.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              onClick={handleVisualize}
              disabled={processing || texts.filter((t) => t.embedding).length < 2}
              title={texts.filter((t) => t.embedding).length < 2 ? '至少需要 2 个向量才能可视化' : ''}
            >
              {processing ? '降维中...' : '3D 可视化'}
            </button>

            <button
              type="button"
              className="w-full rounded-md border border-measure-400/40 bg-measure-500/10 px-4 py-2 text-[13px] font-medium text-measure-300 transition-colors hover:bg-measure-500/20 disabled:opacity-50"
              onClick={handleShowSimilarity}
              disabled={texts.filter((t) => t.embedding).length < 2}
              title={texts.filter((t) => t.embedding).length < 2 ? '至少需要 2 个向量才能计算相似度' : ''}
            >
              相似度矩阵
            </button>

            {texts.filter((t) => t.embedding).length === 1 && (
              <p className="rounded-md border border-[#ffa726]/30 bg-[#ffa726]/10 px-3 py-2 text-[11px] text-[#ffa726]">
                💡 再添加至少 1 个文本并生成向量后，即可进行可视化和相似度对比
              </p>
            )}
          </section>

          {/* 导出 */}
          <section className="space-y-3">
            <h2 className="text-[13px] font-medium text-ink">4. 导出</h2>
            <button
              type="button"
              className="w-full rounded-md border border-line bg-obs-2 px-4 py-2 text-[13px] text-ink-2 transition-colors hover:border-accent hover:text-ink disabled:opacity-50"
              onClick={handleExportJSON}
              disabled={texts.filter((t) => t.embedding).length === 0}
            >
              导出 JSON
            </button>
          </section>
        </aside>

        {/* 右侧可视化区域 */}
        <main className="flex-1 bg-obs-1">
          {viewMode === 'input' && (
            <div className="flex h-full items-center justify-center">
              <div className="max-w-md space-y-4 text-center">
                <div className="text-[14px] text-obs-ink2">
                  {texts.filter((t) => t.embedding).length === 0 ? (
                    <>
                      <p className="mb-2 text-[16px] font-medium text-obs-ink">
                        欢迎使用 Embedding 向量可视化
                      </p>
                      <p>请按照以下步骤操作：</p>
                      <ol className="mt-3 space-y-2 text-left text-[13px]">
                        <li className="flex items-start gap-2">
                          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-accent/20 text-[11px] font-medium text-accent">
                            1
                          </span>
                          <span>点击左侧"加载模型"按钮，等待模型下载完成</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-accent/20 text-[11px] font-medium text-accent">
                            2
                          </span>
                          <span>在文本框中输入多段文本（至少 2 段），点击"+ 添加"可添加更多</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-accent/20 text-[11px] font-medium text-accent">
                            3
                          </span>
                          <span>点击"生成向量"按钮，等待向量化完成</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-accent/20 text-[11px] font-medium text-accent">
                            4
                          </span>
                          <span>选择降维算法和目标维度，点击"3D 可视化"或"相似度矩阵"查看结果</span>
                        </li>
                      </ol>
                    </>
                  ) : (
                    <>
                      <p className="text-[16px] font-medium text-emerald-400">✓ 向量已生成</p>
                      <p className="mt-2">
                        已生成 {texts.filter((t) => t.embedding).length} 个向量
                      </p>
                      <p className="mt-4 text-obs-ink2">
                        请在左侧选择降维算法和目标维度，<br />
                        然后点击"3D 可视化"或"相似度矩阵"查看结果
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {viewMode === 'visualize' && (
            <EmbeddingVisualization
              points={visualPoints}
              highlightIndex={selectedIndex}
              onPointClick={(index) => setSelectedIndex(index)}
            />
          )}

          {viewMode === 'similarity' && (
            <div className="h-full overflow-y-auto p-6">{renderSimilarityMatrix()}</div>
          )}
        </main>
      </div>
    </div>
  );
}
