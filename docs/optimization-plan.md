# WebGPU 性能优化方案

## 当前状态分析

### 已有功能
1. **设备检测** (device.ts)
   - WebGPU 可用性检测
   - GPU 特性探测（fp16 支持）
   - 设备档位评估（tier 1-3）
   - 模型推荐系统

2. **错误处理** (worker.ts)
   - 错误分类系统（heap/webgpu-runtime/numeric/network）
   - 自动降级逻辑
   - 数值健康度监控

3. **模型加载** (worker.ts)
   - 单例模式的模型管理
   - 模型切换时的资源释放
   - 进度回调支持

### 待优化点

## 优化任务 1: 模型加载流程优化

### 问题
- 首次加载时间较长
- 进度反馈不够详细
- 预热阶段用户体验不佳

### 解决方案
1. **渐进式加载反馈**
   - 细化加载阶段（下载、解析、编译、预热）
   - 每个阶段显示预估时间
   - 添加可取消机制

2. **并行加载优化**
   - tokenizer 和 model 已经并行加载
   - 可以预加载常用模型的 tokenizer

3. **预热优化**
   - 当前预热使用单个 token，可以使用更有代表性的输入
   - 添加着色器编译缓存提示

## 优化任务 2: WASM 停止响应改进

### 问题
- WASM 模式下无法中断生成
- InterruptableStoppingCriteria 在 WASM 线程中受限

### 解决方案
1. **添加轮询检查点**
   - 在 token_callback 中检查中断信号
   - 定期 yield 给主线程

2. **超时保护**
   - 设置最大生成时间
   - 超时自动终止

## 优化任务 3: WebGPU 兼容性增强

### 问题
- fp16 数值异常检测较晚
- 降级提示不够明确

### 解决方案
1. **提前检测**
   - 在预热阶段进行数值健康检查
   - 检测到问题立即降级或切换精度

2. **精度自适应**
   - 优先尝试 q4f16
   - 失败后自动降级到 q4
   - 记录设备兼容性配置

## 优化任务 4: 内存占用优化

### 问题
- 32 位内存限制
- 大模型加载失败

### 解决方案
1. **智能内存管理**
   - 加载前检查可用内存
   - 提前警告内存不足

2. **模型推荐改进**
   - 根据实际可用内存推荐
   - 动态调整推荐列表

## 实施计划

### Phase 1: 加载体验优化（当前优先级：高）
- [ ] 添加详细的加载阶段反馈
- [ ] 优化预热流程
- [ ] 添加取消加载功能

### Phase 2: 兼容性增强（当前优先级：高）
- [ ] 提前数值健康检查
- [ ] 精度自适应机制
- [ ] 设备兼容性缓存

### Phase 3: WASM 响应改进（当前优先级：中）
- [ ] 添加中断检查点
- [ ] 超时保护机制

### Phase 4: 内存优化（当前优先级：中）
- [ ] 内存预检查
- [ ] 智能模型推荐

## 技术细节

### 加载阶段定义
```typescript
type LoadingStage = 
  | 'downloading'    // 下载权重文件
  | 'parsing'        // 解析 ONNX 模型
  | 'compiling'      // 编译着色器（WebGPU）
  | 'warming'        // 预热推理
  | 'ready';         // 就绪
```

### 数值健康检查
```typescript
// 预热时使用多样化输入，检测各种场景的数值稳定性
const warmupInputs = [
  "Hello",           // 简单英文
  "你好",            // 中文
  "1+1=",            // 数学
  "<think>test",     // 特殊 token
];
```

### 内存估算
```typescript
function estimateMemoryRequirement(model: ModelInfo, device: Device): number {
  const baseSize = device === 'webgpu' ? model.sizeWebgpu : model.sizeWasm;
  // ONNX Runtime 运行时开销约为模型大小的 1.5-2 倍
  return baseSize * 1.8;
}
```
