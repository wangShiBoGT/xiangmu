/**
 * 术语表数据
 * 为 <Term> 组件提供集中式术语定义
 */

export interface GlossaryEntry {
  /** 术语名称（中英文） */
  term: string;
  /** 一句人话解释 */
  explanation: string;
  /** 具体例子（可选） */
  example?: string;
  /** 深入链接（可选） */
  learnMoreUrl?: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  // 采样参数
  temperature: {
    term: "温度（Temperature）",
    explanation:
      'AI 的"大胆程度"。温度低 = AI 总说最保险的话（没创意），温度高 = AI 可能说意外的话（有创意，但可能胡说）。',
    example:
      '问题："天气很____"\n\n温度 = 0（超保守）："热"（100% 确定）\n温度 = 0.7（正常）："热"（70%）或"好"（20%）\n温度 = 1.5（很大胆）："热"（30%）或"舒服"（25%）或其它奇怪的词',
    learnMoreUrl:
      "https://en.wikipedia.org/wiki/Softmax_function#Tempered_softmax",
  },

  top_p: {
    term: "Top-P（核采样）",
    explanation:
      "AI 考虑多少个候选答案。Top-P 低 = 只从最靠谱的词里选（稳），Top-P 高 = 可能选不太靠谱的词（野）。",
    example:
      'AI 脑子里有 100 个词：\n"好"（60%）"棒"（20%）"妙"（10%）..."糟糕"（0.001%）\n\nTop-P = 0.9：只看前 90% 概率的词（"好""棒""妙"），忽略不可能的词\n\n类比：去餐厅只看招牌菜（不踩雷） vs 看整个菜单（可能点到黑暗料理）',
    learnMoreUrl: "https://arxiv.org/abs/1904.09751",
  },

  seed: {
    term: "随机种子（Seed）",
    explanation:
      'AI 的"抽奖号码"。相同的种子 + 相同的设置 = 每次都得到完全一样的回答。',
    example:
      'Seed = 42，问"你好" → 每次都回答"你好，有什么可以帮助你的吗？"\nSeed = 随机，问"你好" → 可能回答"你好！""嗨！""您好"等不同版本\n\n用途：调试 AI 行为、复现 Bug、制作演示 Demo',
  },

  // 概率与统计
  probability: {
    term: "概率（Probability）",
    explanation:
      "AI 有多确定它选的这个词是对的。概率高 = 很确定，概率低 = 不太确定、在猜。",
    example:
      '问题："中国的首都是____"\n"北京"（概率 99.8%）← AI 非常确定\n"上海"（概率 0.1%）← AI 觉得不太可能\n"纽约"（概率 0.001%）← AI 几乎排除\n\n如果 AI 选中了概率只有 20% 的词，说明它在"冒险"或"犹豫"',
  },

  entropy: {
    term: "熵（Entropy）",
    explanation:
      'AI 的"纠结程度"。熵低 = AI 很确定选哪个词，熵高 = AI 在好几个选项之间犹豫不决。',
    example:
      '场景 1（低熵 = 不纠结）：\n"北京"（98%）"上海"（1%）"广州"（1%）\n熵 ≈ 0.1 nats（几乎没犹豫）\n\n场景 2（高熵 = 很纠结）：\n"可能"（30%）"也许"（28%）"或许"（25%）"大概"（17%）\n熵 ≈ 1.3 nats（选哪个都差不多）\n\n熵峰 = AI 最纠结的时刻，这些地方最有可能换个说法',
    learnMoreUrl: "https://en.wikipedia.org/wiki/Entropy_(information_theory)",
  },

  top_k: {
    term: "Top-K",
    explanation: 'AI 只考虑"最有可能的前 K 个词"，直接无视其余。',
    example:
      'AI 有 10000 个候选词，但 Top-K = 50 时，AI 只从概率最高的 50 个里选。\n\n这能避免 AI 说出非常离谱的词（比如在正经回答里突然蹦出"🦄独角兽"）。',
  },

