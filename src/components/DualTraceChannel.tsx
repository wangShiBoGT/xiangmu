/** 双 Trace 对比通道：发现/对比页唯一的三维视图，坐标语义固定：
 *  X = decode step · Y = 该步选中 token 概率 · Z = 该步熵（已记录分布）
 *  紫线 = 前一次 run，绿线 = 后一次 run；两条 run 从共同前缀出发，
 *  黄色立柱 = 首次分叉步。点击任意位置选中最近的步（与下方检查器联动）。
 *  WebGL 不可用时不渲染（外层保留二维叠加图），不做任何伪造。 */

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { TokenStep } from "../lib/trace";

const Y_SCALE = 2.6;
const Z_SCALE = 1.6;
const COLORS = ["#818cf8", "#34d399"];

function buildLine(steps: TokenStep[], dx: number, color: string): THREE.Line {
  const pts = steps.map(
    (s, i) => new THREE.Vector3(i * dx, s.prob * Y_SCALE, -s.entropy * Z_SCALE),
  );
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.95,
  });
  return new THREE.Line(geo, mat);
}

export default function DualTraceChannel({
  stepsA,
  stepsB,
  divergeAt,
  selected,
  onSelect,
}: {
  stepsA: TokenStep[];
  stepsB: TokenStep[];
  /** 首次分叉步（-1 = 完全一致） */
  divergeAt: number;
  selected: number | null;
  onSelect: (step: number) => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [noGL, setNoGL] = useState(false);
  const markerRef = useRef<THREE.Mesh | null>(null);
  const dxRef = useRef(0.1);
  const maxLen = Math.max(stepsA.length, stepsB.length, 2);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setNoGL(true);
      return;
    }
    const w = mount.clientWidth || 640;
    const h = mount.clientHeight || 260;
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 200);
    const span = 12;
    const dx = span / (maxLen - 1);
    dxRef.current = dx;
    camera.position.set(span / 2, 3.4, 7.5);
    camera.lookAt(span / 2, 0.8, -0.8);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(span / 2, 0.8, -0.8);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 3;
    controls.maxDistance = 20;

    scene.add(buildLine(stepsA, dx, COLORS[0]));
    scene.add(buildLine(stepsB, dx, COLORS[1]));

    // 坐标底面网格：X=step，Z=熵
    const grid = new THREE.GridHelper(span, 12, 0x2a3145, 0x1c2233);
    grid.position.set(span / 2, 0, -Z_SCALE);
    scene.add(grid);

    if (divergeAt >= 0) {
      const pillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, Y_SCALE + 0.4, 0.06),
        new THREE.MeshBasicMaterial({ color: "#fbbf24", transparent: true, opacity: 0.85 }),
      );
      pillar.position.set(divergeAt * dx, (Y_SCALE + 0.4) / 2 - 0.1, -0.8);
      scene.add(pillar);
    }

    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 12, 12),
      new THREE.MeshBasicMaterial({ color: "#ffffff" }),
    );
    marker.visible = false;
    scene.add(marker);
    markerRef.current = marker;

    const ray = new THREE.Raycaster();
    const onClick = (e: MouseEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(
        new THREE.Vector2(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          -((e.clientY - r.top) / r.height) * 2 + 1,
        ),
        camera,
      );
      // 与 z=-0.8 平面求交，取最近的步
      const t = (-0.8 - ray.ray.origin.z) / (ray.ray.direction.z || 1e-9);
      if (t > 0) {
        const px = ray.ray.origin.x + ray.ray.direction.x * t;
        const i = Math.max(0, Math.min(maxLen - 1, Math.round(px / dx)));
        onSelectRef.current(i);
      }
    };
    renderer.domElement.addEventListener("click", onClick);

    let raf = 0;
    let lost = false;
    renderer.domElement.addEventListener("webglcontextlost", () => {
      lost = true;
      setNoGL(true);
    });
    const loop = () => {
      if (lost) return;
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      renderer.domElement.removeEventListener("click", onClick);
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
    // stepsA/B 在 CompareView 生命周期内不变，divergeAt 随之固定
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // 选中步标记联动
  useEffect(() => {
    const m = markerRef.current;
    if (!m) return;
    if (selected === null || selected < 0) {
      m.visible = false;
      return;
    }
    const s = stepsB[selected] ?? stepsA[selected];
    if (!s) {
      m.visible = false;
      return;
    }
    m.visible = true;
    m.position.set(selected * dxRef.current, s.prob * Y_SCALE, -s.entropy * Z_SCALE);
  }, [selected, stepsA, stepsB]);

  if (noGL) return null;

  return (
    <div className="relative h-[260px] w-full" ref={mountRef}>
      <p className="pointer-events-none absolute left-2 top-2 text-[11px] text-obs-ink2/70 select-none">
        X 生成步 · Y 选中概率 · Z 熵 · 黄柱 = 首次分叉 · 点选任一步
      </p>
    </div>
  );
}
