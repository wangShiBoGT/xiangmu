import {
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
  useCallback,
  type DragEvent,
} from "react";
import {
  IconPlus,
  IconAperture,
  IconFile,
  IconImage,
  IconGlobe,
  IconStop,
  IconArrowUp,
  IconZap,
  IconAlertTriangle,
} from "./components/icons";
import ChatMessage from "./components/ChatMessage";
import Sidebar from "./components/Sidebar";
import SettingsPanel from "./components/SettingsPanel";
import ModelSelect from "./components/ModelSelect";
import Onboarding from "./components/Onboarding";
import ObservePage from "./components/ObservePage";
import WorkspacePage from "./components/WorkspacePage";
import DiscoverPage from "./components/DiscoverPage";
import FindingsPage from "./components/FindingsPage";
import ArchivePage from "./components/ArchivePage";
import BenchmarkPage from "./components/BenchmarkPage";
import StatisticsPage from "./components/StatisticsPage";
import LeaderboardPage from "./components/LeaderboardPage";
import EmbeddingPage from "./pages/EmbeddingPage";
import RAGPage from "./pages/RAGPage";
import PerformancePage from "./pages/PerformancePage";
import AgentPage from "./pages/AgentPage";
import AINexus, { type NexusStatus } from "./components/AINexus";
import DeviceCompatibilityBanner from "./components/DeviceCompatibilityBanner";
import ServiceWorkerUpdate from "./components/ServiceWorkerUpdate";
import {
  importReplay,
  listExperiments,
  type ExperimentRecord,
} from "./lib/experiments";
import { parseDemoHash, type DemoSlice } from "./lib/demoLink";
import {
  computeFindings,
  loadSeenFindings,
  unreadCount,
} from "./lib/findings";
import {
  type ChatSession,
  type GenerationParams,
  type StoredMessage,
  loadSessions,
  saveSessions,
  createSession,
  titleFromMessage,
  loadParams,
  saveParams,
  loadModelId,
  saveModelId,
} from "./lib/chatStore";
import { stripThinking, finalizeUnclosedThinking } from "./lib/thinking";
import {
  probeDevice,
  recommendModel,
  modelUsable,
  type DeviceReport,
} from "./lib/device";
import { MODELS, getModel, loadCustomModels } from "./lib/models";
import { initWebVitals } from "./lib/webVitals";
import { initProfiler } from "./lib/profiler";
import { registerServiceWorker, onStatusChange, type ServiceWorkerStatus } from "./lib/serviceWorker";
import LandingHero from "./components/LandingHero";
const JourneyPage = lazy(() => import("./components/JourneyPage"));
const EnhancedInputDemo = lazy(() => import("./components/EnhancedInputDemo"));
import {
  parseDocument,
  buildDocPrompt,
  ACCEPT_EXTS,
  type ParsedDocument,
} from "./lib/documents";
import {
  fileToDataURL,
  isImageFile,
  ACCEPT_IMAGE_EXTS,
  MAX_IMAGES,
} from "./lib/images";
import { webSearch, buildSearchPrompt } from "./lib/search";

interface ProgressItem {
  file: string;
  progress: number;
  total: number;
}

