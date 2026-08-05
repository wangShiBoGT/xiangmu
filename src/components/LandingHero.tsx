import { useCallback, useEffect, useRef, useState } from "react";
import { DEMO_STATS } from "../lib/demoStats.generated";
import { MODELS, formatSize, isModelCached } from "../lib/models";
import { prefersReducedMotion } from "../lib/reducedMotion";
import { logVisit } from "../lib/visitTrace";
import HesitationSlice from "./HesitationSlice";
import Progress from "./Progress";
import {
  IconAperture,
  IconPlay,
  IconEye,
  IconFlask,
  IconArchive,
} from "./icons";

/** 入口 Landing：一行主标题 + 显微镜视野背景 + 底部实测信息卡。
 *  背景为静态显微镜网格视野，营造科学仪器观测氛围。 */

interface AudioRig {
  ctx: AudioContext;
  analyser: AnalyserNode;
  analyserL: AnalyserNode;
  analyserR: AnalyserNode;
  stop: () => void;
}

/** 每格固定伪随机（颗粒纹理用），可复现 */
function cellHash(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

function buildRig(
  ctx: AudioContext,
  source: AudioNode,
  stopSource: () => void,
): AudioRig {
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0;
  const splitter = ctx.createChannelSplitter(2);
  const analyserL = ctx.createAnalyser();
  const analyserR = ctx.createAnalyser();
  analyserL.fftSize = 1024;
  analyserR.fftSize = 1024;
  source.connect(analyser);
  source.connect(splitter);
  splitter.connect(analyserL, 0);
  splitter.connect(analyserR, 1);
  return {
    ctx,
    analyser,
    analyserL,
    analyserR,
    stop: () => {
      stopSource();
      if (ctx.state !== "closed") void ctx.close();
    },
  };
}

function MatrixCanvas({ rig }: { rig: AudioRig | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rigRef = useRef<AudioRig | null>(null);
  rigRef.current = rig;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    let raf = 0;
    let last = performance.now();
    let running = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      if (!raf) requestAnimationFrame(draw);
    };

    // 显微镜视野：细胞式网格 + 扫描线 + 数据流动效果
    const draw = (now: number) => {
      if (!running) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const t = now / 1000;

      const W = canvas.width;
      const H = canvas.height;
      ctx2d.clearRect(0, 0, W, H);

      // 纯黑背景
      ctx2d.fillStyle = '#0a0a0a';
      ctx2d.fillRect(0, 0, W, H);

      // 网格系统：矩形网格 + 对角线，营造数据分析界面感
      const gridSize = Math.max(50, Math.min(W, H) / 16);
      const cols = Math.ceil(W / gridSize) + 1;
      const rows = Math.ceil(H / gridSize) + 1;

      // 主网格线
      ctx2d.strokeStyle = 'rgba(16, 185, 129, 0.15)';
      ctx2d.lineWidth = 1;

      for (let i = 0; i < cols; i++) {
        const x = i * gridSize;
        ctx2d.beginPath();
        ctx2d.moveTo(x, 0);
        ctx2d.lineTo(x, H);
        ctx2d.stroke();
      }

      for (let i = 0; i < rows; i++) {
        const y = i * gridSize;
        ctx2d.beginPath();
        ctx2d.moveTo(0, y);
        ctx2d.lineTo(W, y);
        ctx2d.stroke();
      }

      // 对角线网格（增强科技感）
      ctx2d.strokeStyle = 'rgba(16, 185, 129, 0.08)';
      ctx2d.lineWidth = 0.5;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * gridSize;
          const y = j * gridSize;
          const hash = cellHash(i, j);

          // 随机显示对角线
          if (hash > 0.7) {
            ctx2d.beginPath();
            ctx2d.moveTo(x, y);
            ctx2d.lineTo(x + gridSize, y + gridSize);
            ctx2d.stroke();
          }
        }
      }

      // 数据流光点：随机格子中有流动的光点
      ctx2d.fillStyle = 'rgba(16, 185, 129, 0.4)';
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const hash = cellHash(i, j);
          if (hash > 0.95) {
            const x = i * gridSize + gridSize / 2;
            const y = j * gridSize + gridSize / 2;
            const pulse = 0.4 + 0.6 * Math.sin(t * 3 + hash * 50);
            const size = 3 + pulse * 4;

            ctx2d.beginPath();
            ctx2d.arc(x, y, size, 0, Math.PI * 2);
            ctx2d.fill();

            // 光晕
            const grad = ctx2d.createRadialGradient(x, y, 0, x, y, size * 3);
            grad.addColorStop(0, `rgba(16, 185, 129, ${pulse * 0.3})`);
            grad.addColorStop(1, 'rgba(16, 185, 129, 0)');
            ctx2d.fillStyle = grad;
            ctx2d.beginPath();
            ctx2d.arc(x, y, size * 3, 0, Math.PI * 2);
            ctx2d.fill();
            ctx2d.fillStyle = 'rgba(16, 185, 129, 0.4)';
          }
        }
      }

      // 扫描线：从上到下缓慢扫描
      const scanY = ((t * 0.06) % 1) * H;
      const scanGrad = ctx2d.createLinearGradient(0, scanY - 80, 0, scanY + 80);
      scanGrad.addColorStop(0, 'rgba(16, 185, 129, 0)');
      scanGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.12)');
      scanGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
      ctx2d.fillStyle = scanGrad;
      ctx2d.fillRect(0, scanY - 80, W, 160);

      // 重点区域高亮：中心区域微弱光晕
      const centerGrad = ctx2d.createRadialGradient(
        W / 2, H / 2, 0,
        W / 2, H / 2, Math.min(W, H) * 0.4
      );
      centerGrad.addColorStop(0, 'rgba(16, 185, 129, 0.05)');
      centerGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
      ctx2d.fillStyle = centerGrad;
      ctx2d.fillRect(0, 0, W, H);

      // 角落数据标注（四个角）
      ctx2d.fillStyle = 'rgba(236, 236, 236, 0.25)';
      ctx2d.font = '10px monospace';

      // 左上
      ctx2d.fillText('GRID [0,0]', 16, 20);
      ctx2d.fillText(`T+${Math.floor(t)}s`, 16, 35);

      // 右上
      ctx2d.textAlign = 'right';
      ctx2d.fillText(`SCAN ${Math.floor((scanY / H) * 100)}%`, W - 16, 20);

      // 左下 - 坐标系
      ctx2d.textAlign = 'left';
      ctx2d.fillText('◢', 16, H - 30);
      ctx2d.strokeStyle = 'rgba(236, 236, 236, 0.2)';
      ctx2d.lineWidth = 1;
      ctx2d.beginPath();
      ctx2d.moveTo(20, H - 32);
      ctx2d.lineTo(50, H - 32);
      ctx2d.moveTo(20, H - 32);
      ctx2d.lineTo(20, H - 62);
      ctx2d.stroke();

      ctx2d.textAlign = 'center';

      raf = !prefersReducedMotion() ? requestAnimationFrame(draw) : 0;
    };

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [rig]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full opacity-90"
      aria-hidden="true"
    />
  );
}

