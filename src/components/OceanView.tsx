/** Token Probability Landscape（Token 概率地形）：把一次真实生成渲染成可漫游的三维概率空间。
 *  主路径 = 被采样 token；暗节点 = top-k 落选候选；
 *  X=时间步，Y=候选排位，Z=熵，粗细=概率，颜色=熵冷暖。
 *  所有数值来自真实 TokenStep，点击任意粒子可回溯出生档案。
 *
 *  渲染架构（为低端设备可靠运行设计）：
 *  - renderer/scene/camera/controls 只创建一次；数据更新走增量路径，绝不逐 token 重建场景
 *  - InstancedMesh 预分配容量按需翻倍增长，节点上限硬保护
 *  - 主流线用预分配 BufferAttribute + setDrawRange，避免每步重建几何
 *  - 雾距按场景包围盒缩放（固定密度会把长 trace 全部雾没）
 *  - WebGL 上下文丢失时给出诚实提示而不是黑屏；页面隐藏时 rAF 自动暂停 */

import { IconPause, IconPlay } from "./icons";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { TokenStep } from "../lib/trace";
import { ROLE_LABEL, type TeamState } from "../lib/team";
import {
  detectGLRenderer,
  isSoftwareRenderer,
  oceanColor,
  oceanLayout,
  type OceanNode,
} from "../lib/ocean";

interface HoverInfo {
  node: OceanNode;
  sx: number;
  sy: number;
}

const LEGEND = [
  { color: "#10A0FF", label: "已选路径" },
  { color: "#00e676", label: "高概率候选" },
  { color: "#6d6d6d", label: "低概率候选" },
  { color: "#ffa726", label: "高熵时刻" },
];

/** 节点数硬上限：2048 步 × top-9 ≈ 1.8 万实例，远低于 instancing 能力上限，
 *  超长 trace 截断渲染并提示（数据本身不截断） */
const MAX_NODES = 20000;

interface GL {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  geo: THREE.SphereGeometry;
  mat: THREE.MeshBasicMaterial;
  inst: THREE.InstancedMesh | null;
  capacity: number;
  spinePos: THREE.BufferAttribute | null;
  spineCapacity: number;
  spine: THREE.Line | null;
  glow: THREE.Line | null;
  grid: THREE.GridHelper;
  nodes: OceanNode[];
  nodeCountAt: (vis: number) => number;
  userMoved: boolean;
}

function nextCapacity(n: number): number {
  let c = 512;
  while (c < n) c *= 2;
  return Math.min(c, MAX_NODES);
}

