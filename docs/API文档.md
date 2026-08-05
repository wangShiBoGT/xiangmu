# API 文档和组件 Props 说明

> 核心组件、工具函数、类型定义的完整 API 参考

## 目录

1. [核心组件](#核心组件)
2. [工具函数](#工具函数)
3. [类型定义](#类型定义)
4. [Worker API](#worker-api)

---

## 核心组件

### SamplingChamber

**位置**：`src/components/SamplingChamber.tsx`

**功能**：3D 可视化 Token 采样过程，显示候选词概率分布。

**Props**：

```typescript
interface SamplingChamberProps {
  /** 当前显示的 token 步骤 */
  step: TokenStep | null;
  
  /** 步骤索引（从 0 开始） */
  stepIndex: number;
  
  /** 总步骤数 */
  totalSteps: number;
  
  /** 上一步回调 */
  onPrevStep?: () => void;
  
  /** 下一步回调 */
  onNextStep?: () => void;
  
  /** 跳转到指定步骤 */
  onStepSeek?: (index: number) => void;
  
  /** 对比参数（可选，用于参数对比模式） */
  compareParams?: {
    temperature: number;
    topP: number;
  };
  
  /** 类名（可选） */
  className?: string;
}
```

**示例**：

```tsx
<SamplingChamber
  step={currentStep}
  stepIndex={5}
  totalSteps={42}
  onPrevStep={() => setIndex(i => i - 1)}
  onNextStep={() => setIndex(i => i + 1)}
  onStepSeek={(idx) => setIndex(idx)}
/>
```

---

### ChatMessage

**位置**：`src/components/ChatMessage.tsx`

**功能**：渲染单条聊天消息（用户/助手），支持 Markdown、代码高亮、图片附件。

**Props**：

```typescript
interface ChatMessageProps {
  /** 消息对象 */
  message: {
    role: 'user' | 'assistant' | 'system';
    content: string;
    images?: string[]; // DataURL 数组
  };
  
  /** 是否正在生成中 */
  isGenerating?: boolean;
  
  /** 是否显示思考块 */
  showThinking?: boolean;
  
  /** 复制消息回调 */
  onCopy?: () => void;
  
  /** 重新生成回调（仅助手消息） */
  onRegenerate?: () => void;
  
  /** 类名（可选） */
  className?: string;
}
```

**示例**：

```tsx
<ChatMessage
  message={{
    role: 'assistant',
    content: 'Hello! How can I help you?',
  }}
  isGenerating={false}
  onCopy={() => navigator.clipboard.writeText(message.content)}
  onRegenerate={() => regenerateLastResponse()}
/>
```

---

### EnhancedInput

**位置**：`src/components/EnhancedInput.tsx`

**功能**：增强型输入框，支持自动高度、快捷键、附件上传。

**Props**：

```typescript
interface EnhancedInputProps {
  /** 输入值 */
  value: string;
  
  /** 输入变化回调 */
  onChange: (value: string) => void;
  
  /** 提交回调（Enter 键） */
  onSubmit: () => void;
  
  /** 是否禁用 */
  disabled?: boolean;
  
  /** 占位符 */
  placeholder?: string;
  
  /** 是否显示附件按钮 */
  showAttachButton?: boolean;
  
  /** 附件选择回调 */
  onAttach?: (files: File[]) => void;
  
  /** 已选附件列表 */
  attachments?: Array<{
    name: string;
    type: string;
    preview?: string; // DataURL
  }>;
  
  /** 移除附件回调 */
  onRemoveAttachment?: (index: number) => void;
  
  /** 类名（可选） */
  className?: string;
}
```

**示例**：

```tsx
<EnhancedInput
  value={input}
  onChange={setInput}
  onSubmit={handleSend}
  disabled={isGenerating}
  placeholder="输入消息..."
  showAttachButton
  onAttach={handleFileUpload}
  attachments={selectedFiles}
  onRemoveAttachment={(i) => removeFile(i)}
/>
```

---

### ModelSelect

**位置**：`src/components/ModelSelect.tsx`

**功能**：模型选择器，支持内置模型和自定义模型。

**Props**：

```typescript
interface ModelSelectProps {
  /** 当前选中的模型 ID */
  value: string;
  
  /** 选择变化回调 */
  onChange: (modelId: string) => void;
  
  /** 设备报告（用于过滤不兼容模型） */
  deviceReport: DeviceReport;
  
  /** 是否显示自定义模型输入 */
  showCustomInput?: boolean;
  
  /** 类名（可选） */
  className?: string;
}
```

**示例**：

```tsx
<ModelSelect
  value={currentModelId}
  onChange={handleModelChange}
  deviceReport={device}
  showCustomInput
/>
```

---

### SettingsPanel

**位置**：`src/components/SettingsPanel.tsx`

**功能**：生成参数设置面板（温度、Top-P、最大长度等）。

**Props**：

```typescript
interface SettingsPanelProps {
  /** 生成参数 */
  params: GenerationParams;
  
  /** 参数变化回调 */
  onChange: (params: Partial<GenerationParams>) => void;
  
  /** 是否显示高级选项 */
  showAdvanced?: boolean;
  
  /** 是否禁用 */
  disabled?: boolean;
  
  /** 类名（可选） */
  className?: string;
}

interface GenerationParams {
  temperature: number;      // 0-2
  topP: number;            // 0-1
  maxNewTokens: number;    // 1-2048
  repetitionPenalty: number; // 1-2
  doSample: boolean;
}
```

**示例**：

```tsx
<SettingsPanel
  params={genParams}
  onChange={(updated) => setGenParams({ ...genParams, ...updated })}
  showAdvanced
/>
```

---

## 工具函数

### Device Detection

**位置**：`src/lib/device.ts`

#### probeDevice()

**功能**：探测设备能力（WebGPU 可用性、GPU 信息、内存、核心数）。

**签名**：

```typescript
async function probeDevice(): Promise<DeviceReport>

interface DeviceReport {
  webgpu: boolean;           // WebGPU 是否可用
  fp16: boolean;             // 是否支持 fp16
  gpuInfo: string | null;    // GPU 厂商/架构描述
  memoryGB: number | null;   // 设备内存（GB）
  cores: number;             // CPU 核心数
  tier: 1 | 2 | 3;          // 综合档位
  webgpuFailReason?: string; // 失败原因（如果有）
}
```

**示例**：

```typescript
const device = await probeDevice();
console.log(`WebGPU: ${device.webgpu}, Tier: ${device.tier}`);
```

#### recommendModel()

**功能**：根据设备档位推荐最佳模型。

**签名**：

```typescript
function recommendModel(report: DeviceReport): ModelInfo
```

**示例**：

```typescript
const recommended = recommendModel(device);
console.log(`推荐模型: ${recommended.name}`);
```

#### getOptimizationAdvice()

**功能**：根据设备能力和模型大小给出优化建议。

**签名**：

```typescript
function getOptimizationAdvice(
  model: ModelInfo,
  report: DeviceReport,
  device: 'webgpu' | 'wasm'
): OptimizationAdvice

interface OptimizationAdvice {
  recommendedDtype: 'q4' | 'q4f16' | 'int8';
  useExternalData: boolean;
  memoryRisk: 'low' | 'medium' | 'high';
  advice: string;
}
```

**示例**：

```typescript
const advice = getOptimizationAdvice(model, device, 'webgpu');
if (advice.memoryRisk === 'high') {
  console.warn(advice.advice);
}
```

---

### Trace Recording

**位置**：`src/lib/trace.ts`

#### TraceRecorder

**功能**：记录推理过程的 Token 采样数据。

**签名**：

```typescript
class TraceRecorder {
  constructor();
  
  /** 记录单个 token 步骤 */
  recordStep(step: TokenStep): void;
  
  /** 获取完整 trace */
  getTrace(): GenerationTrace;
  
  /** 清空记录 */
  clear(): void;
}

interface TokenStep {
  id: string;
  text: string;
  prob: number;           // 选中概率 [0, 1]
  topk: Array<{           // Top-K 候选
    text: string;
    prob: number;
  }>;
  entropy: number;        // 熵值
  dt: number;             // 生成耗时（ms）
  deep?: DeepCapture;     // 深度采集数据（可选）
}
```

**示例**：

```typescript
const recorder = new TraceRecorder();

// 推理循环中记录每步
recorder.recordStep({
  id: crypto.randomUUID(),
  text: 'Hello',
  prob: 0.85,
  topk: [
    { text: 'Hello', prob: 0.85 },
    { text: 'Hi', prob: 0.10 },
  ],
  entropy: 0.52,
  dt: 15,
});

// 获取完整 trace
const trace = recorder.getTrace();
```

#### exportReplay()

**功能**：导出 trace 为 .aitrace 文件格式。

**签名**：

```typescript
function exportReplay(trace: GenerationTrace): string
```

**示例**：

```typescript
const json = exportReplay(trace);
const blob = new Blob([json], { type: 'application/json' });
const url = URL.createObjectURL(blob);
// 触发下载
```

#### importReplay()

**功能**：导入 .aitrace 文件。

**签名**：

```typescript
function importReplay(jsonStr: string): GenerationTrace | null
```

**示例**：

```typescript
const file = await fileInput.files[0].text();
const trace = importReplay(file);
if (trace) {
  loadTraceIntoUI(trace);
}
```

---

### Document Processing

**位置**：`src/lib/documents.ts`

#### parseDocument()

**功能**：解析文档文件（PDF/Word/Excel/Txt）。

**签名**：

```typescript
async function parseDocument(file: File): Promise<ParsedDocument>

interface ParsedDocument {
  name: string;
  content: string;
  truncated: boolean;  // 是否被截断
}
```

**示例**：

```typescript
const doc = await parseDocument(file);
console.log(`文档: ${doc.name}, 长度: ${doc.content.length}`);
if (doc.truncated) {
  console.warn('内容过长，已截断到 6000 字符');
}
```

#### buildDocPrompt()

**功能**：构建包含文档的提示词。

**签名**：

```typescript
function buildDocPrompt(
  docs: ParsedDocument[],
  userQuestion: string
): string
```

**示例**：

```typescript
const prompt = buildDocPrompt([doc1, doc2], '这两份文档的核心差异是什么？');
// 返回格式化的提示词，包含文档内容 + 用户问题
```

---

### Image Processing

**位置**：`src/lib/images.ts`

#### fileToDataURL()

**功能**：将图片文件转为压缩的 DataURL（最大边长 512px）。

**签名**：

```typescript
async function fileToDataURL(file: File): Promise<string>
```

**示例**：

```typescript
const dataURL = await fileToDataURL(imageFile);
// data:image/jpeg;base64,/9j/4AAQSkZJRgAB...
```

---

### Statistics

**位置**：`src/lib/statistics.ts`

#### computeOverallStats()

**功能**：从 localStorage 和 IndexedDB 聚合统计数据。

**签名**：

```typescript
async function computeOverallStats(): Promise<OverallStats>

interface OverallStats {
  sessions: SessionStats;
  models: Record<string, ModelStats>;
  parameters: Record<string, ParameterStats>;
  entropy: EntropyDistribution;
  temperature: TemperatureDistribution;
}
```

**示例**：

```typescript
const stats = await computeOverallStats();
console.log(`总会话数: ${stats.sessions.totalSessions}`);
console.log(`总 Token 数: ${stats.sessions.totalTokens}`);
```

#### exportStatsToCSV()

**功能**：导出统计数据为 CSV 格式。

**签名**：

```typescript
function exportStatsToCSV(stats: OverallStats): string
```

**示例**：

```typescript
const csv = exportStatsToCSV(stats);
const blob = new Blob([csv], { type: 'text/csv' });
// 触发下载
```

---

## 类型定义

### ModelInfo

**位置**：`src/lib/models.ts`

```typescript
interface ModelInfo {
  id: string;               // 唯一标识
  name: string;             // 显示名称
  params: string;           // 参数量（如 "1.5B"）
  sizeWebgpu: number;       // WebGPU 模型大小（字节）
  sizeWasm: number;         // WASM 模型大小（字节）
  minTier: 1 | 2 | 3;      // 最低设备档位要求
  wasmOk: boolean;          // 是否支持 WASM 模式
  builtin: boolean;         // 是否内置模型
  externalData?: boolean;   // 是否使用外部数据格式（分片加载）
  upstream: string;         // HuggingFace 模型 ID
  dtype: 'q4' | 'q4f16' | 'int8'; // 量化精度
}
```

---

### GenerationTrace

**位置**：`src/lib/trace.ts`

```typescript
interface GenerationTrace {
  version: string;          // 格式版本（"aitrace/v2"）
  prompt: string;           // 原始提示词
  promptIds?: number[];     // Token IDs
  modelId: string;          // 模型标识
  params: GenerationParams; // 生成参数
  steps: TokenStep[];       // Token 步骤数组
  device: 'webgpu' | 'wasm'; // 使用的设备
  pipeline?: PipelineTiming; // 管线计时
  branches?: BranchNode[];   // 分岔树（可选）
  agent?: AgentEvent[];      // Agent 事件（可选）
  extensions?: Record<string, unknown>; // 扩展数据
}

interface PipelineTiming {
  tokenizeMs: number;   // 分词耗时
  prefillMs: number;    // 预填充耗时
  decodeMs: number;     // 解码总耗时
}

interface BranchNode {
  parent: string;       // 父节点 ID
  children: Array<{
    id: string;
    text: string;
    prob: number;
  }>;
}
```

---

## Worker API

### 位置

`src/lib/worker.ts`

### 消息协议

Worker 使用 postMessage 通信，消息格式：

```typescript
// 主线程 → Worker
type WorkerRequest =
  | { type: 'load-model'; modelId: string; device: 'webgpu' | 'wasm' }
  | { type: 'generate'; prompt: string; params: GenerationParams }
  | { type: 'generate-vision'; messages: VisionMessage[]; params: GenerationParams }
  | { type: 'stop' };

// Worker → 主线程
type WorkerResponse =
  | { type: 'progress'; progress: number; total: number; status: string }
  | { type: 'model-loaded'; modelId: string; device: string }
  | { type: 'token'; text: string; step?: TokenStep }
  | { type: 'done'; fullText: string; trace?: GenerationTrace }
  | { type: 'error'; message: string };
```

### 示例

```typescript
// 主线程
const worker = new Worker(new URL('./lib/worker.ts', import.meta.url), {
  type: 'module',
});

// 加载模型
worker.postMessage({
  type: 'load-model',
  modelId: 'Phi-3.5-mini-instruct',
  device: 'webgpu',
});

// 监听进度
worker.addEventListener('message', (e) => {
  const msg = e.data;
  
  if (msg.type === 'progress') {
    console.log(`${msg.status}: ${msg.progress}/${msg.total}`);
  } else if (msg.type === 'model-loaded') {
    console.log('模型加载完成');
  } else if (msg.type === 'token') {
    appendToChat(msg.text);
  } else if (msg.type === 'done') {
    console.log('生成完成', msg.fullText);
  }
});

// 开始生成
worker.postMessage({
  type: 'generate',
  prompt: 'Hello, how are you?',
  params: {
    temperature: 0.7,
    topP: 0.9,
    maxNewTokens: 512,
    repetitionPenalty: 1.1,
    doSample: true,
  },
});

// 停止生成
worker.postMessage({ type: 'stop' });
```

---

## 性能监控

### 开发模式 Profiler

**位置**：`src/lib/profiler.ts`

**全局 API**：`window.__profiler__`（仅开发模式）

```typescript
// 标记开始
window.__profiler__.mark('render-start');

// 标记结束并测量
window.__profiler__.mark('render-end');
window.__profiler__.measure('render', 'render-start', 'render-end');

// 获取所有测量
const measures = window.__profiler__.getMeasures();

// 获取内存快照
const memory = window.__profiler__.getMemory();

// 清除
window.__profiler__.clear();
```

---

## 错误处理

### 错误追踪

**位置**：`src/lib/errorTracking.ts`

```typescript
// 启用错误追踪（需用户授权）
enableErrorTracking();

// 手动记录错误
recordWebGPUError('WebGPU 初始化失败', {
  reason: 'adapter not found',
  userAgent: navigator.userAgent,
});

// 获取所有错误记录
const errors = getErrorRecords();

// 导出错误日志
const json = exportErrorsJSON();

// 清除错误记录
clearErrorRecords();

// 禁用错误追踪
disableErrorTracking();
```

---

## 更新日志

- **2026-08-05**：初始版本，覆盖核心组件和工具函数
- 后续更新将在此补充新增 API

---

**维护者**：开发团队  
**联系方式**：GitHub Issues