interface ProgressItem {
  file: string;
  progress: number;
  total: number;
}

export default function LandingHero({
  status,
  device,
  recommendedId,
  loadingMessage,
  progressItems,
  error,
  errorActions,
  onEnter,
  onExploreDemo,
  onPickModel,
  onReplayImport,
  defaultPickerOpen,
}: {
  /** null=尚未加载任何模型（不自动下载） */
  status: null | "loading" | "ready";
  device: string | null;
  recommendedId: string | null;
  loadingMessage: string;
  progressItems: ProgressItem[];
  error: string | null;
  /** 加载失败时的操作区（换模型 / 重试），由 App 注入 */
  errorActions: React.ReactNode;
  onEnter: () => void;
  /** 零下载入口：直接进入预录真实采样的回放演示 */
  onExploreDemo: () => void;
  /** 知情选择后才开始加载模型 */
  onPickModel: (id: string) => void;
  /** 无需加载模型，直接进入回放模式导入 .aitrace */
  onReplayImport?: () => void;
  /** 从演示回流时直接展开模型选择 */
  defaultPickerOpen?: boolean;
}) {
  const ready = status === "ready";
  const [pickerOpen, setPickerOpen] = useState(defaultPickerOpen ?? false);
  const [cached, setCached] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!pickerOpen) return;
    let dead = false;
    void Promise.all(
      MODELS.map(async (m) => [m.id, await isModelCached(m.id)] as const),
    ).then((pairs) => {
      if (!dead) setCached(Object.fromEntries(pairs));
    });
    return () => {
      dead = true;
    };
  }, [pickerOpen]);
  const [rig, setRig] = useState<AudioRig | null>(null);
  const activeRigRef = useRef<AudioRig | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const stopAudio = useCallback(() => {
    activeRigRef.current?.stop();
    activeRigRef.current = null;
    setRig(null);
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current = null;
    }
  }, []);

  const startRig = (r: AudioRig) => {
    activeRigRef.current = r;
    setRig(r);
  };

  useEffect(() => stopAudio, [stopAudio]);

  // 本机首访行为 trace（A8）：只存 localStorage，永不上传
  useEffect(() => {
    logVisit("landing_view");
  }, []);

  const playFile = (file: File) => {
    stopAudio();
    const ctx = new AudioContext();
    const el = new Audio(URL.createObjectURL(file));
    el.loop = true;
    audioElRef.current = el;
    const src = ctx.createMediaElementSource(el);
    src.connect(ctx.destination);
    void el.play();
    startRig(buildRig(ctx, src, () => el.pause()));
  };

  const startMic = async () => {
    stopAudio();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      startRig(
        buildRig(ctx, src, () => {
          for (const track of stream.getTracks()) track.stop();
        }),
      );
    } catch {
      // 用户拒绝授权：保持环境波
    }
  };

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-[#0a0a0a] text-[#E8EAF2]">
      <MatrixCanvas rig={rig} />
      {/* 文字可读性：标题区上方渐层压暗 */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/95 via-[#0a0a0a]/60 to-[#0a0a0a]/75"
        aria-hidden="true"
      />

      {/* 顶栏 */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4">
        <span className="flex items-center gap-2 text-[14px] font-semibold tracking-tight select-none">
          <IconAperture className="h-[17px] w-[17px]" />
          AI Observatory
        </span>
        <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-[#9BA0B4] select-none">
          本地模式 · Offline
        </span>
      </div>

      {/* 主体：谜题 → 谜底 → 真实证据切片 → 入口（锚点 A1–A4；首屏第一层无术语无技术卖点）
          矮视口可滚动，主按钮永远可达（P4：不允许存在点不到的入口） */}
      <div className="landing-hero-scroll relative z-20 flex flex-1 flex-col overflow-y-auto px-6">
       <div className="m-auto flex w-full flex-col items-center py-10 pb-96">
        <h2 className="max-w-[680px] whitespace-nowrap text-center text-[clamp(24px,4vw,40px)] font-semibold tracking-[-0.02em] leading-[1.35]">
          为什么同一句问题，AI 每次回答都不一样？
        </h2>
        <p className="mt-3 max-w-[680px] text-center text-[16px] leading-relaxed text-[#C0C4D2]">
          因为这个答案，曾经差点变成另一个答案。
        </p>
        <p className="mt-1.5 max-w-[680px] text-center text-[12px] tracking-wide text-[#8A8FA3] select-none">
          理解 AI，不靠信任，靠观察 · Don&rsquo;t trust AI. Observe AI.
        </p>
        <div className="mt-6 flex w-full justify-center">
          <HesitationSlice
            step={DEMO_STATS.tightest}
            stats={DEMO_STATS}
            animate
            onExpand={() => logVisit("hero_slice_expand")}
          />
        </div>

        {!error && status === "loading" ? (
          /* 加载中：只展示真实进度 */
          <div className="mt-8 flex w-full flex-col items-center gap-3">
            <span className="text-[13px] text-[#8A8FA3]">
              {loadingMessage || "正在准备本地环境"}
            </span>
            {progressItems.length > 0 && (
              <div className="w-full max-w-md rounded-md border border-white/10 bg-white/5 px-4 py-3">
                {progressItems.slice(0, 2).map(({ file, progress, total }) => (
                  <Progress key={file} text={file} percentage={progress} total={total} />
                ))}
              </div>
            )}
          </div>
        ) : !error && (
          <>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <button
                className="flex items-center gap-2 rounded-md bg-[#10b981] px-8 py-3 text-[14px] font-medium text-white transition-all hover:bg-[#059669]"
                onClick={() => {
                  if (ready) {
                    onEnter();
                  } else {
                    logVisit("hero_cta");
                    onExploreDemo();
                  }
                }}
              >
                <IconPlay className="h-3.5 w-3.5" />
                {ready ? "进入工作台" : "亲眼看这一刻 →"}
              </button>
              {!ready && (
                <button
                  className="rounded-md border border-white/15 bg-white/5 px-6 py-3 text-[14px] text-[#C0C4D2] transition-colors hover:border-white/30 hover:text-white"
                  onClick={() => {
                    logVisit("hero_pick_model");
                    setPickerOpen((o) => !o);
                  }}
                >
                  用自己的模型跑
                </button>
              )}
            </div>
            <p className="mt-3 text-center text-[12px] text-[#8A8FA3]">
              推理全部在本机完成，数据不出设备；不会自动下载任何模型
            </p>
            {onReplayImport && (
              <button
                type="button"
                className="mt-1.5 text-[12px] text-[#8A8FA3]/80 underline decoration-dotted underline-offset-2 transition-colors hover:text-[#c6c9d4]"
                onClick={onReplayImport}
              >
                收到 .aitrace 文件？无需模型，直接导入回放 →
              </button>
            )}

            {/* 知情下载：每个模型标明体积、来源、缓存状态，用户点击才开始加载 */}
            {!ready && pickerOpen && (
              <div className="mt-6 max-h-[38vh] w-full max-w-xl overflow-y-auto rounded-md border border-white/10 bg-[#101118]/85 p-2">
                {MODELS.map((m) => {
                  const size = device === "wasm" ? m.sizeWasm : m.sizeWebgpu;
                  const isCached = cached[m.id] === true;
                  return (
                    <button
                      key={m.id}
                      className="flex w-full items-center gap-3 rounded-md px-3.5 py-2.5 text-left transition-colors hover:bg-white/5"
                      onClick={() => onPickModel(m.id)}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="text-[14px] font-medium text-[#E8EAF2]">{m.name}</span>
                          {m.id === recommendedId && (
                            <span className="rounded-md bg-[#10b981]/20 px-2 py-0.5 text-[11px] text-[#10b981]">推荐</span>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] text-[#8A8FA3]">
                          {m.vendor} · {m.params} · {m.description}
                        </span>
                      </span>
                      <span className="shrink-0 text-right text-[11px] leading-tight text-[#8A8FA3]">
                        <span className="block text-[12px] font-medium text-[#C0C4D2]">{formatSize(size)}</span>
                        {isCached ? (
                          <span className="text-emerald-400">已缓存 · 免下载</span>
                        ) : m.builtin ? (
                          <span>本站直载</span>
                        ) : (
                          <span>在线下载</span>
                        )}
                      </span>
                    </button>
                  );
                })}
                <p className="px-3.5 py-2 text-[11px] leading-relaxed text-[#8A8FA3]/80">
                  模型下载后由浏览器缓存，同一地址再次打开免重下；缓存按站点地址隔离，换地址访问需重新下载
                </p>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="mt-9 w-full max-w-md rounded-md border border-white/10 bg-white/5 p-6 text-center">
            <p className="text-[16px] font-medium">这个模型在当前设备上加载失败</p>
            <p className="mt-2 break-all text-[13px] leading-relaxed text-[#9BA0B4]">
              {error}
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              {errorActions}
            </div>
            <p className="mt-4 text-[12px] leading-relaxed text-[#8A8FA3]">
              已自动尝试过更小的内置模型；也可以换用支持 WebGPU 的 Chrome/Edge 113+ 浏览器再试
            </p>
          </div>
        )}
       </div>
      </div>

      {/* 底部信息卡（真实状态，不写死）：固定视口底部；矮视口隐藏，不遮挡首屏主动作 */}
      <div className="landing-bottom-cards absolute inset-x-0 bottom-0 z-10 mx-auto w-full max-w-3xl px-6 pb-6">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
          {[
            {
              label: "观察",
              value: "看见每一次选择",
              sub: "每个字的候选、概率与耗时",
              Icon: IconEye,
            },
            {
              label: "实验",
              value: "亲手改掉一个字",
              sub: "看后面的回答整个分岔",
              Icon: IconFlask,
            },
            {
              label: "协作",
              value: "看 AI 团队怎么干活",
              sub: "谁在规划 · 谁在执行 · 交接了什么",
              Icon: IconAperture,
            },
            {
              label: "沉淀",
              value: "每次运行自动存档",
              sub: "可比较 · 可复现 · 数据不出设备",
              Icon: IconArchive,
            },
          ].map((card) => (
            <div
              key={card.label}
              className="flex items-center gap-3.5 rounded-md border border-white/10 bg-white/[0.04] px-5 py-4"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#10A0FF]/15 text-[#10A0FF]">
                <card.Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] text-[#8A8FA3]">{card.label}</span>
                <span className="block truncate text-[14px] font-medium">{card.value}</span>
                <span className="block text-[11px] text-[#8A8FA3]">{card.sub}</span>
              </span>
            </div>
          ))}
        </div>

        {/* 音频驱动矩阵（可选）：真实频谱驱动背景，不播则为环境波 */}
        <div className="mt-4 flex items-center justify-center gap-2 text-[12px] text-[#8A8FA3]">
          <span className="select-none">背景矩阵</span>
          {rig ? (
            <button
              className="rounded-md border border-white/15 px-3 py-1 text-[#C0C4D2] transition-colors hover:border-white/30"
              onClick={stopAudio}
            >
              停止 · 回到环境波
            </button>
          ) : (
            <>
              <button
                className="rounded-md border border-white/15 px-3 py-1 transition-colors hover:border-white/30 hover:text-[#C0C4D2]"
                onClick={() => fileRef.current?.click()}
              >
                ♪ 用音乐驱动
              </button>
              <button
                className="rounded-md border border-white/15 px-3 py-1 transition-colors hover:border-white/30 hover:text-[#C0C4D2]"
                onClick={() => void startMic()}
              >
                用麦克风驱动
              </button>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) playFile(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </div>
  );
}