  token: {
    term: "Token（词元）",
    explanation:
      'AI 眼中的"一块文字"。中文里通常 1 个 token = 1-2 个汉字，英文 1 个 token ≈ 0.75 个单词。',
    example:
      '"你好世界" → 可能被切成 ["你好", "世界"] (2 tokens)\n"Hello world" → 可能被切成 ["Hello", " world"] (2 tokens)\n"tokenization" → 可能被切成 ["token", "ization"] (2 tokens)\n\nAI 每次只生成 1 个 token，所以"写一句话"其实是"写很多个 token"。',
  },

  // 采样过程
  sampling: {
    term: "采样（Sampling）",
    explanation:
      'AI "抽奖选词"的过程。不是每次都选概率最高的，而是按概率随机抽，这样回答才不会千篇一律。',
    example:
      '10 次抽奖，候选是：\n"好"（70%）\n"棒"（20%）\n"妙"（10%）\n\n结果可能是：好、好、好、棒、好、好、妙、好、好、好（大约 7 次"好"）\n\n如果不采样、每次都选最高概率的词 → AI 的回答会完全一样、毫无变化。',
  },

  candidate: {
    term: "候选词（Candidate）",
    explanation:
      "AI 在选下一个词时，脑子里同时考虑的所有可能选项（通常显示概率最高的前几个）。",
    example:
      'AI 要填空："我很____"\n\n候选词可能是：\n1. "高兴"（45%）\n2. "开心"（30%）\n3. "快乐"（15%）\n4. "兴奋"（8%）\n5. 其余 9996 个词（2%）\n\nAI 最终从这些候选中按概率抽中一个。',
  },

  // 可视化概念
  trace: {
    term: "Trace（记录/轨迹）",
    explanation:
      'AI 生成回答的"完整录像"——记录了每一步选了什么词、有哪些候选、概率多少、花了多少时间。',
    example:
      '问："1+1=?"\n\nTrace 记录了：\n- Step 1: 选"1" (prob=0.99, dt=12ms)\n- Step 2: 选"+" (prob=0.95, dt=8ms)\n- Step 3: 选"1" (prob=0.98, dt=9ms)\n- Step 4: 选"=" (prob=0.92, dt=10ms)\n- Step 5: 选"2" (prob=0.99, dt=11ms)\n\n有了 Trace，你可以"回放"AI 的思考过程，看它为什么这么回答。',
  },

  hesitation: {
    term: "犹豫点（Hesitation Point）",
    explanation:
      "AI 差点选了另一个词的时刻——前两名候选的概率非常接近（差距 < 5%）。",
    example:
      'AI 在写："这个方案____"\n\n犹豫点：\n"可行"（48%）← 最终选中\n"合理"（47%）← 差点被选中\n差距仅 1%！\n\n如果重新运行，AI 很可能选"合理"而不是"可行"，导致后续回答完全不同。\n\n犹豫点 = AI 行为分叉的关键位置。',
  },

  topk_mass: {
    term: "Top-K Mass（集中度）",
    explanation:
      "前 K 个候选词的概率加起来有多少。集中度高 = AI 很笃定就在这几个里选，集中度低 = 概率很分散。",
    example:
      '场景 1（高集中度）：\n前 8 个候选加起来 = 99%\n说明 AI 几乎肯定会从这 8 个里选\n\n场景 2（低集中度）：\n前 8 个候选加起来 = 60%\n说明还有 40% 的概率在其它词上，AI 不太确定\n\n集中度 = 可视化图表中"亮度"的依据。',
  },

  // Agent 概念
  agent: {
    term: "Agent（智能体）",
    explanation:
      '会"自己规划、自己执行"的 AI。不只是回答问题，还能分步完成复杂任务（比如"帮我写个爬虫" → AI 自己分解成设计、编码、测试几步）。',
    example:
      '普通 AI："今天天气怎么样？" → "抱歉我不知道"\nAgent："今天天气怎么样？" → 自动调用天气 API → "北京今天晴，27°C"\n\nAgent = AI + 工具 + 规划能力',
  },

