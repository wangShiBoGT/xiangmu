import { useEffect, useRef, useState } from "react";
import { IconChevronDown, IconCheck, IconClose, IconPlus } from "./icons";
import Dropdown from "./Dropdown";
import {
  MODELS,
  addCustomModel,
  formatSize,
  getCustomModels,
  getModel,
  loadCustomModels,
  removeCustomModel,
  type ModelDtype,
} from "../lib/models";
import { modelUsable, type DeviceReport } from "../lib/device";

interface Props {
  report: DeviceReport | null;
  current: string;
  recommendedId: string | null;
  disabled: boolean;
  onChange: (id: string) => void;
  /** 自定义模型增删后通知（App 据此把列表同步给 worker） */
  onCustomChange: () => void;
}

const GROUPS = [
  { label: "内置模型", hint: "免公网下载", builtin: true },
  { label: "在线模型", hint: "选择后下载并缓存", builtin: false },
];

export default function ModelSelect({
  report,
  current,
  recommendedId,
  disabled,
  onChange,
  onCustomChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [customs, setCustoms] = useState(() => loadCustomModels());
  const [adding, setAdding] = useState(false);
  const [draftId, setDraftId] = useState("");
  const [draftThinking, setDraftThinking] = useState(false);
  const [draftExternal, setDraftExternal] = useState(false);
  const [draftDtype, setDraftDtype] = useState<ModelDtype | "">("");
  const [addError, setAddError] = useState<string | null>(null);

  const submitCustom = () => {
    try {
      const model = addCustomModel({
        id: draftId,
        thinking: draftThinking,
        externalData: draftExternal,
        dtype: draftDtype || null,
      });
      setCustoms([...getCustomModels()]);
      setAddError(null);
      setDraftId("");
      setDraftThinking(false);
      setDraftExternal(false);
      setDraftDtype("");
      setAdding(false);
      onCustomChange();
      setOpen(false);
      onChange(model.id);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : String(e));
    }
  };

  const deleteCustom = (id: string) => {
    removeCustomModel(id);
    setCustoms([...getCustomModels()]);
    onCustomChange();
  };

  useEffect(() => {
    if (!open) return;

    // 延迟注册点击外部关闭事件，避免立即触发
    const timeoutId = setTimeout(() => {
      const onDown = (e: MouseEvent) => {
        if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setOpen(false);
      };
      document.addEventListener("mousedown", onDown);
      document.addEventListener("keydown", onKey);

      // 返回清理函数
      return () => {
        document.removeEventListener("mousedown", onDown);
        document.removeEventListener("keydown", onKey);
      };
    }, 100); // 100ms 延迟，足够让鼠标移动到菜单上

    return () => {
      clearTimeout(timeoutId);
    };
  }, [open]);

  const currentModel = getModel(current);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="选择模型"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] text-ink-2 hover:bg-hover hover:text-ink focus:outline-none disabled:opacity-50 cursor-pointer transition-colors"
      >
        <span className="truncate max-w-44">
          {currentModel ? currentModel.name : "选择模型"}
        </span>
        <IconChevronDown
          className={`h-2.5 w-2.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="模型列表"
          className="absolute right-0 top-full z-50 mt-2 max-h-[min(560px,calc(100vh-120px))] w-72 overflow-y-auto overscroll-contain rounded-md bg-surface p-1.5 shadow-float"
        >
          {GROUPS.map((group, gi) => (
            <div key={group.label}>
              <div
                className={`flex items-baseline gap-2 px-2.5 pb-1.5 ${gi === 0 ? "pt-2" : "pt-3"}`}
              >
                <span className="text-[12px] font-medium text-ink-2">
                  {group.label}
                </span>
                <span className="text-[11px] text-ink-3">{group.hint}</span>
              </div>
              {MODELS.filter((m) => m.builtin === group.builtin).map((m) => {
                const usable = report ? modelUsable(report, m) : true;
                const size =
                  report && !report.webgpu ? m.sizeWasm : m.sizeWebgpu;
                const selected = m.id === current;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={!usable}
                    onClick={() => {
                      setOpen(false);
                      if (!selected) onChange(m.id);
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors ${
                      usable
                        ? "cursor-pointer hover:bg-hover"
                        : "cursor-not-allowed opacity-45"
                    } ${selected ? "bg-wash" : ""}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] text-ink">
                          {m.name}
                        </span>
                        {m.id === recommendedId && (
                          <span className="shrink-0 rounded-md bg-accent px-1.5 py-px text-[11px] leading-4 text-white">
                            推荐
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-ink-3">
                        {m.vendor} · {formatSize(size)}
                        {!m.builtin ? " · 需下载" : ""}
                        {!usable ? " · 本机不可用" : ""}
                      </span>
                    </span>
                    {selected && (
                      <IconCheck className="h-3.5 w-3.5 shrink-0 text-ink" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          <div>
            <div className="flex items-baseline gap-2 px-2.5 pb-1.5 pt-3">
              <span className="text-[12px] font-medium text-ink-2">
                自定义模型
              </span>
              <span className="text-[11px] text-ink-3">
                任意 HuggingFace ONNX 模型 ID
              </span>
            </div>
            {customs.map((m) => {
              const selected = m.id === current;
              return (
                <div
                  key={m.id}
                  className={`group flex w-full items-center gap-2 rounded-md px-2.5 py-2 ${
                    selected ? "bg-wash" : "hover:bg-hover"
                  }`}
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      setOpen(false);
                      if (!selected) onChange(m.id);
                    }}
                    className="min-w-0 flex-1 cursor-pointer text-left"
                  >
                    <span className="block truncate text-[13px] text-ink">
                      {m.name}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-ink-3">
                      {m.id} · 需下载 · 大小未知
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`删除 ${m.name}`}
                    title="从列表中移除（不影响已下载的缓存）"
                    className="shrink-0 rounded-md p-1 text-ink-3 opacity-0 transition-opacity hover:text-ink group-hover:opacity-100"
                    onClick={() => deleteCustom(m.id)}
                  >
                    <IconClose className="h-[13px] w-[13px]" />
                  </button>
                </div>
              );
            })}
            {adding ? (
              <div className="rounded-md px-2.5 py-2">
                <input
                  autoFocus
                  className="w-full rounded-md border border-line bg-paper px-2.5 py-1.5 font-mono text-[12px] text-ink placeholder:text-ink-3 focus:outline-none"
                  placeholder="org/name，如 onnx-community/Qwen3-0.6B-ONNX"
                  value={draftId}
                  onChange={(e) => setDraftId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitCustom();
                  }}
                />
              <div className="mt-2 flex items-center gap-3 text-[11px] text-ink-2">
                  <label className="flex cursor-pointer items-center gap-1.5">
                    <input
                      type="checkbox"
                      className="accent-accent"
                      checked={draftThinking}
                      aria-label="支持推理标签"
                      onChange={(e) => setDraftThinking(e.target.checked)}
                    />
                    支持 &lt;think&gt;
                  </label>
                  <label className="flex cursor-pointer items-center gap-1.5">
                    <input
                      type="checkbox"
                      className="accent-accent"
                      checked={draftExternal}
                      aria-label="external_data"
                      onChange={(e) => setDraftExternal(e.target.checked)}
                    />
                    external_data
                  </label>
                  <Dropdown
                    options={[
                      { value: "", label: "dtype: auto" },
                      { value: "fp16", label: "fp16" },
                      { value: "int4", label: "int4" },
                      { value: "q4", label: "q4" },
                      { value: "q4f16", label: "q4f16" },
                    ]}
                    selected={draftDtype}
                    onChange={(v) => setDraftDtype(v as ModelDtype | "")}
                    ariaLabel="数据类型"
                  />
                </div>
                    <input
                      type="checkbox"
                      checked={draftThinking}
                      onChange={(e) => setDraftThinking(e.target.checked)}
                    />
                    思考模型（输出 &lt;think&gt;）
                  </label>
                  <label className="flex cursor-pointer items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={draftExternal}
                      onChange={(e) => setDraftExternal(e.target.checked)}
                    />
                    外部权重（.onnx_data）
                  </label>
                </div>
                <label className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-2">
                  权重精度
                  <Dropdown
                    ariaLabel="权重精度"
                    tone="paper"
                    menuWidthClassName="w-52"
                    value={draftDtype}
                    onChange={(v) => setDraftDtype(v as ModelDtype | "")}
                    options={[
                      { value: "", label: "自动", hint: "WebGPU=q4f16 / CPU=q4" },
                      { value: "q4", label: "q4" },
                      { value: "q4f16", label: "q4f16" },
                      { value: "fp16", label: "fp16" },
                      { value: "int8", label: "int8" },
                      { value: "uint8", label: "uint8" },
                      { value: "fp32", label: "fp32" },
                    ]}
                  />
                  <span className="text-ink-3">输出乱码时改选 q4 / fp16</span>
                </label>
                {addError && (
                  <p className="mt-1.5 text-[11px] text-red-500">{addError}</p>
                )}
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="rounded-md bg-accent px-2.5 py-1 text-[12px] text-white hover:opacity-85 disabled:opacity-50"
                    disabled={!draftId.trim()}
                    onClick={submitCustom}
                  >
                    添加并加载
                  </button>
                  <button
                    type="button"
                    className="rounded-md px-2.5 py-1 text-[12px] text-ink-2 hover:bg-hover"
                    onClick={() => {
                      setAdding(false);
                      setAddError(null);
                    }}
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-2 text-[13px] text-ink-2 transition-colors hover:bg-hover hover:text-ink"
                onClick={() => setAdding(true)}
              >
                <IconPlus className="h-3 w-3" />
                导入模型…
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