function App() {
  const worker = useRef<Worker | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const [attachMenu, setAttachMenu] = useState(false);

  const [status, setStatus] = useState<null | "loading" | "ready">(null);
  // 加载阶段失败时自动降级重试更小的模型，避免把用户挡在死胡同
  const reportRef = useRef<DeviceReport | null>(null);
  const loadingModelRef = useRef<string | null>(null);
  const triedModelsRef = useRef<Set<string>>(new Set());
  // 加载失败后重试必须重建 worker：ort 的 WASM 堆不会收缩，
  // 失败的半成品会永久占着 32 位堆，在脏堆上再试只会连锁 bad_alloc
  const [workerGen, setWorkerGen] = useState(0);
  /** 推理 worker 按需启动：用户首次选择加载模型才创建，首屏不拉 ONNX 运行时 */
  const [workerWanted, setWorkerWanted] = useState(false);
  const pendingLoadRef = useRef<{ id: string; device?: "wasm" } | null>(null);
  const probedRef = useRef(false);
  // WebGPU 运行时出错/数值异常时自动降级到 CPU(WASM)，不要求用户升级任何东西；每轮只降一次避免循环
  const wasmFallbackRef = useRef(false);
  const modelIdRef = useRef<string>(loadModelId() ?? MODELS[0].id);
  const [device, setDevice] = useState<string | null>(null);
  const [report, setReport] = useState<DeviceReport | null>(null);
  const [modelId, setModelId] = useState<string>(
    () => loadModelId() ?? MODELS[0].id,
  );
  const [recommendedId, setRecommendedId] = useState<string | null>(null);
  const [pendingDocs, setPendingDocs] = useState<ParsedDocument[]>([]);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [docError, setDocError] = useState<string | null>(null);
  const [parsingDoc, setParsingDoc] = useState(false);
  const [webOn, setWebOn] = useState(false);
  const [swStatus, setSwStatus] = useState<ServiceWorkerStatus>({
    supported: false,
    registered: false,
    active: false,
    waiting: false,
    updateAvailable: false,
  });
  const [searching, setSearching] = useState(false);
  const [visionLoading, setVisionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);
  const [nexusStatus, setNexusStatus] = useState<NexusStatus>("idle");
  const [nexusMessage, setNexusMessage] = useState<string | undefined>(undefined);
  const [nexusProgress, setNexusProgress] = useState<number | undefined>(undefined);
  const [nexusAutoExpand, setNexusAutoExpand] = useState(false);


  const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessions());
  // 首次访问（无历史会话）的新用户才展示完整导读
  const [firstVisit] = useState(() => loadSessions().length === 0);
  const [activeId, setActiveId] = useState<string | null>(
    () => loadSessions()[0]?.id ?? null,
  );
  const [params, setParams] = useState<GenerationParams>(() => loadParams());
  const [showThinking, setShowThinking] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // 入口 Landing：首次点「开始体验」后进入主界面；之后切模型等加载态仍回到 Landing 展示真实进度
  const [entered, setEntered] = useState(false);
  /** 回放模式：无需等模型加载，直接进 Observe 导入 .aitrace 回放 */
  const [replayOnly, setReplayOnly] = useState(false);
  /** 首屏零下载演示入口：进入实验台后自动播放预录采样 */
  const [autoDemo, setAutoDemo] = useState(false);
  // 从演示回流首屏时直接展开模型选择（「用自己的模型跑」的动机时刻）
  const [landingPicker, setLandingPicker] = useState(false);
  /** 从首屏模型选择触发的加载：就绪后直接进入工作台 */
  const enterOnReadyRef = useRef(false);
  const [input, setInput] = useState("");
  const [view, setView] = useState<
    | "workspace"
    | "discover"
    | "create"
    | "observe"
    | "findings"
    | "archive"
    | "benchmark"
    | "statistics"
    | "leaderboard"
    | "journey"
    | "enhanced-input-demo"
    | "embedding"
    | "rag"
    | "performance"
    | "agent"
  >("workspace");
  /** 从 Workspace 启动一次 Run：携带提示词进入显微镜层自动开跑 */
  const [workspacePrompt, setWorkspacePrompt] = useState<string | null>(null);
  /** 从发现/档案页载入实验台的记录 */
  const [benchLoad, setBenchLoad] = useState<ExperimentRecord | null>(null);
  // E2 演示切片链接：#demo/step/N(/dual) 无需模型直达同一犹豫点
  const [demoSlice, setDemoSlice] = useState<DemoSlice | null>(() =>
    parseDemoHash(window.location.hash),
  );
  useEffect(() => {
    if (!demoSlice) return;
    setReplayOnly(true);
    setView("observe");
  }, [demoSlice]);

  // Hash 路由支持
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1); // 移除 #
      if (hash === '/enhanced-input-demo') {
        setView('enhanced-input-demo');
      }
    };

    // 初始加载时检查 hash
    handleHashChange();

    // 监听 hash 变化
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  // E2 全局拖放：首页任意区域扔入 .aitrace 即进入回放（无需模型）
  const [dropError, setDropError] = useState<string | null>(null);
  const onGlobalDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    const file = Array.from(e.dataTransfer.files).find(
      (f) => f.name.endsWith(".aitrace") || f.name.endsWith(".json"),
    );
    if (!file) return;
    e.preventDefault();
    void file.text().then(
      (text) => {
        try {
          const rec = importReplay(text);
          setDropError(null);
          setReplayOnly(true);
          setBenchLoad(rec);
          setView("observe");
        } catch (err) {
          setDropError(
            `回放导入失败：${err instanceof Error ? err.message : String(err)}`,
          );
          window.setTimeout(() => setDropError(null), 5000);
        }
      },
      () => {},
    );
  }, []);
  const [findingsUnread, setFindingsUnread] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [tps, setTps] = useState<number | null>(null);
  const [numTokens, setNumTokens] = useState<number | null>(null);

  const active = sessions.find((s) => s.id === activeId) ?? null;
  const messages = active?.messages ?? [];

  const updateActiveMessages = useCallback(
    (updater: (prev: StoredMessage[]) => StoredMessage[]) => {
      setSessions((prev) => {
        const next = prev.map((s) =>
          s.id === activeId
            ? { ...s, messages: updater(s.messages), updatedAt: Date.now() }
            : s,
        );
        saveSessions(next);
        return next;
      });
    },
    [activeId],
  );

  const loadInFreshWorker = useCallback((id: string, device?: "wasm") => {
    worker.current?.terminate();
    worker.current = null;
    pendingLoadRef.current = { id, device };
    setWorkerWanted(true);
    setWorkerGen((g) => g + 1);
  }, []);

  // 硬件体检与模型推荐：不依赖 worker，首屏立即可用；不触发任何下载
  useEffect(() => {
    if (probedRef.current) return;
    probedRef.current = true;
    probeDevice().then((rep) => {
      setReport(rep);
      reportRef.current = rep;
      const recommended = recommendModel(rep);
      setRecommendedId(recommended.id);
      const saved = loadModelId();
      const initial = saved && getModel(saved) ? saved : recommended.id;
      setModelId(initial);
      modelIdRef.current = initial;
    });
    // 初始化 Core Web Vitals 性能监控
    initWebVitals();
    // 初始化开发模式性能 Profiler
    initProfiler();
    // 注册 Service Worker
    registerServiceWorker().then((registered) => {
      if (registered) {
        console.log('[App] Service Worker registered successfully');
        // 监听状态变化
        onStatusChange((status) => {
          setSwStatus(status);
          console.log('[App] Service Worker status:', status);
        });
      }
    }).catch((error) => {
      console.error('[App] Service Worker registration failed:', error);
    });
  }, []);

  useEffect(() => {
    // 推理 worker（含 ONNX 运行时）按需创建：用户首次选择加载模型才启动，首屏不拉重资源
    if (!workerWanted) return;
    worker.current ??= new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });
    const w = worker.current;

    const onMessage = (e: MessageEvent) => {
      const msg = e.data;
      // WebGPU 运行时错误/数值异常：无论来自哪个页面，都自动重建 worker 并切到 CPU(WASM) 重新加载，
      // 模型放不进 WASM 堆就自动换可用的内置模型，不要求用户升级浏览器/驱动
      if (
        msg.status === "error" &&
        (msg.errorKind === "webgpu-runtime" || msg.errorKind === "numeric") &&
        msg.device === "webgpu" &&
        !wasmFallbackRef.current
      ) {
        wasmFallbackRef.current = true;
        const cur = loadingModelRef.current ?? modelIdRef.current;
        const curInfo = getModel(cur);
        const target =
          curInfo?.wasmOk
            ? curInfo
            : MODELS.filter((m) => m.builtin && m.wasmOk).sort(
                (a, b) => a.sizeWasm - b.sizeWasm,
              )[0];
        if (target) {
          setError(null);
          setStatus("loading");
          setProgressItems([]);
          setLoadingMessage(
            `该设备的 WebGPU 推理不稳定，已自动切换到 CPU 模式${target.id !== cur ? `并改用 ${target.name}` : "重新加载"}（速度较慢但可用，无需任何设置）…`,
          );
          setModelId(target.id);
          saveModelId(target.id);
          modelIdRef.current = target.id;
          loadingModelRef.current = target.id;
          triedModelsRef.current.clear();
          loadInFreshWorker(target.id, "wasm");
          return;
        }
      }
      // Observe/Discover 页的生成消息由各自页面订阅，不进聊天状态
      if (msg.src === "observe" || msg.src === "discover") return;
      switch (msg.status) {
        case "loading":
          setStatus("loading");
          setLoadingMessage(msg.data);
          setNexusStatus("loading");
          setNexusMessage(msg.data);
          setNexusProgress(0);
          setNexusAutoExpand(false);
          break;
        case "initiate":
          setProgressItems((prev) => [...prev, msg]);
          setNexusStatus("loading");
          break;
        case "progress":
          setProgressItems((prev) => {
            const updated = prev.map((item) =>
              item.file === msg.file ? { ...item, ...msg } : item,
            );
            // 计算总体进度
            const totalProgress = updated.length > 0
              ? updated.reduce((sum, item) => sum + (item.progress ?? 0), 0) / updated.length
              : msg.progress ?? 0;
            setNexusProgress(totalProgress);
            return updated;
          });
          break;
        case "done":
          setProgressItems((prev) =>
            prev.filter((item) => item.file !== msg.file),
          );
          break;
        case "ready":
          setStatus("ready");
          setDevice(msg.device ?? null);
          loadingModelRef.current = null;
          triedModelsRef.current.clear();
          wasmFallbackRef.current = false;
          // 根据设备类型设置性能状态
          if (msg.device === "wasm") {
            setNexusStatus("slow");
            setNexusMessage("当前使用 CPU 模式运行，生成速度较慢。建议使用支持 WebGPU 的浏览器和设备以获得 GPU 加速。");
            setNexusAutoExpand(true); // CPU 模式自动展开警告
          } else if (msg.device === "webgpu") {
            setNexusStatus("fast");
            setNexusMessage("GPU 加速已启用，性能良好。");
            setNexusAutoExpand(false);
          } else {
            setNexusStatus("idle");
          }
          setNexusProgress(undefined);
          if (enterOnReadyRef.current) {
            enterOnReadyRef.current = false;
            setEntered(true);
          }
          break;
        case "vision-loading":
          setVisionLoading(msg.data);
          break;
        case "start":
          setIsRunning(true);
          setVisionLoading(null);
          break;
        case "update":
          setTps(msg.tps);
          setNumTokens(msg.numTokens);
          break;
        case "complete":
          setIsRunning(false);
          break;
        case "error": {
          const failed = loadingModelRef.current;
          if (failed) {
            // 模型加载失败：自动换更小的可用内置模型重试
            triedModelsRef.current.add(failed);
            const rep = reportRef.current;
            const fallback = MODELS.filter(
              (m) =>
                m.builtin &&
                !triedModelsRef.current.has(m.id) &&
                (!rep || modelUsable(rep, m)),
            ).sort((a, b) =>
              rep && !rep.webgpu
                ? a.sizeWasm - b.sizeWasm
                : a.sizeWebgpu - b.sizeWebgpu,
            )[0];
            if (fallback) {
              setModelId(fallback.id);
              saveModelId(fallback.id);
              setProgressItems([]);
              setLoadingMessage(
                `${getModel(failed)?.name ?? failed} 加载失败，已自动改用更小的 ${fallback.name}…`,
              );
              loadingModelRef.current = fallback.id;
              loadInFreshWorker(fallback.id);
              break;
            }
            loadingModelRef.current = null;
          }
          setError(msg.data);
          setIsRunning(false);
          setVisionLoading(null);
          break;
        }
      }
    };
    const onError = (e: ErrorEvent) => setError(e.message);

    w.addEventListener("message", onMessage);
    w.addEventListener("error", onError);
    // 自定义模型注册表同步给 worker（worker 无 localStorage）
    w.postMessage({
      type: "custom-models",
      data: { models: loadCustomModels() },
    });
    if (pendingLoadRef.current) {
      // 重建后的 worker 堆是干净的，在这里继续未完成的加载（可附带强制 CPU 模式）
      const { id, device: dev } = pendingLoadRef.current;
      pendingLoadRef.current = null;
      w.postMessage({ type: "load", data: { modelId: id, device: dev } });
    }
    return () => {
      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);
    };
  }, [workerWanted, workerGen, loadInFreshWorker]);

  // 流式 token 追加需要访问当前会话，单独订阅
  useEffect(() => {
    const w = worker.current;
    if (!w) return;
    const onStream = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.src === "observe") return;
      if (msg.status === "start") {
        updateActiveMessages((prev) => [
          ...prev,
          { role: "assistant", content: "" },
        ]);
      } else if (msg.status === "update") {
        updateActiveMessages((prev) => {
          const cloned = [...prev];
          const last = cloned.at(-1);
          if (last?.role === "assistant") {
            cloned[cloned.length - 1] = {
              ...last,
              content: last.content + msg.output,
            };
          }
          return cloned;
        });
      } else if (msg.status === "complete") {
        // 思考未闭合就结束 = 模型把这段内容当成了正式回答，按回答展示
        updateActiveMessages((prev) => {
          const cloned = [...prev];
          const last = cloned.at(-1);
          if (last?.role === "assistant") {
            cloned[cloned.length - 1] = {
              ...last,
              content: finalizeUnclosedThinking(last.content),
            };
          }
          return cloned;
        });
      }
    };
    w.addEventListener("message", onStream);
    return () => w.removeEventListener("message", onStream);
  }, [updateActiveMessages, workerGen]);

  const lastContent = messages.at(-1)?.content;
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, lastContent]);

  const ensureSession = useCallback((): string => {
    if (activeId && sessions.some((s) => s.id === activeId)) return activeId;
    const s = createSession();
    setSessions((prev) => {
      const next = [s, ...prev];
      saveSessions(next);
      return next;
    });
    setActiveId(s.id);
    return s.id;
  }, [activeId, sessions]);

  const runGenerate = useCallback(
    (history: StoredMessage[]) => {
      setIsRunning(true);
      setTps(null);
      setNumTokens(null);
      // 历史里的思考段不能喂回模型，只保留正式回答
      const modelMessages = history.map((m) =>
        m.role === "assistant" ? { ...m, content: stripThinking(m.content) } : m,
      );
      worker.current?.postMessage({
        type: "generate",
        data: { messages: modelMessages, params, modelId },
      });
    },
    [params, modelId],
  );

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || isRunning || searching || status !== "ready") return;

    // 勾选联网时先搜索，把结果作为参考注入；搜索失败则降级为离线回答并提示
    let searchContext: string | null = null;
    if (webOn && pendingImages.length === 0) {
      setSearching(true);
      setDocError(null);
      try {
        const results = await webSearch(text);
        searchContext = buildSearchPrompt(results, text);
      } catch (e) {
        setDocError(
          `${e instanceof Error ? e.message : String(e)}，本次将离线回答`,
        );
      } finally {
        setSearching(false);
      }
    }

    const sid = ensureSession();
    const base = sessions.find((s) => s.id === sid)?.messages ?? [];
    let content = text;
    if (pendingDocs.length > 0) content = buildDocPrompt(pendingDocs, text);
    else if (searchContext) content = searchContext;
    const decorated =
      pendingDocs.length > 0 || searchContext || pendingImages.length > 0;
    const userMessage: StoredMessage = decorated
      ? {
          role: "user",
          content,
          displayContent: text,
          ...(pendingDocs.length > 0
            ? { attachments: pendingDocs.map((d) => d.name) }
            : {}),
          ...(pendingImages.length > 0 ? { images: pendingImages } : {}),
        }
      : { role: "user", content: text };
    const history: StoredMessage[] = [...base, userMessage];
    setSessions((prev) => {
      const next = prev.map((s) =>
        s.id === sid
          ? {
              ...s,
              title: s.messages.length === 0 ? titleFromMessage(text) : s.title,
              messages: history,
              updatedAt: Date.now(),
            }
          : s,
      );
      saveSessions(next);
      return next;
    });
    setInput("");
    setPendingDocs([]);
    setPendingImages([]);
    runGenerate(history);
  }, [
    input,
    isRunning,
    searching,
    status,
    sessions,
    pendingDocs,
    pendingImages,
    webOn,
    ensureSession,
    runGenerate,
  ]);

  const regenerate = useCallback(() => {
    if (isRunning || !active) return;
    const msgs = [...active.messages];
    while (msgs.length && msgs.at(-1)!.role === "assistant") msgs.pop();
    if (!msgs.length) return;
    updateActiveMessages(() => msgs);
    runGenerate(msgs);
  }, [isRunning, active, updateActiveMessages, runGenerate]);

  const interrupt = () => worker.current?.postMessage({ type: "interrupt" });

  const newSession = () => {
    const s = createSession();
    setSessions((prev) => {
      const next = [s, ...prev];
      saveSessions(next);
      return next;
    });
    setActiveId(s.id);
  };

  const deleteSession = (id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveSessions(next);
      return next;
    });
    if (activeId === id) setActiveId(null);
  };

  const changeParams = (p: GenerationParams) => {
    setParams(p);
    saveParams(p);
  };

  const syncCustomModels = useCallback(() => {
    worker.current?.postMessage({
      type: "custom-models",
      data: { models: loadCustomModels() },
    });
  }, []);

  const changeModel = (id: string) => {
    if (isRunning) return;
    if (id === modelId && status === "ready") return;
    const hadError = error !== null;
    setModelId(id);
    modelIdRef.current = id;
    saveModelId(id);
    setError(null);
    setStatus("loading");
    setProgressItems([]);
    setLoadingMessage(`正在加载 ${getModel(id)?.name ?? id}…`);
    triedModelsRef.current.clear();
    loadingModelRef.current = id;
    if (hadError) {
      // 上一次加载失败过：换干净的 worker 重试，避免脏堆连锁 bad_alloc
      loadInFreshWorker(id);
    } else if (worker.current) {
      worker.current.postMessage({ type: "load", data: { modelId: id } });
    } else {
      // 首次加载：worker 按需创建，创建完成后自动继续这次加载
      pendingLoadRef.current = { id };
      setWorkerWanted(true);
    }
  };

  const addDocuments = async (files: FileList | null) => {
    if (!files?.length) return;
    setDocError(null);
    setParsingDoc(true);
    try {
      const list = Array.from(files);
      const imageFiles = list.filter((f) => isImageFile(f.name));
      const docFiles = list.filter((f) => !isImageFile(f.name));
      if (imageFiles.length > 0) {
        const urls = await Promise.all(imageFiles.map(fileToDataURL));
        setPendingImages((prev) => [...prev, ...urls].slice(0, MAX_IMAGES));
      }
      if (docFiles.length > 0) {
        const parsed = await Promise.all(docFiles.map(parseDocument));
        setPendingDocs((prev) => [...prev, ...parsed]);
      }
    } catch (e) {
      setDocError(e instanceof Error ? e.message : String(e));
    } finally {
      setParsingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // 全站统一暗场仪器语言：就绪后 Discover/Observe/Create 共用 obs 主题
  const obsMode = status === "ready";

  const loadToBench = useCallback((rec: ExperimentRecord) => {
    setWorkspacePrompt(null);
    setBenchLoad(rec);
    setView("observe");
  }, []);

  useEffect(() => {
    if (!attachMenu) return;
    const onDown = (e: MouseEvent) => {
      if (!attachMenuRef.current?.contains(e.target as Node))
        setAttachMenu(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [attachMenu]);

  const pickFiles = (accept: string) => {
    setAttachMenu(false);
    if (!fileInputRef.current) return;
    fileInputRef.current.accept = accept;
    fileInputRef.current.click();
  };

  const showLanding = (!entered || status !== "ready") && !replayOnly;

  // 发现未读数：存档计算出的发现中尚未看过的条数（进发现页即已读）
  useEffect(() => {
    if (showLanding) return;
    let alive = true;
    void listExperiments().then((rs) => {
      if (!alive) return;
      const fs = computeFindings(rs);
      setFindingsUnread(unreadCount(fs, loadSeenFindings(localStorage)));
    });
    return () => {
      alive = false;
    };
  }, [showLanding, view]);

  return (
    <div
      className={`flex h-screen w-full bg-paper text-ink transition-colors duration-300 ${
        obsMode ? "obs-theme" : ""
      }`}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) e.preventDefault();
      }}
      onDrop={onGlobalDrop}
    >
      {dropError && (
        <div
          role="status"
          className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md border border-line bg-surface px-4 py-2 text-[12px] text-red-500 shadow-card"
        >
          {dropError}
        </div>
      )}
      <AINexus
        info={{
          status: nexusStatus,
          message: nexusMessage,
          system: {
            device: device as "webgpu" | "wasm" | null,
            gpu: report?.gpuInfo || null,
            memory: report?.memoryGB ?? null,
            cores: report?.cores ?? null,
          },
          model: {
            name: getModel(modelId)?.name,
            size: device === "webgpu" && getModel(modelId)?.sizeWebgpu
              ? `${(getModel(modelId)!.sizeWebgpu / 1024 / 1024 / 1024).toFixed(1)} GB`
              : device === "wasm" && getModel(modelId)?.sizeWasm
                ? `${(getModel(modelId)!.sizeWasm / 1024 / 1024 / 1024).toFixed(1)} GB`
                : undefined,
            quantization: device === "webgpu" ? "q4f16" : "q4",
            progress: nexusProgress,
          },
          performance: {
            tokensPerSecond: tps ?? undefined,
            avgLatency: tps && tps > 0 ? 1000 / tps : undefined,
          },
          autoExpand: nexusAutoExpand,
        }}
        onDismiss={() => setNexusStatus("idle")}
      />
      {!showLanding && view === "create" && (
        <Sidebar
          sessions={sessions}
          activeId={activeId}
          disabled={isRunning}
          onSelect={setActiveId}
          onNew={newSession}
          onDelete={deleteSession}
        />
      )}

      <div
        className={`relative flex flex-col flex-1 min-w-0 overflow-hidden ${
          showLanding
            ? ""
            : obsMode
              ? "bg-paper"
              : "bg-surface md:my-2 md:mr-2 md:rounded-md md:shadow-card"
        }`}
      >
        {!showLanding && view !== "workspace" && (
        <header className="relative flex flex-wrap items-center justify-between gap-y-2 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <h1 className="flex items-center gap-2 text-[14px] font-semibold text-ink tracking-tight select-none">
              <IconAperture className="h-[17px] w-[17px] text-ink" />
              Browser AI Microscope
            </h1>
            {device && (
              <span
                className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] select-none transition-colors ${
                  device === "webgpu"
                    ? "border-success-600/30 bg-success-600/10 text-success-500"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                }`}
                title={device === "webgpu" ? "GPU 加速模式" : "CPU 模式 - 速度较慢"}
              >
                {device === "webgpu" ? (
                  <>
                    <IconZap className="h-3 w-3" />
                    GPU 加速
                  </>
                ) : (
                  <>
                    <IconAlertTriangle className="h-3 w-3" />
                    CPU 慢速
                  </>
                )}
              </span>
            )}
          </div>
          {(status === "ready" || replayOnly) && (
            <nav className="order-3 mx-auto flex w-fit items-center gap-5 md:absolute md:left-1/2 md:order-none md:w-auto md:-translate-x-1/2">
              {(
                [
                  ["workspace", "工作台"],
                  ["observe", "显微镜"],
                  ["findings", "解读"],
                  ["archive", "实验档案"],
                  ["benchmark", "成绩单"],
                  ["leaderboard", "排行榜"],
                  ["embedding", "向量"],
                  ["rag", "RAG"],
                  ["performance", "性能"],
                  ["discover", "设备"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  className={`whitespace-nowrap border-b-2 px-0.5 pb-1 pt-1 text-[13px] font-medium transition-colors ${
                    view === v
                      ? "border-measure-400 text-ink"
                      : "border-transparent text-ink-3 hover:text-ink"
                  }`}
                  onClick={() => setView(v)}
                >
                  {label}
                  {v === "findings" && findingsUnread > 0 && (
                    <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-md bg-measure-500 px-1 text-[11px] font-semibold text-white">
                      {findingsUnread}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          )}
          {status === "ready" && (
            <div className="flex items-center gap-1.5">
              <ModelSelect
                report={report}
                current={modelId}
                recommendedId={recommendedId}
                disabled={isRunning}
                onChange={changeModel}
                onCustomChange={syncCustomModels}
              />
              {/* 对话是次级入口，不占主导航——避免把产品拉回聊天窗口 */}
              <button
                className={`text-[13px] rounded-md px-3 py-1.5 transition-colors ${
                  view === "create"
                    ? "text-ink bg-hover"
                    : "text-ink-2 hover:bg-hover hover:text-ink"
                }`}
                onClick={() => setView("create")}
              >
                对话
              </button>
              <button
                className="text-[13px] rounded-md px-3 py-1.5 text-ink-2 hover:bg-hover hover:text-ink transition-colors"
                onClick={() => setShowSettings((s) => !s)}
              >
                设置
              </button>
            </div>
          )}
        </header>
        )}

        {showSettings && (
          <SettingsPanel
            params={params}
            showThinking={showThinking}
            onChange={changeParams}
            onToggleThinking={setShowThinking}
            onClose={() => setShowSettings(false)}
          />
        )}

        {showLanding && (
          <LandingHero
            status={status}
            device={device}
            recommendedId={recommendedId}
            loadingMessage={loadingMessage}
            progressItems={progressItems}
            error={error}
            errorActions={
              <>
                <ModelSelect
                  report={report}
                  current={modelId}
                  recommendedId={recommendedId}
                  disabled={false}
                  onChange={changeModel}
                  onCustomChange={syncCustomModels}
                />
                <button
                  className="rounded-md bg-accent px-5 py-2 text-[13px] font-medium text-white hover:opacity-85 transition-opacity"
                  onClick={() => changeModel(modelId)}
                >
                  重试
                </button>
              </>
            }
            onEnter={() => setEntered(true)}
            onExploreDemo={() => {
              setAutoDemo(true);
              setReplayOnly(true);
              setView("observe");
            }}
            onPickModel={(id) => {
              enterOnReadyRef.current = true;
              changeModel(id);
            }}
            onReplayImport={() => {
              setReplayOnly(true);
              setView("observe");
            }}
            defaultPickerOpen={landingPicker}
          />
        )}

        {!showLanding && view === "workspace" && (
          <WorkspacePage
            report={report}
            device={device}
            modelReady={status === "ready"}
            modelId={modelId}
            onAsk={(p) => {
              setBenchLoad(null);
              setWorkspacePrompt(p);
              setView("observe");
            }}
            onOpenRecord={loadToBench}
            onWatchDemo={() => {
              setAutoDemo(true);
              setView("observe");
            }}
            onGoJourney={() => setView("journey")}
            onGoArchive={() => setView("archive")}
            onGoBenchmark={() => setView("benchmark")}
            onGoStatistics={() => setView("statistics")}
            onGoLeaderboard={() => setView("leaderboard")}
            onGoEmbedding={() => setView("embedding")}
            onGoRAG={() => setView("rag")}
            onGoPerformance={() => setView("performance")}
            onGoAgent={() => setView("agent")}
            onGoDiscover={() => setView("discover")}
            onWantModel={
              status !== "ready"
                ? () => {
                    setReplayOnly(false);
                    setAutoDemo(false);
                    setLandingPicker(true);
                  }
                : undefined
            }
          />
        )}

        {!showLanding && view === "discover" && (
          <DiscoverPage
            worker={worker.current}
            modelId={modelId}
            device={device}
            busy={isRunning}
          />
        )}

        {!showLanding && view === "observe" && (
          <ObservePage
            worker={worker.current}
            modelId={modelId}
            params={params}
            device={device}
            busy={isRunning || status !== "ready"}
            autoDemo={autoDemo}
            onAutoDemoDone={() => setAutoDemo(false)}
            onWantModel={
              status !== "ready"
                ? () => {
                    setReplayOnly(false);
                    setAutoDemo(false);
                    setLandingPicker(true);
                  }
                : undefined
            }
            externalLoad={benchLoad}
            onExternalLoadDone={() => setBenchLoad(null)}
            demoSlice={demoSlice}
            onDemoSliceDone={() => setDemoSlice(null)}
            externalPrompt={workspacePrompt}
            onExternalPromptDone={() => setWorkspacePrompt(null)}
          />
        )}

        {!showLanding && view === "findings" && (
          <FindingsPage onLoadRecord={loadToBench} />
        )}

        {!showLanding && view === "archive" && (
          <ArchivePage onLoadRecord={loadToBench} />
        )}

        {!showLanding && view === "journey" && (
          <Suspense fallback={<div className="flex-1 bg-obs" />}>
            <JourneyPage onClose={() => setView("workspace")} />
          </Suspense>
        )}

        {!showLanding && view === "benchmark" && (
          <BenchmarkPage
            modelId={modelId}
            onGoDiscover={() => setView("discover")}
            onGoObserve={() => setView("observe")}
          />
        )}

        {!showLanding && view === "statistics" && <StatisticsPage />}

        {!showLanding && view === "leaderboard" && (
          <LeaderboardPage />
        )}

        {!showLanding && view === "embedding" && <EmbeddingPage />}

        {!showLanding && view === "rag" && <RAGPage />}

        {!showLanding && view === "performance" && <PerformancePage />}
        {!showLanding && view === "agent" && <AgentPage />}

        {view === "enhanced-input-demo" && (
          <Suspense fallback={<div className="flex-1 bg-obs" />}>
            <EnhancedInputDemo />
          </Suspense>
        )}

        {!showLanding && view === "create" && (
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="mx-auto max-w-[760px] px-6 py-8 space-y-8">
                {/* WebGPU 兼容性提示横幅 */}
                <DeviceCompatibilityBanner />

                {messages.length === 0 && (
                  <Onboarding
                    report={report}
                    currentId={modelId}
                    recommended={
                      recommendedId ? (getModel(recommendedId) ?? null) : null
                    }
                    firstVisit={firstVisit}
                    onAsk={setInput}
                  />
                )}
                {messages.map((m, i) => (
                  <ChatMessage
                    key={i}
                    message={m}
                    showThinking={showThinking}
                    isLast={i === messages.length - 1}
                    isRunning={isRunning && i === messages.length - 1}
                    onRegenerate={regenerate}
                  />
                ))}
                {error && (
                  <p className="text-center text-[13px] text-red-500 break-all">
                    生成出错：{error}
                  </p>
                )}
                {tps !== null && (
                  <p className="text-center text-[12px] text-ink-3 select-none">
                    {numTokens} tokens · {tps.toFixed(1)} tokens/秒
                  </p>
                )}
                <div ref={chatBottomRef} />
              </div>
            </div>
            <div className="mx-auto w-full max-w-[760px] px-6 pb-6">
              {visionLoading && (
                <p className="mb-2 rounded-md bg-wash px-3 py-2 text-[12px] text-ink-2">
                  {visionLoading}
                </p>
              )}
              {(pendingDocs.length > 0 ||
                pendingImages.length > 0 ||
                docError ||
                parsingDoc ||
                searching) && (
                <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[12px]">
                  {pendingDocs.map((d, i) => (
                    <span
                      key={`${d.name}-${i}`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1 text-ink-2"
                    >
                      <IconFile className="h-3.5 w-3.5 text-ink-3" />
                      {d.name}
                      {d.truncated && "（已截取节选）"}
                      <button
                        aria-label={`移除 ${d.name}`}
                        className="ml-0.5 text-ink-3 hover:text-ink"
                        onClick={() =>
                          setPendingDocs((prev) =>
                            prev.filter((_, j) => j !== i),
                          )
                        }
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  {pendingImages.map((url, i) => (
                    <span key={url.slice(-24) + i} className="relative">
                      <img
                        src={url}
                        alt={`待发送图片 ${i + 1}`}
                        className="h-14 w-14 rounded-md object-cover border border-line"
                      />
                      <button
                        aria-label={`移除图片 ${i + 1}`}
                        className="absolute -right-1.5 -top-1.5 rounded-md bg-accent px-1 text-[11px] text-white"
                        onClick={() =>
                          setPendingImages((prev) =>
                            prev.filter((_, j) => j !== i),
                          )
                        }
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  {parsingDoc && (
                    <span className="text-ink-3">正在解析文件…</span>
                  )}
                  {searching && (
                    <span className="text-ink-3">正在联网搜索…</span>
                  )}
                  {docError && <span className="text-red-500">{docError}</span>}
                </div>
              )}
              <div className="flex items-end gap-1.5 rounded-md bg-surface p-2 pl-2.5 shadow-float min-h-14 transition-shadow">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={`${ACCEPT_EXTS},${ACCEPT_IMAGE_EXTS}`}
                  multiple
                  className="hidden"
                  data-testid="doc-input"
                  onChange={(e) => addDocuments(e.target.files)}
                />
                <div ref={attachMenuRef} className="relative shrink-0">
                  <button
                    aria-label="添加文档或图片"
                    aria-expanded={attachMenu}
                    className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors disabled:opacity-40 ${
                      attachMenu
                        ? "bg-hover text-ink"
                        : "text-ink-2 hover:bg-hover hover:text-ink"
                    }`}
                    disabled={isRunning || parsingDoc}
                    onClick={() => setAttachMenu((v) => !v)}
                  >
                    <IconPlus
                      className={`h-[19px] w-[19px] transition-transform duration-150 ${
                        attachMenu ? "rotate-45" : ""
                      }`}
                    />
                  </button>
                  {attachMenu && (
                    <div className="absolute bottom-12 left-0 z-40 w-60 rounded-md border border-line bg-surface p-1.5 shadow-float">
                      <button
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-hover transition-colors"
                        onClick={() => pickFiles(ACCEPT_EXTS)}
                      >
                        <IconFile className="h-[18px] w-[18px] shrink-0 text-ink-2" />
                        <span className="min-w-0">
                          <span className="block text-[14px] text-ink">
                            上传文档
                          </span>
                          <span className="block text-[12px] text-ink-3">
                            PDF / Word / Excel / txt，基于内容问答
                          </span>
                        </span>
                      </button>
                      <button
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-hover transition-colors"
                        onClick={() => pickFiles(ACCEPT_IMAGE_EXTS)}
                      >
                        <IconImage className="h-[18px] w-[18px] shrink-0 text-ink-2" />
                        <span className="min-w-0">
                          <span className="block text-[14px] text-ink">
                            上传图片
                          </span>
                          <span className="block text-[12px] text-ink-3">
                            由本地视觉模型解读后回答
                          </span>
                        </span>
                      </button>
                    </div>
                  )}
                </div>
                <button
                  aria-label="联网搜索开关"
                  title="开启后提问会先联网搜索最新信息，补充模型知识后再回答"
                  className={`flex h-10 shrink-0 items-center justify-center rounded-md transition-colors disabled:opacity-40 ${
                    webOn
                      ? "gap-1.5 bg-wash px-3 text-ink"
                      : "w-10 text-ink-2 hover:bg-hover hover:text-ink"
                  }`}
                  disabled={isRunning}
                  onClick={() => setWebOn((v) => !v)}
                >
                  <IconGlobe className="h-[19px] w-[19px] shrink-0" />
                  {webOn && <span className="text-[13px]">联网</span>}
                </button>
                <textarea
                  className="flex-1 resize-none bg-transparent px-2 py-2 text-[16px] leading-6 placeholder:text-ink-3 focus:outline-none disabled:opacity-60 self-center"
                  rows={1}
                  placeholder="问任何问题…"
                  value={input}
                  disabled={isRunning}
                  aria-label="消息输入"
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                />
                {isRunning || searching ? (
                  <button
                    aria-label="停止生成"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-white hover:opacity-85 transition-opacity disabled:opacity-50"
                    onClick={interrupt}
                    disabled={searching}
                  >
                    <IconStop className="h-[18px] w-[18px]" />
                  </button>
                ) : (
                  <button
                    aria-label="发送"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-white hover:opacity-85 transition-opacity disabled:bg-wash disabled:text-ink-3"
                    disabled={!input.trim()}
                    onClick={send}
                  >
                    <IconArrowUp className="h-[18px] w-[18px]" />
                  </button>
                )}
              </div>
              <p className="mt-3 text-center text-[11px] tracking-wide text-ink-3 select-none">
                Local inference · {getModel(modelId)?.name ?? "本地模型"} ·
                数据不出设备，内容仅供参考
              </p>
            </div>
          </>
        )}
      </div>
      <ServiceWorkerUpdate status={swStatus} />
    </div>
  );
}

export default App;