  rag: {
    term: "RAG（检索增强生成）",
    explanation: 'AI 先去"查资料"再回答，而不是靠记忆硬答。',
    example:
      '问："我们公司 2024 Q3 的营收是多少？"\n\n不用 RAG：AI 瞎猜或说"不知道"\n用 RAG：AI 先搜索公司财报文档 → 找到"2024 Q3 营收 850 万美元" → 据此回答\n\nRAG = 让 AI 能回答"它没被训练过的"特定信息。',
    learnMoreUrl: "https://arxiv.org/abs/2005.11401",
  },

  // 性能指标
  tokens_per_second: {
    term: "Tokens/s（推理速度）",
    explanation:
      'AI 每秒能生成多少个"词块"（token）。速度越快，回答出来得越快。',
    example:
      "速度 10 tokens/s：生成 100 字的回答需要 ~10 秒\n速度 50 tokens/s：生成同样内容只需要 ~2 秒\n\n影响因素：显卡性能、模型大小、是否用了优化技巧。\n\n集显通常 5-15 tokens/s，中端独显 20-50 tokens/s，高端显卡 50-150 tokens/s。",
  },

  prefill: {
    term: "Prefill（预填充）",
    explanation: "AI 处理你输入的问题的阶段（第一个词出来之前的等待时间）。",
    example:
      "你问了一个 500 字的长问题：\nPrefill 阶段：AI 读完整个问题，准备第一个词（可能等 2-5 秒）\nDecode 阶段：AI 一个词一个词地生成回答（每个词几十毫秒）\n\nPrefill 慢 = 首字延迟高（问题越长越慢），但不影响后续生成速度。",
  },

  decode: {
    term: "Decode（解码）",
    explanation: "AI 逐个生成答案词的阶段（你看到文字一个个蹦出来的过程）。",
    example:
      '回答"1+1=2"：\nDecode Step 1：生成"1"\nDecode Step 2：生成"+"\nDecode Step 3：生成"1"\nDecode Step 4：生成"="\nDecode Step 5：生成"2"\n\nDecode 速度 = tokens/s = 决定打字有多快。',
  },

  // WebGPU 相关
  webgpu: {
    term: "WebGPU",
    explanation:
      '浏览器里的"显卡加速 API"——让网页能直接调用你的 GPU 跑 AI 模型（不用装软件）。',
    example:
      '没有 WebGPU：AI 只能用 CPU 算（超慢，1-2 tokens/s）\n有 WebGPU：AI 用 GPU 算（快很多，10-100 tokens/s）\n\n类比：WebGPU = 浏览器里的"涡轮增压器"，专门用来跑计算密集的任务。\n\n支持的浏览器：Chrome 113+, Edge 113+, Firefox Nightly（实验性）',
    learnMoreUrl: "https://www.w3.org/TR/webgpu/",
  },

  wasm: {
    term: "WebAssembly (Wasm)",
    explanation:
      '浏览器里的"高性能代码格式"——能让 C++/Rust 写的程序在网页里跑，速度接近原生软件。',
    example:
      "AI 推理引擎用 C++ 写的（快），编译成 Wasm 后能在浏览器里跑，不用装任何软件。\n\nWasm + WebGPU = 本项目的技术基础（让浏览器能跑真正的 AI）。",
    learnMoreUrl: "https://webassembly.org/",
  },

  quantization: {
    term: "量化（Quantization）",
    explanation:
      '把 AI 模型"压缩"到更小的文件、占用更少的显存，代价是精度略微下降。',
    example:
      "原始模型：7B 参数 × 16-bit = 14GB（装不进普通显卡）\n量化到 4-bit：7B 参数 × 4-bit = 3.5GB（能跑了！）\n\n精度损失：通常 < 5%，肉眼几乎看不出区别。\n\n量化等级：\nQ8：最高精度（文件大，显存占用高）\nQ4：常用平衡点（本项目默认）\nQ2：最小文件（精度损失明显）",
    learnMoreUrl:
      "https://huggingface.co/docs/transformers/main/quantization",
  },

  // 模型架构
  transformer: {
    term: "Transformer",
    explanation:
      '现代 AI 语言模型的核心架构——能"同时看到整句话的所有词"，理解上下文关系。',
    example:
      '句子："银行"在"河边"还是"金融"意义上？\n\nTransformer 能看到整句话：\n"河边的银行" → 理解成"river bank"\n"去银行取钱" → 理解成"financial bank"\n\n老架构（RNN）只能一个词一个词看，容易理解错。',
    learnMoreUrl: "https://arxiv.org/abs/1706.03762",
  },

