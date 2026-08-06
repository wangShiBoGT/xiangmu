# .aitrace 开放标准规范

> 版本：v1.0  
> 最后更新：2026-08-06  
> 状态：稳定

---

## 概述

`.aitrace` 是一种开放的、与模型无关的 AI 生成跟踪格式，用于记录大语言模型（LLM）逐 token 生成过程中的完整统计信息。

**核心价值**：
- **置信度可视化**：每个 token 都有精确的概率和熵值，让 AI 输出带上"不确定性标尺"
- **可复现性**：记录完整的生成参数、候选分布、采样轨迹，支持科学研究和审计
- **模型无关**：适用于任何支持 logprobs 输出的 LLM（本地模型、OpenAI、Anthropic、Gemini 等）
- **开放标准**：JSON 格式，易于集成到任何编程语言和工具链

**设计原则**：
1. **真实性**：所有数值来自实际推理输出（softmax 后、采样前的分布），不伪造、不估算
2. **最小化**：核心字段精简，可选字段用 `extensions` 命名空间扩展
3. **可扩展**：支持 Agent 事件、工具调用、多模态等未来扩展

---

## 数据结构

### GenerationTrace（根对象）

一次完整生成的记录根对象。

```typescript
interface GenerationTrace {
  /** 模型标识符（如 "Qwen2.5-7B-Instruct-q4f16_1-MLC"） */
  modelId: string;
  
  /** 生成参数 */
  params: {
    temperature: number;     // 采样温度（0.0-2.0）
    topP: number;           // 核采样阈值（0.0-1.0）
    seed?: number | null;   // 随机种子（可选）
  };
  
  /** prompt 部分的 token ids（用于分岔重生成的精确前缀） */
  promptIds: number[];
  
  /** 逐步生成记录（按生成顺序） */
  steps: TokenStep[];
  
  /** 运行设备类型 */
  device: "webgpu" | "wasm" | "cpu" | "cuda" | string;
  
  /** 流水线阶段耗时（可选，单位：毫秒） */
  pipeline?: {
    tokenizeMs: number;   // prompt 编码耗时
    prefillMs: number;    // 提交推理到首 token 耗时
    decodeMs: number;     // 首 token 到结束耗时
  };
  
  /** Agent 事件（可选，用于工具调用/决策点记录） */
  agent?: AgentEvent[];
  
  /** 开放扩展命名空间（可选） */
  extensions?: Record<string, unknown>;
}
```

---

### TokenStep（单步记录）

单个 token 的"出生档案"，记录该步的完整统计信息。

```typescript
interface TokenStep {
  /** 选中 token 的 id（词表索引） */
  id: number;
  
  /** 选中 token 的解码文本 */
  text: string;
  
  /** 选中 token 在采样分布中的精确概率（全量 softmax 后） */
  prob: number;
  
  /** top-k 候选（按概率降序，推荐 k=8） */
  topk: TokenCandidate[];
  
  /** 该步分布的精确熵（单位：nats） */
  entropy: number;
  
  /** 该步耗时（单位：毫秒） */
  dt: number;
  
  /** 深度采集（可选，用于研究）：top-256 采样前 logits 快照 */
  deep?: {
    logits: number[];     // 前 256 个 logits 值
    ids: number[];        // 对应的 token ids
  };
}
```

**字段说明**：
- `prob`：该 token 被选中的概率（0.0-1.0），来自全量 softmax 归一化
- `entropy`：分布熵，单位为 nats（自然对数）。熵值越大，分布越分散，模型越"不确定"
  - `< 2.0`：高置信（通常是常见词、语法固定搭配）
  - `2.0-3.5`：正常范围
  - `3.5-4.5`：较高不确定性（谨慎对待）
  - `> 4.5`：极高不确定性（需人工核查）
- `dt`：该步的实测耗时，受硬件和后端影响，跨设备不可比

---

### TokenCandidate（候选 token）

```typescript
interface TokenCandidate {
  /** 候选 token 的 id */
  id: number;
  
  /** 候选 token 的解码文本 */
  text: string;
  
  /** 候选 token 的概率 */
  prob: number;
}
```

**约定**：
- `topk` 数组按概率降序排列
- 如果选中 token 在 top-k 内，其 `prob` 与 `TokenStep.prob` 一致
- 推荐 k=8（平衡信息量与存储开销）

---

### AgentEvent（Agent 事件，可选）

用于记录 Agent 系统的工具调用、决策点等事件，锚定在 token 时间线上。

