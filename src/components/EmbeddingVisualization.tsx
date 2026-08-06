import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

export interface VisPoint {
  /** 原始索引 */
  index: number;
  /** 3D 坐标 */
  position: [number, number, number];
  /** 文本标签 */
  label: string;
  /** 颜色（可选，用于聚类着色） */
  color?: string;
}

interface Props {
  points: VisPoint[];
  /** 高亮的点索引 */
  highlightIndex?: number | null;
  /** 点击回调 */
  onPointClick?: (index: number) => void;
  /** 相似度连线（可选） */
  similarityEdges?: Array<{ from: number; to: number; similarity: number }>;
}

export default function EmbeddingVisualization({
  points,
  highlightIndex,
  onPointClick,
  similarityEdges = [],
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const labelRendererRef = useRef<CSS2DRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const pointMeshesRef = useRef<THREE.Mesh[]>([]);
  const labelObjectsRef = useRef<CSS2DObject[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // 初始化 Three.js 场景
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0d12);
    sceneRef.current = scene;

    // 相机
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(15, 15, 15);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // CSS2D 标签渲染器
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(width, height);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(labelRenderer.domElement);
    labelRendererRef.current = labelRenderer;

    // 控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 50;
    controlsRef.current = controls;

    // 网格辅助线
    const gridHelper = new THREE.GridHelper(20, 20, 0x1e2636, 0x0f131c);
    gridHelper.position.y = -10;
    scene.add(gridHelper);

    // 坐标轴
    const axesHelper = new THREE.AxesHelper(12);
    scene.add(axesHelper);

    // 环境光 + 点光源
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 0.8);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // 动画循环
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };
    animate();

    // 窗口大小调整
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      labelRenderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 清理
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      controls.dispose();
      container.removeChild(renderer.domElement);
      container.removeChild(labelRenderer.domElement);
    };
  }, []);

  // 渲染点云
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || points.length === 0) return;

    // 清除旧点和标签
    pointMeshesRef.current.forEach((mesh) => scene.remove(mesh));
    pointMeshesRef.current = [];
    labelObjectsRef.current.forEach((label) => scene.remove(label));
    labelObjectsRef.current = [];

    // 创建新点
    const geometry = new THREE.SphereGeometry(0.3, 16, 16);

    points.forEach((pt) => {
      const color = pt.color
        ? new THREE.Color(pt.color)
        : new THREE.Color(0x38bdf8);

      const material = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.3,
        metalness: 0.3,
        roughness: 0.6,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(pt.position[0], pt.position[1], pt.position[2]);
      mesh.userData = { index: pt.index, label: pt.label };

      scene.add(mesh);
      pointMeshesRef.current.push(mesh);

      // 创建文本标签
      const labelDiv = document.createElement('div');
      labelDiv.className = 'text-label';
      labelDiv.textContent = pt.label;
      labelDiv.style.cssText = `
        color: #10b981;
        font-size: 12px;
        font-weight: 500;
        background: rgba(10, 13, 18, 0.92);
        padding: 4px 10px;
        border-radius: 6px;
        border: 1px solid rgba(56, 189, 248, 0.4);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
        white-space: nowrap;
        user-select: none;
        max-width: 300px;
        overflow: hidden;
        text-overflow: ellipsis;
        backdrop-filter: blur(4px);
      `;

      const labelObject = new CSS2DObject(labelDiv);
      labelObject.position.set(0, 0.8, 0);
      mesh.add(labelObject);
      labelObjectsRef.current.push(labelObject);
    });

    // 渲染相似度连线
    if (similarityEdges.length > 0) {
      similarityEdges.forEach((edge) => {
        const fromPt = points[edge.from];
        const toPt = points[edge.to];
        if (!fromPt || !toPt) return;

        const lineMat = new THREE.LineBasicMaterial({
          color: 0x6ee7b7,
          opacity: Math.max(0.1, edge.similarity * 0.8),
          transparent: true,
        });

        const lineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(...fromPt.position),
          new THREE.Vector3(...toPt.position),
        ]);

        const line = new THREE.Line(lineGeo, lineMat);
        scene.add(line);
      });
    }
  }, [points, similarityEdges]);

  // 高亮选中点
  useEffect(() => {
    pointMeshesRef.current.forEach((mesh, i) => {
      const isHighlighted = highlightIndex === i || hoveredIndex === i;
      const scale = isHighlighted ? 1.5 : 1.0;
      mesh.scale.setScalar(scale);

      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = isHighlighted ? 0.8 : 0.3;
    });
  }, [highlightIndex, hoveredIndex]);

  // 点击检测
  useEffect(() => {
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    if (!renderer || !camera) return;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(pointMeshesRef.current);

      if (intersects.length > 0) {
        const index = intersects[0].object.userData.index as number;
        onPointClick?.(index);
      }
    };

    const handleMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(pointMeshesRef.current);

      if (intersects.length > 0) {
        const index = intersects[0].object.userData.index as number;
        setHoveredIndex(index);
        renderer.domElement.style.cursor = 'pointer';
      } else {
        setHoveredIndex(null);
        renderer.domElement.style.cursor = 'default';
      }
    };

    renderer.domElement.addEventListener('click', handleClick);
    renderer.domElement.addEventListener('mousemove', handleMove);

    return () => {
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.domElement.removeEventListener('mousemove', handleMove);
    };
  }, [onPointClick]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      {/* 图表说明 */}
      <div className="pointer-events-none absolute right-4 top-4 max-w-xs space-y-3">
        <div className="rounded-md border border-obs-line bg-obs-2/95 px-3 py-2.5 text-[12px] backdrop-blur-sm">
          <p className="font-medium text-obs-ink">📊 向量空间可视化</p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-obs-ink2">
            每个点代表一段文本的语义向量，通过 {points.length > 0 ? 'UMAP/t-SNE' : ''} 降维算法将高维向量（384维）映射到 3D 空间。
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-obs-ink2">
            <span className="font-medium text-obs-ink">距离越近</span> = 语义越相似
          </p>
        </div>

        {/* 交互提示 */}
        <div className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-[11px] backdrop-blur-sm">
          <p className="font-medium text-accent">💡 交互操作</p>
          <ul className="mt-1.5 space-y-1 text-accent/90">
            <li>• 拖动旋转视角</li>
            <li>• 滚轮缩放距离</li>
            <li>• 点击查看文本</li>
          </ul>
        </div>

        {/* 坐标轴说明 */}
        <div className="rounded-md border border-obs-line bg-obs-2/95 px-3 py-2 text-[11px] backdrop-blur-sm">
          <p className="font-medium text-obs-ink">🎯 坐标轴含义</p>
          <div className="mt-1.5 space-y-1">
            <p className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500"></span>
              <span className="text-red-400">X 轴</span>
              <span className="text-obs-ink2">— 语义维度 1</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500"></span>
              <span className="text-green-400">Y 轴</span>
              <span className="text-obs-ink2">— 语义维度 2</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500"></span>
              <span className="text-blue-400">Z 轴</span>
              <span className="text-obs-ink2">— 语义维度 3</span>
            </p>
            <p className="mt-2 text-[10px] text-obs-ink2/60">
              降维后的坐标轴无具体含义，仅用于展示相对位置关系
            </p>
          </div>
        </div>

        {/* 相似度连线说明 */}
        {similarityEdges.length > 0 && (
          <div className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-[11px] backdrop-blur-sm">
            <p className="font-medium text-emerald-300">🔗 相似度连线</p>
            <p className="mt-1.5 text-emerald-200/80">
              绿色连线表示两段文本相似度 &gt; 0.7，线条越亮表示相似度越高
            </p>
            <p className="mt-1 text-[10px] text-emerald-200/60">
              共检测到 {similarityEdges.length} 对高相似文本
            </p>
          </div>
        )}
      </div>

      {/* 鼠标悬停/选中的文本提示 */}
      {(hoveredIndex !== null || highlightIndex !== null) && (
        <div className="pointer-events-none absolute left-4 top-4 max-w-md rounded-md border border-accent/40 bg-accent/20 px-3 py-2 text-[12px] backdrop-blur-sm">
          <p className="font-medium text-accent">
            {points[hoveredIndex ?? highlightIndex ?? 0]?.label}
          </p>
          <p className="mt-1 text-[11px] text-accent/80">
            索引: #{hoveredIndex ?? highlightIndex}
          </p>
        </div>
      )}
    </div>
  );
}
