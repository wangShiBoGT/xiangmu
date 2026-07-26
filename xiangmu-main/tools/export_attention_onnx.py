# 理解层演示模型 · 带注意力输出的 ONNX 导出（已于 2026-07-25 云端实测跑通）
#
# 用途：四幕旅程「现场跑用户自己的问题」时需要浏览器内实时注意力，
# 用本脚本把小模型导出为 logits + attn.0..N 多输出 ONNX。
# 当前旅程 v1 使用离线预生成的 journey.zh/en.json（同模型真实数据），
# 只有做「现场实验」升级时才需要真的部署本导出产物。
#
# 依赖：pip install torch transformers onnxscript onnxruntime
# 关键点：
#   1. attn_implementation="eager"（sdpa 不支持 output_attentions）
#   2. 新 dynamo exporter + opset 18（旧 exporter 在 aten::diff 处失败）
#   3. 中文模型同为 GPT-2 架构，同一脚本直接复用
#
# 用法：python export_attention_onnx.py distilgpt2 out_en.onnx
#       python export_attention_onnx.py uer/gpt2-distil-chinese-cluecorpussmall out_zh.onnx
import sys

import torch
from transformers import AutoTokenizer, GPT2LMHeadModel


class WithAttentions(torch.nn.Module):
    def __init__(self, model: GPT2LMHeadModel) -> None:
        super().__init__()
        self.model = model

    def forward(self, input_ids: torch.Tensor):
        out = self.model(input_ids, output_attentions=True, use_cache=False)
        return (out.logits, *out.attentions)


def main(model_id: str, out_path: str) -> None:
    model = GPT2LMHeadModel.from_pretrained(model_id, attn_implementation="eager")
    model.eval()
    tok = AutoTokenizer.from_pretrained(model_id)
    ids = tok("hello world", return_tensors="pt").input_ids
    n = model.config.n_layer
    torch.onnx.export(
        WithAttentions(model),
        (ids,),
        out_path,
        input_names=["input_ids"],
        output_names=["logits"] + [f"attn.{i}" for i in range(n)],
        dynamic_shapes={"input_ids": {0: "b", 1: "seq"}},
        opset_version=18,
        dynamo=True,
    )
    print(f"exported {out_path}: logits + {n} attention layers")
    print("发布前请做 int8 量化（onnxruntime.quantization）以降到 ~80MB 级")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
