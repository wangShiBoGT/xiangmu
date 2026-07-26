/** Token Trace Volume / 生成标本台：坐标语义明确的离散三维 trace。
 *  X = decode step（离散，不做连续插值地形）
 *  Y = 该步选中 token 的概率（切片高度 & 主路径高度）
 *  亮度 = 已记录候选分布的集中程度（1 - H(top-k)/log k）
 *  颜色 = top-k mass（青 = 覆盖充分，灰 = 长尾未记录部分大）
 *  粉色标记 = 全量 softmax 熵最高的三步（最值得观察处）
 *  底部刻度 = 运行脉冲（x 间距 ∝ 到达时间）
 *  默认只亮主路径与熵峰；点选某步 → 其余降亮、镜头聚焦，由外层联动
 *  Sampling Inspector / 文本高亮。数据全部来自真实 TokenStep，无伪造。 */

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { prefersReducedMotion } from "../lib/reducedMotion";
import { specialTokenLabel, type TokenStep } from "../lib/trace";

export type ClusterMode = "dormant" | "waiting" | "sampling" | "settled";

// 颜色语言只有三类：暖白=当前操作对象，靛紫=路径/分支，青绿=已记录信号；黄仅警示
const C_SEL = new THREE.Color("#F2EDE0");
const C_MAIN = new THREE.Color("#818CF8");
const C_RECORDED = new THREE.Color("#2DD4BF");
const C_DIM = new THREE.Color("#475069");
const C_WARN = new THREE.Color("#FBBF24");
const DX = 0.9;
const Y_SCALE = 3.2;
const PULSE_Z = 3.0;
const CAND_Z = -1.1;
const BRANCH_Z = -1.6;

function shortText(text: string): string {
  const sp = specialTokenLabel(text);
  if (sp) return /end|eos|eot|im_end/i.test(sp) ? "结束符" : sp;
  return text.trim() || text;
}

/** 截断分布集中度 ∈ [0,1]：1 - H(topk 归一)/log(k)；k<2 时视为完全集中 */
function concentration(step: TokenStep): number {
  const k = step.topk.length;
  if (k < 2) return 1;
  let mass = 0;
  for (const c of step.topk) mass += c.prob;
  if (mass <= 0) return 1;
  let h = 0;
  for (const c of step.topk) {
    const p = c.prob / mass;
    if (p > 0) h -= p * Math.log(p);
  }
  return Math.max(0, Math.min(1, 1 - h / Math.log(k)));
}

function topkMass(step: TokenStep): number {
  let m = 0;
  for (const c of step.topk) m += c.prob;
  return Math.min(1, m);
}

interface HoverInfo {
  kind: "token" | "peak" | "pulse";
  step: number;
  sx: number;
  sy: number;
}

interface GL {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  slices: THREE.InstancedMesh;
  path: THREE.InstancedMesh;
  spine: THREE.Line;
  spinePos: THREE.BufferAttribute;
  peaks: THREE.InstancedMesh;
  pulse: THREE.InstancedMesh;
  cands: THREE.InstancedMesh;
  field: THREE.InstancedMesh;
  branchLine: THREE.Line;
  branchPos: THREE.BufferAttribute;
  peakSteps: number[];
  camX: number;
  userMoved: boolean;
  breath: number;
  fieldAnchor: number;
  fieldStart: number;
}

const CAP = 4096;