```typescript
interface AgentEvent {
  /** 事件类型 */
  type: "tool_call" | "tool_result" | "decision" | "retrieval" | "handoff";
  
  /** 事件发生在第几个 token 之后（0 = prompt 阶段） */
  afterStep: number;
  
  /** 事件标签（如工具名称、决策点描述） */
  label: string;
  
  /** 事件详情（自由格式，根据 type 定义） */
  data?: Record<string, unknown>;
}
```

---

## 扩展规范（extensions 命名空间）

为保持核心格式的稳定性，各 runtime 或平台可通过 `extensions` 字段携带自定义数据。

**命名空间约定**：
- 使用反向域名格式：`"com.example.feature"`
- 官方扩展：`"aitrace.{feature}"` （如 `"aitrace.reasoning"`）
- 导入/导出时原样保留，不解释、不验证

**示例**：
```json
{
  "extensions": {
    "aitrace.reasoning": {
      "thinkingTokens": 127,
      "thinkingEntropy": 2.34
    },
    "com.openai.logprobs": {
      "top_logprobs": [...]
    }
  }
}
```

---

## 完整示例

### 最小示例（3 tokens）

```json
{
  "modelId": "Qwen2.5-7B-Instruct",
  "params": {
    "temperature": 0.7,
    "topP": 0.9
  },
  "promptIds": [151644, 8948, 198],
  "steps": [
    {
      "id": 9906,
      "text": "Hello",
      "prob": 0.8523,
      "topk": [
        { "id": 9906, "text": "Hello", "prob": 0.8523 },
        { "id": 13347, "text": "Hi", "prob": 0.0942 },
        { "id": 22387, "text": "Hey", "prob": 0.0231 }
      ],
      "entropy": 0.627,
      "dt": 45
    },
    {
      "id": 1917,
      "text": " world",
      "prob": 0.7234,
      "topk": [
        { "id": 1917, "text": " world", "prob": 0.7234 },
        { "id": 1070, "text": " there", "prob": 0.1523 }
      ],
      "entropy": 0.983,
      "dt": 12
    },
    {
      "id": 0,
      "text": "!",
      "prob": 0.9512,
      "topk": [
        { "id": 0, "text": "!", "prob": 0.9512 },
        { "id": 13, "text": ".", "prob": 0.0387 }
      ],
      "entropy": 0.234,
      "dt": 11
    }
  ],
  "device": "webgpu"
}
```

---

### 真实示例（完整对话）

```json
{
  "modelId": "Qwen2.5-7B-Instruct-q4f16_1-MLC",
  "params": {
    "temperature": 1.0,
    "topP": 0.95,
    "seed": 42
  },
  "promptIds": [151644, 8948, 198, 151645, 198, 151644, 872, 198, 用一句话解释为什么天空是蓝色的 151645, 198, 151644, 77091, 198],
  "steps": [
    {
      "id": 9906,
      "text": "天空",
      "prob": 0.7823,
      "topk": [
        { "id": 9906, "text": "天空", "prob": 0.7823 },
        { "id": 5678, "text": "大气", "prob": 0.1234 },
        { "id": 1234, "text": "光线", "prob": 0.0512 }
      ],
      "entropy": 1.234,
      "dt": 89
    },
    {
      "id": 1917,
      "text": "呈现",
      "prob": 0.6234,
      "topk": [
        { "id": 1917, "text": "呈现", "prob": 0.6234 },
        { "id": 5432, "text": "之所以", "prob": 0.2345 }
      ],
      "entropy": 1.523,
      "dt": 13
    }
  ],
  "device": "webgpu",
  "pipeline": {
    "tokenizeMs": 3,
    "prefillMs": 156,
    "decodeMs": 234
  }
}
```

---

## 如何接入

### TypeScript / JavaScript

**读取 .aitrace 文件**：
```typescript
import type { GenerationTrace } from './trace';

async function loadTrace(path: string): Promise<GenerationTrace> {
  const response = await fetch(path);
  const trace: GenerationTrace = await response.json();
  return trace;
}

// 计算平均熵
function avgEntropy(trace: GenerationTrace): number {
  const steps = trace.steps;
  return steps.reduce((sum, s) => sum + s.entropy, 0) / steps.length;
}

// 查找高熵 token
function findHighEntropyTokens(trace: GenerationTrace, threshold = 3.0) {
  return trace.steps.filter(s => s.entropy > threshold);
}
```