export default function OceanView({
  steps,
  prompt,
  modelName,
  device,
  running,
  branchLabel,
  branchCount,
  team,
  onPick,
  onClose,
}: {
  steps: TokenStep[];
  prompt: string;
  modelName: string;
  device: string | null;
  running: boolean;
  /** 当前分支标签（存在分岔时）：如「第 12 词改选「XX」」 */
  branchLabel?: string | null;
  /** 分岔树总节点数 */
  branchCount?: number;
  /** AVP Team（S6-10）：本次协作的真实团队与交接；无子运行时不传（诚实缺席） */
  team?: TeamState | null;
  onPick: (step: number) => void;
  onClose: () => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [software, setSoftware] = useState<boolean | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [visible, setVisible] = useState(steps.length);
  const [playing, setPlaying] = useState(false);
  // 慢速跟播（决策优先 v2 · S6）：回放降速到 1/4，方便逐步细读每一步决策
  const [slow, setSlow] = useState(false);
  const followRef = useRef(true);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  const layout = useMemo(() => oceanLayout(steps), [steps]);
  // 每步的节点前缀数量：回放时按步显示
  const prefix = useMemo(() => {
    const arr: number[] = [];
    let n = 0;
    let cur = 0;
    for (const node of layout.nodes) {
      while (cur <= node.step) {
        arr[cur] = n;
        cur++;
      }
      n++;
    }
    arr[cur] = n;
    return arr;
  }, [layout]);

  // 生成中自动跟随最新步
  useEffect(() => {
    if (running || followRef.current) setVisible(steps.length);
  }, [steps.length, running]);

  useEffect(() => {
    const renderer = detectGLRenderer();
    setSoftware(renderer === null || isSoftwareRenderer(renderer));
  }, []);

  // 回放播放
  useEffect(() => {
    if (!playing) return;
    const iv = setInterval(() => {
      setVisible((v) => {
        if (v >= steps.length) {
          setPlaying(false);
          return v;
        }
        return v + 1;
      });
    }, slow ? 200 : 50);
    return () => clearInterval(iv);
  }, [playing, slow, steps.length]);

  const glRef = useRef<GL | null>(null);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  // ── 一次性：renderer / scene / camera / controls / 事件 / 帧循环 ──
  useEffect(() => {
    if (software !== false) return;
    const mount = mountRef.current;
    if (!mount) return;

    const W = Math.max(mount.clientWidth, 1);
    const H = Math.max(mount.clientHeight, 1);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 4000);
    camera.position.set(-10, 12, 26);

    const dpr = Math.min(devicePixelRatio || 1, 1.75);
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: dpr < 1.5,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      setContextLost(true);
      return;
    }
    renderer.setSize(W, H);
    renderer.setPixelRatio(dpr);
    mount.appendChild(renderer.domElement);

    const onLost = (ev: Event) => {
      ev.preventDefault();
      setContextLost(true);
    };
    const onRestored = () => setContextLost(false);
    renderer.domElement.addEventListener("webglcontextlost", onLost);
    renderer.domElement.addEventListener("webglcontextrestored", onRestored);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 4;
    controls.maxDistance = 2000;

    const geo = new THREE.SphereGeometry(0.32, 12, 12);
    const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.92 });

    const grid = new THREE.GridHelper(400, 40, 0x1c2036, 0x141726);
    scene.add(grid);

    const gl: GL = {
      renderer,
      scene,
      camera,
      controls,
      geo,
      mat,
      inst: null,
      capacity: 0,
      spinePos: null,
      spineCapacity: 0,
      spine: null,
      glow: null,
      grid,
      nodes: [],
      nodeCountAt: () => 0,
      userMoved: false,
    };
    glRef.current = gl;
    controls.addEventListener("start", () => {
      gl.userMoved = true;
    });

    // 拾取（rAF 节流：高频 pointermove 不做多次射线求交）
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let hovered = -1;
    let pendingMove: PointerEvent | null = null;
    const doPick = () => {
      const ev = pendingMove;
      pendingMove = null;
      if (!ev || !gl.inst) return;
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      ndc.set(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1,
      );
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObject(gl.inst, false);
      const id = hits[0]?.instanceId;
      const next = id !== undefined && id < gl.inst.count ? id : -1;
      renderer.domElement.style.cursor = next >= 0 ? "pointer" : "grab";
      // 去重：目标节点未变时不重写 state，避免逐帧重渲染
      if (next === hovered) return;
      hovered = next;
      if (hovered >= 0 && gl.nodes[hovered]) {
        setHover({
          node: gl.nodes[hovered],
          sx: ev.clientX - rect.left,
          sy: ev.clientY - rect.top,
        });
      } else {
        setHover(null);
      }
    };
    const onMove = (ev: PointerEvent) => {
      pendingMove = ev;
    };
    const onLeave = () => {
      pendingMove = null;
      hovered = -1;
      setHover(null);
    };
    const onClick = () => {
      if (hovered >= 0 && gl.nodes[hovered]) {
        onPickRef.current(gl.nodes[hovered].step);
      }
    };
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerleave", onLeave);
    renderer.domElement.addEventListener("click", onClick);

    // 可见性双门控：页面隐藏或场景滚出视口时暂停渲染循环
    let raf = 0;
    let inView = true;
    const tick = () => {
      doPick();
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    const pause = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const syncLoop = () => {
      if (!document.hidden && inView && !raf) raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((entries) => {
      inView = entries[0]?.isIntersecting ?? true;
      if (inView) syncLoop();
      else pause();
    });
    io.observe(mount);
    const onVis = () => {
      if (document.hidden) pause();
      else syncLoop();
    };
    document.addEventListener("visibilitychange", onVis);
    syncLoop();

    const ro = new ResizeObserver(() => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      io.disconnect();
      ro.disconnect();
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerleave", onLeave);
      renderer.domElement.removeEventListener("click", onClick);
      renderer.domElement.removeEventListener("webglcontextlost", onLost);
      renderer.domElement.removeEventListener("webglcontextrestored", onRestored);
      controls.dispose();
      gl.inst?.dispose();
      gl.spine?.geometry.dispose();
      (gl.spine?.material as THREE.Material | undefined)?.dispose();
      gl.glow?.geometry.dispose();
      (gl.glow?.material as THREE.Material | undefined)?.dispose();
      grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      glRef.current = null;
    };
  }, [software]);

  // ── 增量：数据变化只更新实例与线，容量不足时按需翻倍，不重建场景 ──
  // 依赖含 software：GL 在 software 判定为 false 后才创建，需在其后补一次数据填充
  useEffect(() => {
    const gl = glRef.current;
    if (!gl) return;
    const nodes = layout.nodes.slice(0, MAX_NODES);
    gl.nodes = nodes;
    gl.nodeCountAt = (vis: number) =>
      Math.min(prefix[Math.min(vis, prefix.length - 1)] ?? nodes.length, MAX_NODES);

    if (nodes.length === 0) {
      if (gl.inst) gl.inst.count = 0;
      if (gl.spine) gl.spine.geometry.setDrawRange(0, 0);
      if (gl.glow) gl.glow.geometry.setDrawRange(0, 0);
      return;
    }

    // 实例容量管理
    if (!gl.inst || nodes.length > gl.capacity) {
      if (gl.inst) {
        gl.scene.remove(gl.inst);
        gl.inst.dispose();
      }
      gl.capacity = nextCapacity(nodes.length);
      gl.inst = new THREE.InstancedMesh(gl.geo, gl.mat, gl.capacity);
      gl.inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      gl.scene.add(gl.inst);
    }
    const inst = gl.inst;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      dummy.position.set(n.x, n.y, n.z);
      const s = n.scale * (n.chosen ? 1.5 : 1);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
      const c = oceanColor(n.heat, n.chosen);
      color.setHSL(c.h, c.s, c.l);
      inst.setColorAt(i, color);
    }
    inst.count = gl.nodeCountAt(visibleRef.current);
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.computeBoundingSphere();

    // 主流线：预分配 position buffer + setDrawRange
    const spineLen = Math.min(layout.spine.length, MAX_NODES);
    if (!gl.spinePos || spineLen > gl.spineCapacity) {
      gl.spine?.geometry.dispose();
      (gl.spine?.material as THREE.Material | undefined)?.dispose();
      gl.glow?.geometry.dispose();
      (gl.glow?.material as THREE.Material | undefined)?.dispose();
      if (gl.spine) gl.scene.remove(gl.spine);
      if (gl.glow) gl.scene.remove(gl.glow);
      gl.spineCapacity = nextCapacity(spineLen);
      gl.spinePos = new THREE.BufferAttribute(
        new Float32Array(gl.spineCapacity * 3),
        3,
      );
      gl.spinePos.setUsage(THREE.DynamicDrawUsage);
      const mk = (c: number, o: number) => {
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", gl.spinePos as THREE.BufferAttribute);
        return new THREE.Line(
          g,
          new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: o }),
        );
      };
      gl.spine = mk(0x9aa4ff, 0.95);
      gl.glow = mk(0x6366f1, 0.35);
      gl.glow.scale.set(1, 1.02, 1.02);
      gl.scene.add(gl.spine, gl.glow);
    }
    const pos = gl.spinePos;
    for (let i = 0; i < spineLen; i++) {
      const p = layout.spine[i];
      pos.setXYZ(i, p.x, p.y, p.z);
    }
    pos.needsUpdate = true;
    gl.spine?.geometry.setDrawRange(0, spineLen);
    gl.glow?.geometry.setDrawRange(0, spineLen);
    gl.spine?.geometry.computeBoundingSphere();
    gl.glow?.geometry.computeBoundingSphere();

    // 包围盒：取景、网格位置、雾距全部随真实数据缩放
    const bbox = new THREE.Box3();
    const v = new THREE.Vector3();
    for (const n of nodes) bbox.expandByPoint(v.set(n.x, n.y, n.z));
    const center = bbox.getCenter(new THREE.Vector3());
    const size = bbox.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z, 10) * 0.72;
    gl.grid.position.set(center.x, bbox.min.y - 3, center.z);
    gl.scene.fog = new THREE.Fog(0x0a0b12, radius * 2.2, radius * 8);
    gl.controls.maxDistance = Math.max(radius * 6, 120);
    // 用户没手动动过相机时自动取景（生成中持续跟随）
    if (!gl.userMoved) {
      gl.camera.position.set(
        center.x - radius * 0.55,
        center.y + radius * 0.6,
        center.z + radius * 1.15,
      );
      gl.controls.target.copy(center);
    }
  }, [layout, prefix, software]);

  // 回放：只改 instance count
  useEffect(() => {
    const gl = glRef.current;
    if (gl?.inst) gl.inst.count = gl.nodeCountAt(visible);
  }, [visible]);

  const stats = useMemo(() => {
    const shown = steps.slice(0, visible);
    const timed = shown.filter((s) => s.dt > 0);
    const totalMs = timed.reduce((a, s) => a + s.dt, 0);
    const tps = totalMs > 0 ? timed.length / (totalMs / 1000) : null;
    const last = shown[shown.length - 1];
    return {
      tokens: shown.length,
      totalSec: totalMs / 1000,
      tps,
      entropy: last?.entropy ?? null,
    };
  }, [steps, visible]);

  const scrub = useCallback((v: number) => setVisible(v), []);

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-[#0A0B12] text-obs-ink">
      {/* 顶栏：标题 + 图例 + 关闭 */}
      <div className="flex items-start justify-between px-6 pt-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-measure-300/80 select-none">
            Token Probability Landscape
          </p>
          <h2 className="mt-1 text-[24px] font-semibold tracking-tight">
            Token 概率地形
          </h2>
          <p className="mt-0.5 text-[13px] text-obs-ink2">
            每个节点对应一步已记录的候选分布
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-3 rounded-md border border-obs-line bg-obs-2/80 px-4 py-2 md:flex">
            {LEGEND.map((l) => (
              <span key={l.label} className="flex items-center gap-1.5 text-[11px] text-obs-ink2">
                <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
                {l.label}
              </span>
            ))}
          </div>
          {running && (
            <span className="flex items-center gap-1.5 rounded-md border border-measure-400/40 bg-obs-2/80 px-3.5 py-2 text-[11px] text-measure-200">
              <span className="h-1.5 w-1.5 rounded-full bg-measure-300" />
              正在生成
            </span>
          )}
          <button
            aria-label="关闭概率地形"
            className="rounded-md border border-obs-line px-3.5 py-2 text-[12px] text-obs-ink2 transition-colors hover:border-obs-ink2/50 hover:text-obs-ink"
            onClick={onClose}
          >
            返回文本视图
          </button>
        </div>
      </div>

      {/* 左侧真实状态卡 */}
      <div className="pointer-events-none absolute left-6 top-28 z-10 w-56 space-y-3">
        <div className="rounded-md border border-obs-line bg-obs-2/85 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-obs-ink2/70 select-none">当前问题</p>
          <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed">{prompt || "—"}</p>
          <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-obs-ink2/70 select-none">模型</p>
          <p className="mt-1 text-[13px]">{modelName}</p>
          <p className="mt-0.5 text-[11px] text-obs-ink2">
            {device === "wasm" ? "CPU (WASM)" : "WebGPU"}
          </p>
          {branchCount !== undefined && branchCount > 1 && (
            <>
              <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-obs-ink2/70 select-none">
                当前分支 · 共 {branchCount} 条
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-measure-200/90">
                {branchLabel || "原始生成"}
              </p>
            </>
          )}
        </div>
        {/* AVP Team（S6-10）：三维里的 token 决策不是孤立的——本次协作的真实团队与交接常驻在场 */}
        {team && team.workers.length > 1 && (
          <div className="rounded-md border border-obs-line bg-obs-2/85 p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-obs-ink2/70 select-none">
              Team · 本次协作
            </p>
            <div className="mt-2 space-y-1.5">
              {team.workers.map((w) => (
                <div key={w.id} className="flex items-center gap-2">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      w.status === "failed"
                        ? "bg-red-400"
                        : w.status === "finished"
                          ? "bg-emerald-400"
                          : "bg-measure-300"
                    }`}
                  />
                  <span className="text-[12px] text-obs-ink">
                    {ROLE_LABEL[w.role].split(" ·")[0]}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11px] text-obs-ink2/70">
                    {w.model ?? ""}
                  </span>
                </div>
              ))}
            </div>
            {team.handoffs.length > 0 && (
              <p className="mt-2 border-t border-obs-line/60 pt-2 text-[11px] leading-relaxed text-obs-ink2/70">
                {team.handoffs.length} 次交接 · 三维内的逐 token 决策均由执行模型产出，交接详情见主页协作流
              </p>
            )}
          </div>
        )}
        <div className="rounded-md border border-obs-line bg-obs-2/85 p-4">
          {[
            ["已生成", `${stats.tokens} tokens`],
            ["总耗时", `${stats.totalSec.toFixed(1)} s`],
            ["平均速度", stats.tps !== null ? `${stats.tps.toFixed(1)} tok/s` : "—"],
            ["当前熵", stats.entropy !== null ? stats.entropy.toFixed(2) : "—"],
          ].map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between py-1">
              <span className="text-[11px] text-obs-ink2">{k}</span>
              <span className="font-mono text-[13px]">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 三维画布 / 降级说明 */}
      <div ref={mountRef} className="relative min-h-0 flex-1">
        {software === true && (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-sm rounded-md border border-obs-line bg-obs-2 p-6 text-center">
              <p className="text-[14px] font-medium">当前设备使用软件渲染，三维视图不可用</p>
              <p className="mt-2 text-[13px] leading-relaxed text-obs-ink2">
                检测到 WebGL 由 CPU 软件光栅执行（如 SwiftShader），三维视图帧率过低已自动停用。文本视图的全部真实数据不受影响。
              </p>
            </div>
          </div>
        )}
        {contextLost && software === false && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0A0B12]/90">
            <div className="max-w-sm rounded-md border border-obs-line bg-obs-2 p-6 text-center">
              <p className="text-[14px] font-medium">图形上下文已丢失</p>
              <p className="mt-2 text-[13px] leading-relaxed text-obs-ink2">
                显卡资源被系统回收（常见于推理占用显存过高）。恢复后会自动继续；也可以返回文本视图，数据不受影响。
              </p>
            </div>
          </div>
        )}
        {steps.length === 0 && software === false && (
          <div className="flex h-full items-center justify-center">
            <p className="text-[13px] text-obs-ink2">还没有生成数据——先运行一次观察</p>
          </div>
        )}
        {layout.nodes.length > MAX_NODES && (
          <p className="absolute right-4 top-2 z-10 text-[11px] text-amber-300/80">
            超长生成：三维视图渲染前 {MAX_NODES.toLocaleString()} 个节点
          </p>
        )}
        {/* hover 信息卡：真实数值 */}
        {hover && (
          <div
            className="pointer-events-none absolute z-20 rounded-md border border-obs-line bg-obs-2/95 px-3.5 py-2.5 font-mono text-[12px] leading-relaxed"
            style={{
              left: Math.min(hover.sx + 14, (mountRef.current?.clientWidth ?? 400) - 190),
              top: Math.max(hover.sy - 10, 8),
            }}
          >
            <p className=”text-[13px] text-measure-300”>
              token: “{hover.node.text}”{hover.node.chosen ? “ ✓已选” : “”}
            </p>
            <p>P = {hover.node.prob.toFixed(4)}</p>
            <p>rank: {hover.node.rank + 1} / {steps[hover.node.step]?.topk.length ?? 8}</p>
            <p>熵: {steps[hover.node.step]?.entropy.toFixed(2)}</p>
            <p className="text-obs-ink2">位置: step {hover.node.step + 1}</p>
            <p className="mt-1 border-t border-obs-line/60 pt-1 text-[11px] text-obs-ink2/70">
              来源：steps[{hover.node.step}].topk · 本机 trace
            </p>
          </div>
        )}
      </div>

      {/* 底部回放条 */}
      {steps.length > 0 && software === false && (
        <div className="flex items-center gap-3 border-t border-obs-line/60 bg-obs-2/60 px-6 py-3">
          <button
            aria-label={playing ? "暂停回放" : "回放生成"}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-obs-line text-obs-ink2 transition-colors hover:text-obs-ink disabled:opacity-40"
            disabled={running}
            onClick={() => {
              if (playing) {
                setPlaying(false);
              } else {
                followRef.current = false;
                if (visible >= steps.length) setVisible(1);
                setPlaying(true);
              }
            }}
          >
            {playing ? (
              <IconPause className="h-3.5 w-3.5" />
            ) : (
              <IconPlay className="h-3.5 w-3.5" />
            )}
          </button>
          <input
            type="range"
            min={1}
            max={steps.length}
            value={Math.min(visible, steps.length)}
            disabled={running}
            className="h-1 flex-1 accent-measure-400"
            onChange={(e) => {
              followRef.current = false;
              setPlaying(false);
              scrub(Number(e.target.value));
            }}
          />
          <button
            aria-pressed={slow}
            className={`rounded-md border px-2.5 py-1 text-[11px] transition-colors disabled:opacity-40 ${
              slow
                ? "border-measure-400/50 text-measure-200"
                : "border-obs-line text-obs-ink2 hover:text-obs-ink"
            }`}
            disabled={running}
            title="慢速跟播：回放降到 1/4 速，逐步细读每一步决策"
            onClick={() => setSlow((v) => !v)}
          >
            慢速
          </button>
          <span className="w-20 text-right font-mono text-[12px] text-obs-ink2">
            {Math.min(visible, steps.length)} / {steps.length}
          </span>
          <span className="hidden text-[11px] text-obs-ink2 md:inline select-none">
            拖动旋转 · 滚轮缩放 · 点击粒子看出生档案
          </span>
        </div>
      )}
    </div>
  );
}
