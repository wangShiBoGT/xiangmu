# AI 幻觉检测学术引用

> 本文档列出了幻觉检测系统所依据的学术论文和工业文档
> 最后更新：2026-08-06

---

## 核心论文

### 1. Semantic Entropy

**标题**: Detecting Hallucinations in Large Language Models Using Semantic Entropy

**作者**: Sebastian Farquhar, Jannik Kossen, Lorenz Kuhn, Yarin Gal

**发表**: *Nature*, Volume 630, Pages 625–630 (2024)

**DOI**: [10.1038/s41586-024-07421-0](https://doi.org/10.1038/s41586-024-07421-0)

**核心贡献**:
- 提出语义熵（Semantic Entropy）概念
- Token-level 熵不足以检测幻觉，需要在语义空间计算
- 使用 NLI 模型聚类语义等价答案
- 准确率比传统方法提升 20-30%

**我们的应用**: 简化版实现，用 n-gram overlap 近似语义相似度

---

### 2. Self-Consistency

**标题**: Self-Consistency Improves Chain of Thought Reasoning in Language Models

**作者**: Xuezhi Wang, Jason Wei, Dale Schuurmans, Quoc Le, Ed Chi, Sharan Narang, Aakanksha Chowdhery, Denny Zhou

**发表**: *ICLR 2023*

**ArXiv**: [2203.11171](https://arxiv.org/abs/2203.11171)

**核心贡献**:
- 同一问题多次采样，取最一致答案
- 相比单次生成，推理准确率显著提升
- 适用于各种规模的语言模型
- 与 Chain-of-Thought prompting 结合效果最佳

**我们的应用**: 多次运行同一 prompt，计算一致性评分和分叉点

---

### 3. Information-Theoretic Method

**标题**: An Information-Theoretic Method Cuts Hallucination Rate by 92%

**ArXiv**: [2512.03107](https://arxiv.org/abs/2512.03107)

**核心贡献**:
- 结合熵估计和困惑度分解
- 多样本聚类检测生成多样性
- 在金融领域数据集上达到 92% 幻觉检测准确率
- 假阳性率 < 5%，召回率 > 85%

**我们的应用**: 直接实现熵和困惑度计算，多样性评分

---

### 4. HALT (Hallucination Assessment via Log-probs as Time series)

**标题**: Hallucination Assessment via Log-probs as Time series

**ArXiv**: [2602.02888](https://arxiv.org/abs/2602.02888)

**核心贡献**:
- 将 logprobs 视为时间序列
- 提取时间序列特征：均值、方差、趋势、波动率
- 幻觉表现为概率突降、高波动、长期低概率区域
- 无需外部知识库，仅依赖模型输出

**我们的应用**: 实现概率突降检测、低概率区域检测、波动率分析

---

### 5. Semantic Entropy Probes

**标题**: Semantic Entropy Probes: Robust and Cheap Hallucination Detection in LLMs

**ArXiv**: [2406.15927](https://arxiv.org/abs/2406.15927)

**核心贡献**:
- 轻量级探针方法，降低计算成本
- 无需额外模型，直接从 LLM 内部状态预测
- 在多个基准上超越 Semantic Entropy

**我们的应用**: 未来可集成，当前使用标准语义熵方法

---

### 6. Beyond Self-Consistency

**标题**: Verify when Uncertain: Beyond Self-Consistency in Black Box Hallucination Detection

**ArXiv**: [2502.15845](https://arxiv.org/abs/2502.15845)

**核心贡献**:
- 扩展 Self-Consistency，加入不确定性量化
- 仅在模型不确定时触发验证，降低成本
- 黑盒场景下（无 logprobs）的最佳实践

**我们的应用**: 指导我们的自洽性检查何时触发

---

## 辅助论文

### 7. Efficient Bayesian Estimation of Semantic Entropy

**ArXiv**: [2504.03579](https://arxiv.org/abs/2504.03579)

**核心贡献**: 贝叶斯方法估计语义熵，减少采样次数

---

### 8. Detecting LLM Hallucination Beyond Entropy

**ArXiv**: [2508.14496](https://arxiv.org/abs/2508.14496)

**核心贡献**: 除熵值外的其他特征（注意力模式、隐藏层激活）

---

### 9. Reliable Hallucination Detection

**标题**: Reliable Hallucination Detection in Black-Box Language Models via Semantic-aware Cross-check Consistency

**ArXiv**: [2311.01740](https://arxiv.org/abs/2311.01740)

**核心贡献**: 跨提示一致性检查，适用于黑盒模型

---

### 10. Single-Decode Confidence

**标题**: Single-Decode Confidence for Hallucination Detection

**ArXiv**: [2605.05166](https://arxiv.org/abs/2605.05166)

**核心贡献**: 单次生成即可估计置信度，无需多次采样

---

## 工业界文档

### 11. OpenAI Cookbook - Using Logprobs

**链接**: [https://cookbook.openai.com/examples/using_logprobs](https://cookbook.openai.com/examples/using_logprobs)

**核心内容**:
- Token-level 概率过滤（prob < 0.3）
- 序列联合概率计算
- 实战案例和最佳实践

**我们的应用**: 参考其阈值设定和检测逻辑

---

### 12. OpenAI Cookbook - Developing Hallucination Guardrails

**链接**: [https://cookbook.openai.com/examples/developing_hallucination_guardrails](https://cookbook.openai.com/examples/developing_hallucination_guardrails)

**核心内容**:
- 如何构建幻觉防护系统
- 与知识库对比验证
- Self-Consistency 投票机制
- Guardrails API 使用指南

**我们的应用**: 参考其防护策略，但不依赖闭源 API

---

### 13. OpenAI Blog - Why Language Models Hallucinate

**链接**: [https://openai.com/index/why-language-models-hallucinate/](https://openai.com/index/why-language-models-hallucinate/)

**核心内容**:
- 幻觉的根本原因（训练数据、统计模式）
- 常见幻觉类型（编造数字、虚假引用）
- 减少幻觉的策略

**我们的应用**: 指导我们的事实性风险标记设计

---

## 数据集

### HaluEval

**论文**: HaluEval: A Large-Scale Hallucination Evaluation Benchmark for Large Language Models

**ArXiv**: [2305.11747](https://arxiv.org/abs/2305.11747)

**用途**: 标注数据集，用于验证假阳性率和召回率

---

### TruthfulQA

**论文**: TruthfulQA: Measuring How Models Mimic Human Falsehoods

**ArXiv**: [2109.07958](https://arxiv.org/abs/2109.07958)

**用途**: 测试模型是否会模仿人类常见的错误观念

---

## 引用格式

### BibTeX

如果您在学术论文中使用本工具，请引用：

```bibtex
@software{webgpu_llm_observe,
  title = {WebGPU LLM Observe: AI Confidence Auditing Tool},
  author = {Wang, Shibo},
  year = {2027},
  url = {https://github.com/wangshibo/webgpu-llm-chat},
  note = {Version 1.0}
}

@article{farquhar2024semantic,
  title={Detecting hallucinations in large language models using semantic entropy},
  author={Farquhar, Sebastian and Kossen, Jannik and Kuhn, Lorenz and Gal, Yarin},
  journal={Nature},
  volume={630},
  pages={625--630},
  year={2024},
  publisher={Nature Publishing Group}
}

@inproceedings{wang2022self,
  title={Self-consistency improves chain of thought reasoning in language models},
  author={Wang, Xuezhi and Wei, Jason and Schuurmans, Dale and Le, Quoc and Chi, Ed and Narang, Sharan and Chowdhery, Aakanksha and Zhou, Denny},
  booktitle={International Conference on Learning Representations},
  year={2023}
}
```

### APA

- Farquhar, S., Kossen, J., Kuhn, L., & Gal, Y. (2024). Detecting hallucinations in large language models using semantic entropy. *Nature*, 630, 625–630. https://doi.org/10.1038/s41586-024-07421-0

- Wang, X., Wei, J., Schuurmans, D., Le, Q., Chi, E., Narang, S., Chowdhery, A., & Zhou, D. (2023). Self-consistency improves chain of thought reasoning in language models. *International Conference on Learning Representations*.

- Wang, S. (2027). *WebGPU LLM Observe: AI Confidence Auditing Tool* (Version 1.0) [Software]. https://github.com/wangshibo/webgpu-llm-chat

---

## 相关资源

- [项目 GitHub](https://github.com/wangshibo/webgpu-llm-chat)
- [在线演示](https://webgpu-llm-chat.pages.dev/)
- [方法论白皮书](./HALLUCINATION_DETECTION_RESEARCH.md)
- [.aitrace 开放标准](./AITRACE_SPEC.md)

---

**最后更新**: 2026-08-06  
**维护者**: Wang Shibo  
**许可协议**: MIT