**生成 .aitrace 文件**：
```typescript
function buildTrace(
  modelId: string,
  params: { temperature: number; topP: number },
  steps: TokenStep[]
): GenerationTrace {
  return {
    modelId,
    params,
    promptIds: [], // 填入实际 prompt token ids
    steps,
    device: "webgpu",
  };
}

// 导出为 JSON 文件
function exportTrace(trace: GenerationTrace, filename: string) {
  const blob = new Blob([JSON.stringify(trace, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

---

### Python

**读取 .aitrace 文件**：
```python
import json
from typing import List, Dict, Any

def load_trace(path: str) -> Dict[str, Any]:
    """加载 .aitrace 文件"""
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def avg_entropy(trace: Dict[str, Any]) -> float:
    """计算平均熵"""
    steps = trace['steps']
    return sum(s['entropy'] for s in steps) / len(steps)

def find_high_entropy_tokens(trace: Dict[str, Any], threshold: float = 3.0) -> List[Dict]:
    """查找高熵 token"""
    return [s for s in trace['steps'] if s['entropy'] > threshold]

# 使用示例
trace = load_trace('example.aitrace')
print(f"平均熵: {avg_entropy(trace):.2f}")
high_entropy = find_high_entropy_tokens(trace)
print(f"高熵 token 数量: {len(high_entropy)}")
```

**生成 .aitrace 文件**：
```python
def build_trace(
    model_id: str,
    temperature: float,
    top_p: float,
    steps: List[Dict],
    device: str = "cuda"
) -> Dict[str, Any]:
    """构建 .aitrace 对象"""
    return {
        "modelId": model_id,
        "params": {
            "temperature": temperature,
            "topP": top_p
        },
        "promptIds": [],  # 填入实际 prompt token ids
        "steps": steps,
        "device": device
    }

def export_trace(trace: Dict[str, Any], path: str):
    """导出为 .aitrace 文件"""
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(trace, f, ensure_ascii=False, indent=2)

# 使用示例
trace = build_trace(
    model_id="Qwen2.5-7B-Instruct",
    temperature=0.7,
    top_p=0.9,
    steps=[...]  # 填入实际步骤
)
export_trace(trace, "output.aitrace")
```

---

## 常见问题

### Q: entropy 的单位是什么？
A: nats（自然对数）。如果习惯 bits，用 `entropy / ln(2)` 转换。

### Q: 为什么 topk 不包含所有候选？
A: 为了减小文件体积。k=8 已足够覆盖大部分有意义的候选，同时保持文件可读性。如需完整分布，使用 `deep.logits` 字段。

### Q: 如何处理多模态输入（图像、音频）？
A: 当前版本聚焦文本生成。多模态输入的编码信息可放在 `extensions` 中，例如：
```json
{
  "extensions": {
    "aitrace.vision": {
      "imageTokens": [32000, 32001, ...],
      "imageUrl": "data:image/png;base64,..."
    }
  }
}
```

### Q: 如何表示思考链（Chain-of-Thought）？
A: 思考链的 token 与正常输出混在同一个 `steps` 数组中，按生成顺序记录。识别思考段的方法：
1. 检测特殊 token（如 `<think>` / `</think>`）
2. 使用 `extensions` 标注：
```json
{
  "extensions": {
    "aitrace.reasoning": {
      "thinkingRange": [0, 127],  // 前 127 个 token 是思考段
      "answerRange": [127, 256]    // 后 129 个 token 是回答段
    }
  }
}
```

---

## 版本历史

- **v1.0** (2026-08-06): 初始稳定版本
  - 核心字段：`modelId`, `params`, `promptIds`, `steps`, `device`
  - 可选字段：`pipeline`, `agent`, `extensions`
  - TokenStep 完整定义：`id`, `text`, `prob`, `topk`, `entropy`, `dt`

---

## 许可协议

本规范采用 CC0 1.0 Universal (公有领域) 协议发布，任何人可自由使用、修改、分发，无需署名。

---

## 贡献与反馈

欢迎通过以下方式参与规范改进：
- GitHub Issues: [webgpu-llm-chat/issues](https://github.com/wangshibo/webgpu-llm-chat/issues)
- Email: [项目维护者邮箱]
- 提交 PR：新增语言绑定、工具支持、使用案例

---

**相关链接**：
- [项目主页](https://github.com/wangshibo/webgpu-llm-chat)
- [在线演示](https://webgpu-llm-chat.pages.dev/)
- [TypeScript 参考实现](../src/lib/trace.ts)