export default function InstrumentCluster({
  mode,
  steps,
  index,
  focus,
  onFocus,
  fallback,
  branch,
}: {
  mode: ClusterMode;
  steps: TokenStep[];
  /** 已「到达」的最新步（-1=尚无）；dormant 时为整条样例 */
  index: number;
  /** 当前聚焦步（点选后四视图联动的锚点）；null=跟随最新 */
  focus: number | null;
  onFocus: (step: number | null) => void;
  /** 无 WebGL 时的回退渲染 */
  fallback: React.ReactNode;
  /** 干预分支：从 forkStep 起的真实分支轨迹（琥珀色虚线，与主路径分开） */
  branch?: { forkStep: number; steps: TokenStep[] } | null;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [noGL, setNoGL] = useState(false);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const glRef = useRef<GL | null>(null);

  const labelRef = useRef<HTMLDivElement>(null);
  // 概率场文字：前 4 名候选的真实词 + 真实概率，投影跟随粒子
  const fieldLabelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const visible = Math.min(mode === "dormant" ? steps.length : index + 1, CAP);
  const anchor = Math.min(focus !== null ? focus : visible - 1, CAP - 1);
  // 当前 token 的玻璃 Label：让「这根柱子」直接长字，不靠点击、不靠说明书
  const anchorStep = anchor >= 0 && anchor < steps.length ? steps[anchor] : null;
  // 概率场（Token Reality Engine）：当前步的真实 top-k 候选——Winner 被吸入主路径，
  // 落选者按概率衰减淡出（它们没有错，只是没被采样）。数据全部来自 steps[i].topk。
  const fieldCands = useMemo(
    () =>
      anchorStep
        ? anchorStep.topk.slice(0, 8).map((c) => ({
            prob: c.prob,
            sel: c.id === anchorStep.id,
            text: shortText(c.text),
          }))
        : [],
    [anchorStep],
  );
  // 每次渲染（数据/模式变化）后确保渲染循环处于正确开停状态（减弱动态下按需渲染）
  const resumeRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    resumeRef.current?.();
  });
  const stateRef = useRef({
    anchor,
    mode,
    count: visible,
    label: "",
    labelY: 0,
    labelShow: false,
    fieldCands,
  });
  stateRef.current = {
    anchor,
    mode,
    count: visible,
    label: anchorStep ? shortText(anchorStep.text) : "",
    labelY: anchorStep ? anchorStep.prob * Y_SCALE : 0,
    labelShow: anchorStep !== null && (mode !== "dormant" || focus !== null),
    fieldCands,
  };

  // 全量 softmax 熵最高的三步：默认高亮的「最值得观察处」
  const peakSteps = useMemo(() => {
    const n = Math.min(visible, steps.length);
    return Array.from({ length: n }, (_, i) => i)
      .sort((a, b) => steps[b].entropy - steps[a].entropy)
      .slice(0, 3)
      .filter((i) => steps[i].entropy > 0.5)
      .sort((a, b) => a - b);
  }, [steps, visible]);

  const onFocusRef = useRef(onFocus);
  onFocusRef.current = onFocus;

  // 阶段切换（新一次运行/回放开始）时恢复自动跟随；用户拖动后仍尊重手动镜头
  const prevModeRef = useRef(mode);
  useEffect(() => {
    if (prevModeRef.current !== mode) {
      prevModeRef.current = mode;
      const gl = glRef.current;
      if (gl) gl.userMoved = false;
    }
  }, [mode]);

  // ── 一次性初始化 ──
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const W = Math.max(mount.clientWidth, 1);
    const H = Math.max(mount.clientHeight, 1);
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    } catch {
      setNoGL(true);
      return;
    }
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    mount.appendChild(renderer.domElement);
    const onLost = (ev: Event) => {
      ev.preventDefault();
      setNoGL(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", onLost);

    const scene = new THREE.Scene();
    // 雾只做远景收敛，不能把主路径后段吞掉
    scene.fog = new THREE.FogExp2(0x0a0b10, 0.0028);
    const camera = new THREE.PerspectiveCamera(46, W / H, 0.1, 600);
    camera.position.set(0, 6.5, 14.5);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.09;
    controls.minDistance = 2.5;
    controls.maxDistance = 400;
    controls.maxPolarAngle = Math.PI * 0.52;

    const grid = new THREE.GridHelper(600, 120, 0x1a1e30, 0x12141f);
    grid.position.y = -0.02;
    scene.add(grid);

    // 分布切片：每步一根离散棱柱（高=选中概率，亮度=集中度，颜色=top-k mass）
    const slices = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.42, 1, 0.42),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.62, depthWrite: false }),
      CAP,
    );
    slices.count = 0;
    scene.add(slices);

    // 主路径：实际被采样 token 的轨迹（球 + 线）
    const path = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.16, 10, 10),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95 }),
      CAP,
    );
    path.count = 0;
    scene.add(path);
    const spinePos = new THREE.BufferAttribute(new Float32Array(CAP * 3), 3);
    const spineGeo = new THREE.BufferGeometry();
    spineGeo.setAttribute("position", spinePos);
    spineGeo.setDrawRange(0, 0);
    const spine = new THREE.Line(
      spineGeo,
      new THREE.LineBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0.9 }),
    );
    scene.add(spine);

    // 熵峰标记（暖白刻度，非警示）
    const peaks = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.24),
      new THREE.MeshBasicMaterial({ color: 0xf2ede0, transparent: true, opacity: 0.95 }),
      8,
    );
    peaks.count = 0;
    scene.add(peaks);

    // 运行脉冲轨道
    const pulse = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.05, 0.3, 0.05),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85 }),
      CAP,
    );
    pulse.count = 0;
    scene.add(pulse);

    // 聚焦步的候选柱：选中某步时在其后方按 rank 长出（高∵已记录概率）
    const cands = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.2, 1, 0.2),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, depthWrite: false }),
      16,
    );
    cands.count = 0;
    scene.add(cands);

    // 概率场：采样中当前步周围浮现的真实 top-k 候选粒子
    const field = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.11, 8, 8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, depthWrite: false }),
      8,
    );
    field.count = 0;
    scene.add(field);

    // 干预分支：琥珀色虚线，从分叉步与主路径分开
    const branchPos = new THREE.BufferAttribute(new Float32Array(CAP * 3), 3);
    const branchGeo = new THREE.BufferGeometry();
    branchGeo.setAttribute("position", branchPos);
    branchGeo.setDrawRange(0, 0);
    const branchLine = new THREE.Line(
      branchGeo,
      new THREE.LineDashedMaterial({
        color: 0xfbbf24,
        dashSize: 0.28,
        gapSize: 0.16,
        transparent: true,
        opacity: 0.95,
      }),
    );
    scene.add(branchLine);

    const gl: GL = {
      renderer, scene, camera, controls, slices, path, spine, spinePos,
      peaks, pulse, cands, field, branchLine, branchPos,
      peakSteps: [], camX: 0, userMoved: false, breath: 0,
      fieldAnchor: -1, fieldStart: 0,
    };
    glRef.current = gl;
    controls.addEventListener("start", () => {
      gl.userMoved = true;
    });

    // 拾取：切片 / 峰 / 脉冲刻度；兜底为主路径平面最近步
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let pending: PointerEvent | null = null;
    const pick = (ev: PointerEvent): HoverInfo | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width === 0) return null;
      ndc.set(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1,
      );
      ray.setFromCamera(ndc, camera);
      const sx = ev.clientX - rect.left;
      const sy = ev.clientY - rect.top;
      const hk = ray.intersectObject(peaks, false)[0]?.instanceId;
      if (hk !== undefined && hk < peaks.count)
        return { kind: "peak", step: gl.peakSteps[hk] ?? 0, sx, sy };
      const hs = ray.intersectObject(slices, false)[0]?.instanceId;
      if (hs !== undefined && hs < slices.count)
        return { kind: "token", step: hs, sx, sy };
      const ht = ray.intersectObject(pulse, false)[0]?.instanceId;
      if (ht !== undefined && ht < pulse.count)
        return { kind: "pulse", step: ht, sx, sy };
      const t = -ray.ray.origin.z / (ray.ray.direction.z || 1e-9);
      if (t > 0) {
        const px = ray.ray.origin.x + ray.ray.direction.x * t;
        const py = ray.ray.origin.y + ray.ray.direction.y * t;
        const i = Math.round(px / DX);
        if (i >= 0 && i < slices.count && py > -0.5 && py < Y_SCALE + 1.2)
          return { kind: "token", step: i, sx, sy };
      }
      return null;
    };
    let lastHover: HoverInfo | null = null;
    const doHover = () => {
      const ev = pending;
      pending = null;
      if (!ev) return;
      const h = pick(ev);
      renderer.domElement.style.cursor = h ? "pointer" : "grab";
      // 去重：目标未变且坐标变化 <4px 时不重写 state，避免逐帧重渲染
      if (
        h &&
        lastHover &&
        h.kind === lastHover.kind &&
        h.step === lastHover.step &&
        Math.abs(h.sx - lastHover.sx) < 4 &&
        Math.abs(h.sy - lastHover.sy) < 4
      )
        return;
      if (!h && !lastHover) return;
      lastHover = h;
      setHover(h);
    };
    const onMove = (ev: PointerEvent) => {
      pending = ev;
      resumeRef.current?.(); // 减弱动态下休眠态按需恢复一帧
    };
    const onLeave = () => {
      pending = null;
      lastHover = null;
      setHover(null);
    };
    let downAt = 0;
    const onDown = () => {
      downAt = performance.now();
    };
    const onUp = (ev: PointerEvent) => {
      if (performance.now() - downAt > 260) return; // 拖拽不算点击
      const h = pick(ev);
      if (h) onFocusRef.current(h.step);
    };
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerleave", onLeave);
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);

    const onResize = () => {
      const w = Math.max(mount.clientWidth, 1);
      const h = Math.max(mount.clientHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    const labelV = new THREE.Vector3();
    const pulseM = new THREE.Matrix4();
    const fieldCol = new THREE.Color();
    let raf = 0;
    const tick = () => {
      raf = -1; // 渲染中哨兵：阻止 controls change 等事件在本帧内重入
      doHover();
      const st = stateRef.current;
      gl.breath += 0.016;
      const breathe = st.mode === "dormant" ? Math.sin(gl.breath * 0.8) * 0.05 : 0;
      gl.path.position.y = breathe;
      gl.spine.position.y = breathe;
      if (!gl.userMoved) {
        const dormant = st.mode === "dormant";
        // 休眠态：镜头居中框住整条样例；采样/回放：追随最新步
        const targetX = dormant
          ? Math.max(st.count - 1, 0) * DX * 0.5
          : st.anchor >= 0
            ? st.anchor * DX
            : 0;
        gl.camX += (targetX - gl.camX) * 0.05;
        gl.controls.target.set(gl.camX, 1.2, -0.4);
        gl.camera.position.x += (gl.camX - gl.camera.position.x) * 0.05;
        // 主路径占画幅约 65%：随已到达步数缓慢拉远，轨迹始终留在视口内
        let targetZ: number;
        if (dormant) {
          // 镜头贴近中段：主体大而醒目，长样例向两侧自然延伸出画面
          const halfW = Math.max(st.count * DX * 0.5, 5);
          const fov = (gl.camera.fov * Math.PI) / 180;
          targetZ = Math.min(
            (halfW / (Math.tan(fov / 2) * Math.max(gl.camera.aspect, 0.5))) * 1.3 + 4,
            19,
          );
        } else {
          targetZ = 14.5 + Math.min(st.anchor, 200) * 0.055;
        }
        gl.camera.position.z += (targetZ - gl.camera.position.z) * 0.03;
      }
      // 地平网格随镜头平移（按格子对齐），长序列不会走出网格边界
      grid.position.x = Math.round(camera.position.x / 5) * 5;
      // 生成中：当前步的主路径节点呼吸放大，视觉焦点跟着当前 token 走
      if (st.mode === "sampling" && st.anchor >= 0 && st.anchor < gl.path.count) {
        const s = 1.9 + Math.sin(gl.breath * 4) * 0.35;
        pulseM.makeScale(s, s, s);
        pulseM.setPosition(st.anchor * DX, st.labelY, 0);
        gl.path.setMatrixAt(st.anchor, pulseM);
        gl.path.instanceMatrix.needsUpdate = true;
      }
      // 概率场：候选按真实概率分列当前步上方，Winner 被吸入主路径，落选者概率衰减
      if (st.mode === "sampling" && st.anchor >= 0 && st.fieldCands.length > 0) {
        if (gl.fieldAnchor !== st.anchor) {
          gl.fieldAnchor = st.anchor;
          gl.fieldStart = gl.breath;
        }
        const t = gl.breath - gl.fieldStart;
        const cs = st.fieldCands;
        const cx = st.anchor * DX;
        for (let j = 0; j < cs.length; j++) {
          const c = cs[j];
          const born = Math.min(1, t / 0.22); // 浮现
          // Winner：0.5s 后被吸向主路径节点；落选者：按概率衰减淡出（不碎裂）
          const pull = c.sel ? Math.max(0, Math.min(1, (t - 0.5) / 0.5)) : 0;
          // 落选者：采样定局后 160ms 纯透明度淡出，不移动不缩放（动效只回答「哪个被采样」）
          const decay = c.sel ? 1 : Math.max(0, 1 - Math.max(0, t - 0.6) / 0.16);
          const fx = cx + (j - (cs.length - 1) / 2) * 0.34 * (1 - pull);
          const fy = (c.prob * Y_SCALE + 0.85) * (1 - pull) + st.labelY * pull;
          const fz = -0.85 * (1 - pull);
          const sc =
            born * (0.55 + c.prob * 1.6) * (c.sel ? 1 - pull * 0.55 : 1);
          if (!c.sel && decay <= 0) {
            pulseM.makeScale(0.0001, 0.0001, 0.0001);
            pulseM.setPosition(fx, fy, fz);
            gl.field.setMatrixAt(j, pulseM);
            fieldCol.copy(C_RECORDED).multiplyScalar(0);
            gl.field.setColorAt(j, fieldCol);
            continue;
          }
          if (sc > 0.02) {
            pulseM.makeScale(sc, sc, sc);
            pulseM.setPosition(fx, fy, fz);
          } else {
            pulseM.makeScale(0.0001, 0.0001, 0.0001);
            pulseM.setPosition(fx, fy, fz);
          }
          gl.field.setMatrixAt(j, pulseM);
          fieldCol
            .copy(c.sel ? C_SEL : C_RECORDED)
            .multiplyScalar(0.35 + c.prob * 0.65)
            .multiplyScalar(c.sel ? 1 : decay);
          gl.field.setColorAt(j, fieldCol);
        }
        gl.field.count = cs.length;
        gl.field.instanceMatrix.needsUpdate = true;
        if (gl.field.instanceColor) gl.field.instanceColor.needsUpdate = true;
        // 前 4 名候选的文字标签：真实词 + 真实概率，随粒子投影、随衰减淡出
        for (let j = 0; j < 4; j++) {
          const el = fieldLabelRefs.current[j];
          if (!el) continue;
          const c = cs[j];
          if (!c || (c.sel && t > 0.9)) {
            el.style.opacity = "0";
            continue;
          }
          const decay = c.sel ? 1 : Math.max(0, 1 - Math.max(0, t - 0.6) / 0.16);
          if (decay <= 0.02) {
            el.style.opacity = "0";
            continue;
          }
          const pull = c.sel ? Math.max(0, Math.min(1, (t - 0.5) / 0.5)) : 0;
          labelV
            .set(
              cx + (j - (cs.length - 1) / 2) * 0.34 * (1 - pull),
              (c.prob * Y_SCALE + 0.85) * (1 - pull) +
                st.labelY * pull +
                // 高低交错避让：相邻候选标签分两层，不再互相遮挡
                (j % 2 === 0 ? 0.28 : 0.62),
              -0.85 * (1 - pull),
            )
            .project(camera);
          if (labelV.z >= 1) {
            el.style.opacity = "0";
            continue;
          }
          const x = (labelV.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
          const y = (-labelV.y * 0.5 + 0.5) * renderer.domElement.clientHeight;
          el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
          el.style.opacity = String(
            (Math.min(1, t / 0.22) * decay * (c.sel ? 1 : 0.9)).toFixed(2),
          );
          const txt = `${c.text} ${(c.prob * 100).toFixed(1)}%`;
          if (el.textContent !== txt) el.textContent = txt;
        }
      } else {
        if (gl.field.count !== 0) {
          gl.field.count = 0;
          gl.fieldAnchor = -1;
        }
        for (const el of fieldLabelRefs.current) {
          if (el) el.style.opacity = "0";
        }
      }
      gl.controls.update();
      renderer.render(scene, camera);
      // 当前 token Label：每帧把锚定步的3D位置投影到屏幕，字跟着柱子走
      const lb = labelRef.current;
      if (lb) {
        if (st.labelShow && st.label) {
          labelV.set(st.anchor * DX, st.labelY + 0.62, 0).project(camera);
          if (labelV.z < 1) {
            const x = (labelV.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
            const y = (-labelV.y * 0.5 + 0.5) * renderer.domElement.clientHeight;
            lb.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
            lb.style.opacity = "1";
            if (lb.textContent !== st.label) lb.textContent = st.label;
          } else {
            lb.style.opacity = "0";
          }
        } else {
          lb.style.opacity = "0";
        }
      }
      // 减弱动态 + 休眠态：渲染完这一帧就停（按需渲染）；交互/数据变化时由 syncLoop 恢复
      raf =
        prefersReducedMotion() && st.mode === "dormant" && !pending
          ? 0
          : requestAnimationFrame(tick);
    };
    // 可见性双门控：页面隐藏或场景滚出视口时暂停渲染循环
    let inView = true;
    const pause = () => {
      if (raf > 0) cancelAnimationFrame(raf);
      raf = 0;
    };
    const syncLoop = () => {
      if (!document.hidden && inView && raf === 0) raf = requestAnimationFrame(tick);
    };
    resumeRef.current = syncLoop;
    gl.controls.addEventListener("change", syncLoop);
    const io = new IntersectionObserver((entries) => {
      inView = entries[0]?.isIntersecting ?? true;
      if (inView) syncLoop();
      else pause();
    });
    io.observe(mount);
    tick();
    const onVis = () => {
      if (document.hidden) pause();
      else syncLoop();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      resumeRef.current = null;
      gl.controls.removeEventListener("change", syncLoop);
      document.removeEventListener("visibilitychange", onVis);
      io.disconnect();
      ro.disconnect();
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerleave", onLeave);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("webglcontextlost", onLost);
      controls.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Line || o instanceof THREE.InstancedMesh) {
          o.geometry.dispose();
          const m = o.material;
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else m.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      glRef.current = null;
    };
  }, []);

  // ── 数据更新 ──
  useEffect(() => {
    const gl = glRef.current;
    if (!gl) return;
    const n = Math.min(visible, steps.length, CAP);
    const m = new THREE.Matrix4();
    const dormant = mode === "dormant";
    const focused = focus !== null;
    const col = new THREE.Color();

    let maxEnt = 0.001;
    for (let i = 0; i < n; i++) maxEnt = Math.max(maxEnt, steps[i].entropy);

    for (let i = 0; i < n; i++) {
      const s = steps[i];
      const h = Math.max(0.08, s.prob * Y_SCALE);
      const isAnchor = i === anchor && !dormant;
      const isFocus = focused && i === focus;
      // 切片：当前步/聚焦步放大提亮——视觉焦点永远跟着当前 token 走
      const grow = isFocus ? 1.6 : isAnchor ? 1.35 : 1;
      m.makeScale(grow, h, grow);
      m.setPosition(i * DX, h / 2, 0);
      gl.slices.setMatrixAt(i, m);
      const mass = topkMass(s);
      const conc = concentration(s);
      // 颜色 = top-k mass（青→灰）；亮度 = 集中度；聚焦外整体降亮
      col.copy(C_DIM).lerp(C_RECORDED, mass);
      let bright = 0.45 + conc * 0.55;
      if (dormant) bright *= 0.8;
      // 高光冻结：聚焦某步时其余切片明显退场，同一时刻只聚焦一个词
      if (focused && i !== focus) bright *= 0.38;
      col.multiplyScalar(bright);
      if (isFocus || isAnchor) col.copy(C_SEL);
      gl.slices.setColorAt(i, col);
      // 主路径节点
      const py = s.prob * Y_SCALE;
      m.makeScale(isFocus ? 1.9 : 1, isFocus ? 1.9 : 1, isFocus ? 1.9 : 1);
      m.setPosition(i * DX, py, 0);
      gl.path.setMatrixAt(i, m);
      gl.path.setColorAt(
        i,
        isFocus || isAnchor
          ? C_SEL
          : focused || dormant
            ? C_MAIN.clone().multiplyScalar(0.7)
            : C_MAIN.clone().multiplyScalar(0.9),
      );
      gl.spinePos.setXYZ(i, i * DX, py, 0);
    }
    gl.slices.count = n;
    gl.slices.instanceMatrix.needsUpdate = true;
    if (gl.slices.instanceColor) gl.slices.instanceColor.needsUpdate = true;
    gl.slices.computeBoundingSphere?.();
    gl.path.count = n;
    gl.path.instanceMatrix.needsUpdate = true;
    if (gl.path.instanceColor) gl.path.instanceColor.needsUpdate = true;
    gl.path.computeBoundingSphere?.();
    gl.spinePos.needsUpdate = true;
    gl.spine.geometry.setDrawRange(0, n);
    gl.spine.geometry.computeBoundingSphere();
    (gl.spine.material as THREE.LineBasicMaterial).opacity =
      dormant ? 0.7 : focused ? 0.8 : 0.95;

    // 熵峰标记：悬在对应切片上方
    gl.peakSteps = peakSteps;
    for (let i = 0; i < peakSteps.length; i++) {
      const p = peakSteps[i];
      m.makeScale(1, 1, 1);
      m.setPosition(p * DX, steps[p].prob * Y_SCALE + 0.9, 0);
      gl.peaks.setMatrixAt(i, m);
    }
    gl.peaks.count = peakSteps.length;
    gl.peaks.instanceMatrix.needsUpdate = true;
    gl.peaks.computeBoundingSphere?.();
    (gl.peaks.material as THREE.MeshBasicMaterial).opacity = focused ? 0.45 : 0.95;

    // 运行脉冲轨道
    let total = 0;
    for (let i = 0; i < n; i++) total += Math.max(steps[i].dt, 0);
    let acc = 0;
    for (let i = 0; i < n; i++) {
      acc += Math.max(steps[i].dt, 0);
      const x = total > 0 ? (acc / total) * (n - 1) * DX : i * DX;
      const slow = steps[i].dt > 0 && total > 0 && steps[i].dt > (total / n) * 3;
      m.makeScale(1, slow ? 2.2 : 1, 1);
      m.setPosition(x, 0.15, PULSE_Z);
      gl.pulse.setMatrixAt(i, m);
      gl.pulse.setColorAt(
        i,
        i === anchor && !dormant ? C_SEL : slow ? C_WARN : C_DIM,
      );
    }
    gl.pulse.count = n;
    gl.pulse.instanceMatrix.needsUpdate = true;
    if (gl.pulse.instanceColor) gl.pulse.instanceColor.needsUpdate = true;
    gl.pulse.computeBoundingSphere?.();

    // 聚焦步候选分布就地长出：按 rank 排列在该步后方，高∵已记录概率
    const fi = focus !== null && focus < n ? focus : -1;
    const fs = fi >= 0 ? steps[fi] : null;
    if (fs && fs.topk.length > 0) {
      const ks = fs.topk;
      for (let j = 0; j < Math.min(ks.length, 16); j++) {
        const ch = Math.max(0.06, ks[j].prob * Y_SCALE);
        m.makeScale(1, ch, 1);
        m.setPosition(fi * DX + (j - (ks.length - 1) / 2) * 0.3, ch / 2, CAND_Z);
        gl.cands.setMatrixAt(j, m);
        gl.cands.setColorAt(j, ks[j].id === fs.id ? C_SEL : C_RECORDED.clone().multiplyScalar(0.75));
      }
      gl.cands.count = Math.min(ks.length, 16);
    } else {
      gl.cands.count = 0;
    }
    gl.cands.instanceMatrix.needsUpdate = true;
    if (gl.cands.instanceColor) gl.cands.instanceColor.needsUpdate = true;
    gl.cands.computeBoundingSphere?.();

    // 干预分支轨迹：从分叉步起，在 z 轴与主路径分开
    if (branch && branch.steps.length > 0) {
      const bn = Math.min(branch.steps.length, CAP - 1);
      const fx = branch.forkStep;
      const anchorStep = steps[Math.min(fx, steps.length - 1)];
      gl.branchPos.setXYZ(0, Math.max(fx - 1, 0) * DX, (anchorStep?.prob ?? 0) * Y_SCALE, 0);
      for (let j = 0; j < bn; j++) {
        gl.branchPos.setXYZ(
          j + 1,
          (fx + j) * DX,
          branch.steps[j].prob * Y_SCALE,
          BRANCH_Z * Math.min(1, (j + 1) / 6),
        );
      }
      gl.branchPos.needsUpdate = true;
      gl.branchLine.geometry.setDrawRange(0, bn + 1);
      gl.branchLine.geometry.computeBoundingSphere();
      gl.branchLine.computeLineDistances();
      gl.branchLine.visible = true;
    } else {
      gl.branchLine.visible = false;
    }
  }, [steps, visible, anchor, focus, mode, peakSteps, branch]);

  if (noGL) return <>{fallback}</>;

  const hs = hover && hover.step < steps.length ? steps[hover.step] : null;
  const topPeak = peakSteps.length
    ? peakSteps.reduce((a, b) => (steps[b].entropy > steps[a].entropy ? b : a))
    : -1;
  return (
    <div className="relative h-full min-h-[380px] w-full">
      <div ref={mountRef} className="absolute inset-0" />
      {/* 概率场文字：前 4 名候选，投影跟随、随概率衰减淡出 */}
      {[0, 1, 2, 3].map((j) => (
        <div
          key={j}
          ref={(el) => {
            fieldLabelRefs.current[j] = el;
          }}
          className="pointer-events-none absolute left-0 top-0 z-10 whitespace-nowrap font-mono text-[12px] text-teal-100 will-change-transform [text-shadow:0_1px_4px_rgb(10_11_16_/_0.9)]"
          style={{ opacity: 0 }}
        />
      ))}
      {/* 当前 token 玻璃 Label：投影跟随，不遮挡交互 */}
      <div
        ref={labelRef}
        className="pointer-events-none absolute left-0 top-0 z-10 rounded-md border border-obs-line/70 bg-obs-2/85 px-2.5 py-1 font-mono text-[16px] text-obs-ink shadow-float will-change-transform"
        style={{ opacity: 0 }}
      />
      {/* 坐标图例：收在左下角极小一块，不当说明书 */}
      <div className="pointer-events-none absolute left-3 bottom-3 text-[11px] leading-[1.6] tracking-wide text-obs-ink2/55 select-none">
        X 生成步 · Y 选中概率 · 亮/色 = top-k 集中度/mass
        <br />◆ 熵峰 · 底轨 = 到达节奏{branch ? " · 黄虚线 = 干预分支" : ""}
      </div>
      {/* 默认结论：最值得观察处（点击联动） */}
      {topPeak >= 0 && mode !== "sampling" && focus === null && (
        <button
          className="absolute left-1/2 bottom-14 -translate-x-1/2 rounded-md border border-obs-line bg-obs-2/85 px-3 py-1 text-[12px] text-obs-ink transition-colors hover:border-obs-ink2/50"
          onClick={() => onFocus(topPeak)}
        >
          第 {topPeak + 1} 步的已记录候选分布最分散 →
        </button>
      )}
      {/* hover 信息下沉底部信息条：不再遮挡三维场景里的词 */}
      {hover && hs && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 max-w-[80%] -translate-x-1/2 whitespace-nowrap rounded-md border border-obs-line bg-obs-2/95 px-4 py-1.5 text-[12px] leading-relaxed text-obs-ink shadow-float">
          <span className="text-[14px] font-medium">「{shortText(hs.text)}」</span>
          <span className="ml-2 tabular-nums text-obs-ink2">
            第 {hover.step + 1} 步 · P={hs.prob.toFixed(3)} · 熵 {hs.entropy.toFixed(2)}
          </span>
          {hover.kind === "peak" && (
            <span className="ml-2 text-[11px] text-obs-ink2">
              全量 softmax 熵峰 · 点击查看该步采样证据
            </span>
          )}
          {hover.kind === "pulse" && hs.dt > 0 && (
            <span className="ml-2 tabular-nums text-[11px] text-obs-ink2">
              到达间隔 {hs.dt.toFixed(0)}ms
            </span>
          )}
        </div>
      )}
    </div>
  );
}