  attention: {
    term: "注意力机制（Attention）",
    explanation:
      'AI "决定关注句子里哪些词"的机制——类似人类阅读时会重点关注关键词。',
    example:
      '句子："小明的妈妈给他买了一个玩具"\n\n回答"谁买了玩具"时，AI 的注意力会集中在：\n"妈妈"（权重 0.8）← 主语\n"买"（权重 0.6）← 动词\n"玩具"（权重 0.3）← 宾语\n"小明""给""他"（权重 < 0.1）← 次要\n\n注意力 = AI 理解句子的"视线焦点"。',
    learnMoreUrl: "https://arxiv.org/abs/1706.03762",
  },

  embedding: {
    term: "嵌入/向量（Embedding）",
    explanation:
      "把文字转成一串数字，让 AI 能进行数学计算。语义相似的词，数字向量也相似。",
    example:
      '"国王" → [0.2, 0.8, -0.3, 0.5, ...]\n"王后" → [0.3, 0.7, -0.2, 0.6, ...] （和"国王"很接近）\n"苹果" → [-0.5, 0.1, 0.9, -0.4, ...] （和"国王"很远）\n\n用途：\n- 搜索相似文档\n- 推荐系统\n- RAG 检索',
    learnMoreUrl: "https://en.wikipedia.org/wiki/Word_embedding",
  },

  // 其他
  hallucination: {
    term: "幻觉（Hallucination）",
    explanation:
      'AI "一本正经地胡说八道"——编造不存在的事实、瞎编数据，但语气非常自信。',
    example:
      '问："莎士比亚的第 38 部剧作是什么？"\nAI："是《夏日哀歌》，创作于 1605 年"（← 完全瞎编，莎士比亚只有 37 部剧作）\n\n为什么会幻觉：\n- AI 没有"我不知道"的概念，被训练成"一定要给出答案"\n- 训练数据里可能有错误信息\n- 概率推理本质上是"猜测"，当缺乏确凿证据时容易编造\n\n如何减少幻觉：\n- 降低温度（让 AI 更保守）\n- 使用 RAG（让 AI 查资料而不是靠记忆）\n- 要求 AI 引用来源',
  },

  thinking: {
    term: "思考链（Chain of Thought / Thinking）",
    explanation:
      'AI 在给出最终答案前，先"自言自语"地推理一遍——就像人类做数学题时写草稿。',
    example:
      '问："23 × 17 = ?"\n\n不用思考链：\nAI 直接输出"391"（可能算错）\n\n用思考链：\n<think>\n23 × 17\n= 23 × (10 + 7)\n= 23 × 10 + 23 × 7\n= 230 + 161\n= 391\n</think>\n答案是 391\n\n思考链 = 让 AI 推理过程透明化，准确率更高。',
    learnMoreUrl: "https://arxiv.org/abs/2201.11903",
  },

  context_window: {
    term: "上下文窗口（Context Window）",
    explanation:
      'AI 一次能"记住"多少文字。超过这个长度，AI 会忘记前面的内容。',
    example:
      '小模型：上下文 2K tokens（约 1500 中文字）\n中等模型：上下文 8K tokens（约 6000 中文字）\n大模型：上下文 128K tokens（约 10 万中文字，能读完一本小说）\n\n超出限制后会怎样：\n- AI 只能看到最近的 N 个字\n- 更早的对话内容会被"遗忘"\n- 需要手动总结或分段处理',
  },
};

/**
 * 获取术语定义
 */
export function getGlossaryEntry(id: string): GlossaryEntry | undefined {
  return GLOSSARY[id];
}

/**
 * 检查术语是否存在
 */
export function hasGlossaryEntry(id: string): boolean {
  return id in GLOSSARY;
}

/**
 * 获取所有术语 ID
 */
export function getAllTermIds(): string[] {
  return Object.keys(GLOSSARY);
}
