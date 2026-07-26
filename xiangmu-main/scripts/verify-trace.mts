// M2 真实模型自测：用微型真模型跑通 TraceRecorder / TopPWarper / seed / 前缀重生成。
// 运行：npx tsx scripts/verify-trace.mts（需联网下载 tiny 测试模型，仅开发自测用，不进产品）
import {
  AutoTokenizer,
  AutoModelForCausalLM,
  TextStreamer,
  Tensor,
  random,
} from "@huggingface/transformers";
import { TopPWarper, TraceRecorder } from "../src/lib/logits";

const MODEL = "hf-internal-testing/tiny-random-LlamaForCausalLM";
const tokenizer = await AutoTokenizer.from_pretrained(MODEL);
const model = await AutoModelForCausalLM.from_pretrained(MODEL, {
  dtype: "fp32",
});

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
  if (!ok) failures++;
}

async function generate(opts: {
  seed: number;
  topP?: number;
  prefixIds?: number[];
  maxTokens?: number;
}) {
  random.seed(opts.seed);
  const recorder = new TraceRecorder(tokenizer);
  const processors = [];
  if (opts.topP !== undefined && opts.topP < 1)
    processors.push(new TopPWarper(opts.topP));
  processors.push(recorder);

  let inputs;
  if (opts.prefixIds) {
    const ids = BigInt64Array.from(opts.prefixIds.map((n) => BigInt(n)));
    const dims = [1, opts.prefixIds.length];
    inputs = {
      input_ids: new Tensor("int64", ids, dims),
      attention_mask: new Tensor(
        "int64",
        BigInt64Array.from(opts.prefixIds.map(() => 1n)),
        dims,
      ),
    };
  } else {
    inputs = tokenizer("The sky is blue because");
  }

  const streamedIds: number[] = [];
  const streamer = new TextStreamer(tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    token_callback_function: (ids: bigint[] | number[]) => {
      const id = Number(ids[ids.length - 1]);
      streamedIds.push(id);
      recorder.onToken(id);
    },
  });

  const out = (await model.generate({
    ...inputs,
    do_sample: true,
    temperature: 0.9,
    max_new_tokens: opts.maxTokens ?? 12,
    logits_processor: processors,
    streamer,
    return_dict_in_generate: true,
  } as Parameters<typeof model.generate>[0])) as unknown as {
    sequences: { tolist(): bigint[][] };
  };
  const seq = out.sequences.tolist()[0].map(Number);
  const promptLen = opts.prefixIds
    ? opts.prefixIds.length
    : (inputs.input_ids as Tensor).dims[1];
  const genIds = seq.slice(promptLen as number);
  return { recorder, streamedIds, genIds };
}

// 1) 基础生成：首 token 不抛错（此前 decode([]) 会抛 token_ids must be non-empty）
const a = await generate({ seed: 42 });
check("首 token 不抛错、生成完成", a.genIds.length > 0);
check(
  "记录步数 == 生成 token 数",
  a.recorder.steps.length === a.genIds.length,
  `${a.recorder.steps.length} vs ${a.genIds.length}`,
);
check(
  "记录的 id 与最终序列逐一相等",
  a.recorder.steps.every((s, i) => s.id === a.genIds[i]),
);
check(
  "每步熵为有限正数",
  a.recorder.steps.every((s) => Number.isFinite(s.entropy) && s.entropy >= 0),
);
check(
  "每步 top-k 概率降序且和≤1",
  a.recorder.steps.every((s) => {
    let last = Infinity;
    let sum = 0;
    for (const c of s.topk) {
      if (c.prob > last) return false;
      last = c.prob;
      sum += c.prob;
    }
    return sum <= 1.000001;
  }),
);
check(
  "窗口差分解码拼接 == 整段解码",
  a.recorder.steps.map((s) => s.text).join("") ===
    tokenizer.decode(a.genIds, { skip_special_tokens: false }),
);

// 2) seed 可复现
const b = await generate({ seed: 42 });
const c = await generate({ seed: 7 });
check(
  "同 seed 序列一致",
  JSON.stringify(a.genIds) === JSON.stringify(b.genIds),
);
check(
  "不同 seed 序列不同",
  JSON.stringify(a.genIds) !== JSON.stringify(c.genIds),
);

// 3) TopPWarper 裁剪正确性：合成分布直接验证保留集
//    softmax([3,2,1,0,-5]) ≈ [0.657, 0.242, 0.089, 0.033, 0.0002]
//    p=0.85 → 保留累计到 0.85 的最小集 = 前 2 个，其余置 -Inf
{
  const logits = new Tensor(
    "float32",
    Float32Array.from([3, 2, 1, 0, -5]),
    [1, 5],
  );
  new TopPWarper(0.85)._call([], logits);
  const row = Array.from(logits.data as Float32Array);
  check(
    "TopP(0.85) 保留前 2 个候选",
    row[0] === 3 && row[1] === 2,
    JSON.stringify(row),
  );
  check(
    "TopP(0.85) 其余置 -Inf",
    row.slice(2).every((v) => v === -Infinity),
    JSON.stringify(row),
  );
}
// 真实模型路径：带 TopP 的生成中选中 token 必在保留集内（prob > 0）
const d = await generate({ seed: 42, topP: 0.5 });
check(
  "Top-P 裁剪后选中 token 必在保留集内（prob > 0）",
  d.recorder.steps.every((s) => (s.prob ?? 0) > 0),
);

// 4) 前缀重生成（分岔路径）：prompt ids + 已生成 ids + 强制词
const promptIds = Array.from(
  (tokenizer("The sky is blue because").input_ids.data as BigInt64Array),
  Number,
);
const forced = a.recorder.steps[2].topk.find((t) => t.id !== a.genIds[2]);
const prefix = [...promptIds, ...a.genIds.slice(0, 2), forced!.id];
const e = await generate({ seed: 99, prefixIds: prefix, maxTokens: 8 });
check("前缀重生成产出新 token", e.genIds.length > 0);
check(
  "重生成记录与序列配对",
  e.recorder.steps.length === e.genIds.length &&
    e.recorder.steps.every((s, i) => s.id === e.genIds[i]),
);

console.log(failures === 0 ? "\nALL GREEN" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
