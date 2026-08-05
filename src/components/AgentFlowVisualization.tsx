/**
 * Agent 协作流程可视化组件
 *
 * 功能：
 * - 展示多 Agent 之间的消息传递和协作流程
 * - 可视化工具调用、决策点、模型交接
 * - 使用 Three.js 构建 3D 决策树
 * - 支持时间轴回放和交互探索
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { AgentEvent, ModelSegment } from '../lib/agentTrace';
import type { TokenStep } from '../lib/trace';

interface Props {
  /** Agent 事件列表 */
  events: AgentEvent[];
  /** Token 步骤（用于锚定事件） */
  steps: TokenStep[];
  /** 模型分段信息 */
  segments: ModelSegment[];
  /** 当前聚焦的步骤索引 */
  currentStep?: number;
  /** 步骤变化回调 */
  onStepChange?: (step: number) => void;
}

interface AgentNode {
  id: string;
  type: 'tool_call' | 'tool_result' | 'decision_point' | 'model_handoff';
  atStep: number;
  label: string;
  position: THREE.Vector3;
  color: string;
  event: AgentEvent;
}

export default function AgentFlowVisualization({
  events,
  segments,
  currentStep = 0,
  onStepChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const nodesRef = useRef<AgentNode[]>([]);
  const meshesRef = useRef<Map<string, THREE.Mesh>>(new Map());

  const [selectedNode, setSelectedNode] = useState<AgentNode | null>(null);

  // 初始化 Three.js 场景
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    // 相机
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 5, 15);
    cameraRef.current = camera;

    // 渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // 光源
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    // 网格地板
    const gridHelper = new THREE.GridHelper(20, 20, 0x2a2a2a, 0x1a1a1a);
    scene.add(gridHelper);

    // 动画循环
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 响应式调整
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 清理
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  // 构建节点数据
  useEffect(() => {
    const nodes: AgentNode[] = [];

    events.forEach((event, index) => {
      const x = (event.atStep % 10) * 2 - 9;
      const z = -Math.floor(event.atStep / 10) * 2;
      let y = 0;
      let color = '#10A0FF'; // 默认观测蓝
      let label = '';

      switch (event.type) {
        case 'tool_call':
          y = 2;
          color = '#ffa726'; // 琥珀色
          label = `Call: ${event.tool}`;
          break;
        case 'tool_result':
          y = 1;
          color = event.ok ? '#00e676' : '#ef5350'; // 绿色/红色
          label = `Result: ${event.tool}`;
          break;
        case 'decision_point':
          y = 3;
          color = '#10A0FF'; // 观测蓝
          label = 'Decision';
          break;
        case 'model_handoff':
          y = 4;
          color = '#9c27b0'; // 紫色
          label = `Handoff: ${event.to}`;
          break;
      }

      nodes.push({
        id: `${event.type}-${index}`,
        type: event.type,
        atStep: event.atStep,
        label,
        position: new THREE.Vector3(x, y, z),
        color,
        event,
      });
    });

    nodesRef.current = nodes;
  }, [events]);

  // 渲染节点到场景
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // 清除旧节点
    meshesRef.current.forEach((mesh) => {
      scene.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material.dispose();
      }
    });
    meshesRef.current.clear();

    // 创建新节点
    nodesRef.current.forEach((node) => {
      const geometry = new THREE.SphereGeometry(0.3, 16, 16);
      const material = new THREE.MeshStandardMaterial({
        color: node.color,
        emissive: node.color,
        emissiveIntensity: 0.2,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(node.position);
      mesh.userData = { node };

      scene.add(mesh);
      meshesRef.current.set(node.id, mesh);
    });

    // 连接线
    for (let i = 1; i < nodesRef.current.length; i++) {
      const prev = nodesRef.current[i - 1];
      const curr = nodesRef.current[i];

      const points = [prev.position, curr.position];
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x2a2a2a,
        transparent: true,
        opacity: 0.5,
      });
      const line = new THREE.Line(lineGeometry, lineMaterial);
      scene.add(line);
    }
  }, [nodesRef.current]);

  // 高亮当前步骤
  useEffect(() => {
    meshesRef.current.forEach((mesh, id) => {
      const node = nodesRef.current.find((n) => n.id === id);
      if (!node) return;

      const isActive = node.atStep === currentStep;
      const material = mesh.material as THREE.MeshStandardMaterial;

      if (isActive) {
        material.emissiveIntensity = 0.8;
        mesh.scale.setScalar(1.5);
      } else {
        material.emissiveIntensity = 0.2;
        mesh.scale.setScalar(1.0);
      }
    });
  }, [currentStep]);

  // 点击检测
  const handleClick = (event: React.MouseEvent) => {
    if (!containerRef.current || !cameraRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    const intersects = raycaster.intersectObjects(
      Array.from(meshesRef.current.values())
    );

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const node = mesh.userData.node as AgentNode;
      setSelectedNode(node);
      onStepChange?.(node.atStep);
    }
  };

  return (
    <div className="relative h-full w-full">
      {/* 3D 画布 */}
      <div
        ref={containerRef}
        className="h-full w-full"
        onClick={handleClick}
      />

      {/* 图表说明 */}
      <div className="pointer-events-none absolute left-4 top-4 max-w-xs space-y-3">
        <div className="rounded-md border border-obs-line bg-obs-2/95 px-3 py-2.5 text-[12px] backdrop-blur-sm">
          <p className="font-medium text-obs-ink">🤖 Agent 协作流程</p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-obs-ink2">
            展示多 Agent 协作中的工具调用、决策点和模型交接。每个节点代表一个事件，连线表示执行顺序。
          </p>
        </div>

        {/* 图例 */}
        <div className="rounded-md border border-obs-line bg-obs-2/95 px-3 py-2 text-[11px] backdrop-blur-sm">
          <p className="mb-2 font-medium text-obs-ink">📋 节点类型</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#00e676]"></span>
              <span className="text-obs-ink2">工具调用</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#2196f3]"></span>
              <span className="text-obs-ink2">工具结果</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#ffa726]"></span>
              <span className="text-obs-ink2">决策点</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#ab47bc]"></span>
              <span className="text-obs-ink2">模型交接</span>
            </div>
          </div>
        </div>

        {/* 交互提示 */}
        <div className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-[11px] backdrop-blur-sm">
          <p className="font-medium text-accent">💡 交互操作</p>
          <ul className="mt-1.5 space-y-1 text-accent/90">
            <li>• 拖动旋转视角</li>
            <li>• 滚轮缩放距离</li>
            <li>• 点击节点查看详情</li>
          </ul>
        </div>
      </div>

      {/* 悬浮信息面板 */}
      {selectedNode && (
        <div className="absolute right-4 top-4 w-80 rounded-md border border-line bg-surface p-4 text-[12px]">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-medium text-ink">{selectedNode.label}</h3>
            <button
              type="button"
              className="text-ink-3 hover:text-ink"
              onClick={() => setSelectedNode(null)}
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 text-ink-2">
            <p>
              <span className="text-ink-3">步骤:</span> {selectedNode.atStep}
            </p>
            <p>
              <span className="text-ink-3">类型:</span> {selectedNode.type}
            </p>

            {selectedNode.event.type === 'tool_call' && (
              <>
                <p>
                  <span className="text-ink-3">工具:</span>{' '}
                  {selectedNode.event.tool}
                </p>
                <p>
                  <span className="text-ink-3">输入:</span>
                </p>
                <pre className="mt-1 overflow-x-auto rounded bg-obs-2 p-2 text-[11px]">
                  {selectedNode.event.input}
                </pre>
              </>
            )}

            {selectedNode.event.type === 'tool_result' && (
              <>
                <p>
                  <span className="text-ink-3">工具:</span>{' '}
                  {selectedNode.event.tool}
                </p>
                <p>
                  <span className="text-ink-3">状态:</span>{' '}
                  <span
                    className={
                      selectedNode.event.ok ? 'text-[#00e676]' : 'text-[#ef5350]'
                    }
                  >
                    {selectedNode.event.ok ? '成功' : '失败'}
                  </span>
                </p>
                <p>
                  <span className="text-ink-3">耗时:</span>{' '}
                  {selectedNode.event.durationMs.toFixed(1)} ms
                </p>
                <p>
                  <span className="text-ink-3">输出:</span>
                </p>
                <pre className="mt-1 max-h-32 overflow-auto rounded bg-obs-2 p-2 text-[11px]">
                  {selectedNode.event.output}
                </pre>
              </>
            )}

            {selectedNode.event.type === 'decision_point' && (
              <>
                {selectedNode.event.note && (
                  <p>
                    <span className="text-ink-3">说明:</span>{' '}
                    {selectedNode.event.note}
                  </p>
                )}
                {selectedNode.event.evidence && (
                  <>
                    <p>
                      <span className="text-ink-3">证据:</span>
                    </p>
                    <pre className="mt-1 max-h-32 overflow-auto rounded bg-obs-2 p-2 text-[11px]">
                      {selectedNode.event.evidence}
                    </pre>
                  </>
                )}
              </>
            )}

            {selectedNode.event.type === 'model_handoff' && (
              <>
                {selectedNode.event.from && (
                  <p>
                    <span className="text-ink-3">来源模型:</span>{' '}
                    {selectedNode.event.from}
                  </p>
                )}
                <p>
                  <span className="text-ink-3">目标模型:</span>{' '}
                  {selectedNode.event.to}
                </p>
                {selectedNode.event.note && (
                  <p>
                    <span className="text-ink-3">说明:</span>{' '}
                    {selectedNode.event.note}
                  </p>
                )}
              </>
            )}

            {selectedNode.event.confidence !== undefined && (
              <p>
                <span className="text-ink-3">置信度:</span>{' '}
                {(selectedNode.event.confidence * 100).toFixed(1)}%
              </p>
            )}

            {selectedNode.event.reason && (
              <p>
                <span className="text-ink-3">原因:</span>{' '}
                {selectedNode.event.reason}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 模型分段显示 */}
      {segments.length > 0 && (
        <div className="absolute bottom-4 left-4 max-w-md rounded-md border border-line bg-surface p-3 text-[11px]">
          <h4 className="mb-2 font-medium text-ink">模型责任分段</h4>
          <div className="space-y-1">
            {segments.map((seg, i) => (
              <div key={i} className="flex items-center gap-2 text-ink-2">
                <span className="font-mono text-ink">
                  {seg.fromStep}-{seg.toStep}
                </span>
                <span>→</span>
                <span className="text-ink">
                  {seg.model || '(未记录)'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 图例 */}
      <div className="absolute left-4 top-4 rounded-md border border-line bg-surface p-3 text-[11px]">
        <h4 className="mb-2 font-medium text-ink">事件类型</h4>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[#ffa726]" />
            <span className="text-ink-2">工具调用</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[#00e676]" />
            <span className="text-ink-2">工具成功</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[#ef5350]" />
            <span className="text-ink-2">工具失败</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[#10A0FF]" />
            <span className="text-ink-2">决策点</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[#9c27b0]" />
            <span className="text-ink-2">模型交接</span>
          </div>
        </div>
      </div>
    </div>
  );
}
