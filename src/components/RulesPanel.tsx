import { useRef, useState } from "react";
import {
  CORE_RULES,
  validateRuleset,
  type Rule,
} from "../lib/rules";
import { exportRulePack, parseRulePack } from "../lib/rulePack";
import { RULE_PACK_CATALOG } from "../lib/rulePackCatalog";
import { Drawer } from "./Overlay";

/** 规则设置面板：Core Rules 开关与阈值可调 + 自定义 JSON 规则（即时校验）+ 规则包导出/导入（D4 V1，零新 DSL）。
 *  规则是纯函数确定性触发，无 AI 参与——每条标注点开必带规则 ID、阈值与实际值。 */
export default function RulesPanel({
  rules,
  onChange,
  onClose,
}: {
  rules: Rule[];
  onChange: (rules: Rule[]) => void;
  onClose: () => void;
}) {
  const [jsonOpen, setJsonOpen] = useState(false);
  const [jsonText, setJsonText] = useState(() => JSON.stringify(rules, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [packName, setPackName] = useState("我的规则集");
  const [importNote, setImportNote] = useState<string | null>(null);
  const [previewPack, setPreviewPack] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // E1 一键导入目录包：只改本地规则集，无任何上传
  const importCatalogPack = (packId: string) => {
    const pack = RULE_PACK_CATALOG.find((p) => p.id === packId);
    if (!pack) return;
    const merged = structuredClone(pack.rules);
    onChange(merged);
    setJsonText(JSON.stringify(merged, null, 2));
    setJsonError(null);
    setToast(`已导入「${pack.name}」（${pack.rules.length} 条规则，仅存本地）`);
    window.setTimeout(() => setToast(null), 3200);
  };

  const setRule = (id: string, patch: Partial<Rule>) => {
    const next = rules.map((r) => (r.id === id ? { ...r, ...patch } : r));
    onChange(next);
    setJsonText(JSON.stringify(next, null, 2));
  };

  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const err = validateRuleset(parsed);
      if (err) {
        setJsonError(err);
        return;
      }
      setJsonError(null);
      onChange(parsed as Rule[]);
    } catch {
      setJsonError("不是有效的 JSON");
    }
  };

  const exportRules = () => {
    const blob = new Blob([exportRulePack(packName, "1", rules)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${packName.trim() || "rules"}.rulepack.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importRules = async (file: File) => {
    const r = parseRulePack(await file.text());
    if ("error" in r) {
      setImportNote(`导入失败：${r.error}`);
      return;
    }
    onChange(r.rules);
    setJsonText(JSON.stringify(r.rules, null, 2));
    setJsonError(null);
    setImportNote(`已导入：${r.label}（${r.rules.length} 条规则）`);
  };

  const resetCore = () => {
    onChange(structuredClone(CORE_RULES));
    setJsonText(JSON.stringify(CORE_RULES, null, 2));
    setJsonError(null);
  };

  return (
    <Drawer title="Annotation Rules · 标注规则" width={560} onClose={onClose}>
      <div className="space-y-1.5 p-5">
          <p className="mb-3 text-[13px] leading-relaxed text-obs-ink2">
            规则 = 条件 + 标注，作用在真实 trace 上，纯函数确定性触发，无 AI
            参与。命中处正文加下划线，点开出生卡可见规则 ID、阈值与实际值。
          </p>
          {rules.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-md border border-obs-line bg-obs-2 px-3.5 py-2.5"
            >
              <input
                type="checkbox"
                aria-label={`启用 ${r.id}`}
                className="h-3.5 w-3.5 shrink-0 accent-indigo-400"
                checked={r.enabled}
                onChange={() => setRule(r.id, { enabled: !r.enabled })}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-obs-ink">
                  {r.annotate.label}
                  <span
                    className={`ml-2 text-[11px] uppercase ${
                      r.annotate.severity === "warn"
                        ? "text-amber-300/80"
                        : "text-obs-ink2/80"
                    }`}
                  >
                    {r.annotate.severity}
                  </span>
                </p>
                <p className="mt-0.5 truncate font-mono text-[11px] text-obs-ink2/80">
                  {r.id}
                  {r.ngram && ` · ${r.ngram.n}-gram ×${r.ngram.times}`}
                  {r.window && ` · 连续 ${r.window.size} 步`}
                </p>
              </div>
              {r.when.map((c, ci) => (
                <label
                  key={ci}
                  className="flex shrink-0 items-center gap-1 font-mono text-[11px] text-obs-ink2"
                >
                  {c.field} {c.op}
                  <input
                    type="number"
                    step="any"
                    className="w-16 rounded-md border border-obs-line bg-obs px-1.5 py-0.5 text-right text-[12px] text-obs-ink focus:outline-none focus:border-obs-ink2"
                    value={c.value}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (!Number.isFinite(v)) return;
                      setRule(r.id, {
                        when: r.when.map((cc, j) =>
                          j === ci ? { ...cc, value: v } : cc,
                        ),
                      });
                    }}
                  />
                </label>
              ))}
            </div>
          ))}

          <div className="flex items-center gap-3 pt-3 text-[12px]">
            <button
              className="text-obs-ink2 underline underline-offset-2 hover:text-obs-ink transition-colors"
              onClick={() => setJsonOpen((v) => !v)}
            >
              {jsonOpen ? "收起 JSON 编辑器" : "自定义规则（JSON 编辑器）"}
            </button>
            <input
              aria-label="规则包名称"
              className="w-28 rounded-md border border-obs-line bg-obs px-2 py-0.5 text-[12px] text-obs-ink focus:outline-none focus:border-obs-ink2"
              value={packName}
              onChange={(e) => setPackName(e.target.value)}
            />
            <button
              className="text-obs-ink2 underline underline-offset-2 hover:text-obs-ink transition-colors"
              onClick={exportRules}
            >
              导出规则包
            </button>
            <button
              className="text-obs-ink2 underline underline-offset-2 hover:text-obs-ink transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              导入规则包
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              aria-label="导入规则包文件"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importRules(f);
                e.target.value = "";
              }}
            />
            <button
              className="text-obs-ink2 underline underline-offset-2 hover:text-obs-ink transition-colors"
              onClick={resetCore}
            >
              恢复 Core Rules 默认
            </button>
          </div>
          {importNote && (
            <p className="text-[12px] text-obs-ink2">{importNote}</p>
          )}

          {/* E1 规则包目录：静态随构建内置，无后端无假社区 */}
          <div className="mt-4 rounded-md border border-obs-line bg-obs-2/60 p-3.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-obs-ink2/70 select-none">
              Rule Pack Catalog · 内置规则包目录
            </p>
            <p className="mt-1 text-[12px] leading-[1.7] text-obs-ink2/80">
              官方校准过的规则包，随构建内置、全部本地运行，不上传任何数据。
              想分享自己的规则：导出文件发给别人，或向仓库 community-packs 目录提交。
            </p>
            <ul className="mt-2 space-y-1.5">
              {RULE_PACK_CATALOG.map((p) => (
                <li
                  key={p.id}
                  className="rounded-md border border-obs-line bg-obs px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] text-obs-ink">
                        {p.name}
                        <span className="ml-2 font-mono text-[11px] text-obs-ink2/70">
                          v{p.version} · {p.rules.length} 条
                        </span>
                      </p>
                      <p className="mt-0.5 text-[12px] text-obs-ink2">
                        {p.description}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        className="text-[12px] text-obs-ink2 underline underline-offset-2 transition-colors hover:text-obs-ink"
                        aria-expanded={previewPack === p.id}
                        onClick={() =>
                          setPreviewPack((v) => (v === p.id ? null : p.id))
                        }
                      >
                        {previewPack === p.id ? "收起" : "预览"}
                      </button>
                      <button
                        className="rounded-md border border-obs-line px-2.5 py-1 text-[12px] text-obs-ink2 transition-colors hover:border-indigo-400/60 hover:text-obs-ink"
                        onClick={() => importCatalogPack(p.id)}
                      >
                        导入此包
                      </button>
                    </div>
                  </div>
                  {previewPack === p.id && (
                    <div className="mt-2 border-t border-obs-line/60 pt-2">
                      {p.rules.map((r) => (
                        <p
                          key={r.id}
                          className="font-mono text-[11px] leading-[1.9] text-obs-ink2"
                        >
                          {r.id} · {r.annotate.label} ·{" "}
                          {r.ngram
                            ? `${r.ngram.n}-gram ×${r.ngram.times}`
                            : r.when
                                .map((c) => `${c.field} ${c.op} ${c.value}`)
                                .join(" 且 ")}
                        </p>
                      ))}
                      <p className="mt-1 text-[11px] text-obs-ink2/70">
                        校准：{p.calibration}
                      </p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
          {toast && (
            <div
              role="status"
              className="pointer-events-none fixed top-6 left-1/2 z-50 -translate-x-1/2 rounded-md border border-obs-line bg-obs-2 px-4 py-2 text-[12px] text-obs-ink shadow-float"
            >
              {toast}
            </div>
          )}

          {jsonOpen && (
            <div className="pt-2">
              <textarea
                className="h-56 w-full resize-y rounded-md border border-obs-line bg-obs-2 p-3 font-mono text-[12px] leading-relaxed text-obs-ink focus:outline-none focus:border-obs-ink2"
                spellCheck={false}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
              />
              {jsonError && (
                <p className="mt-1 text-[12px] text-red-400">{jsonError}</p>
              )}
              <button
                className="mt-2 rounded-md border border-obs-line px-3.5 py-1.5 text-[12px] text-obs-ink2 hover:text-obs-ink hover:border-obs-ink2 transition-colors"
                onClick={applyJson}
              >
                校验并应用
              </button>
              <p className="mt-2 text-[12px] leading-relaxed text-obs-ink2/70">
                字段：entropy / prob / dt / rank / topProb / dtMedianRatio；scope：step（单步）、window（连续
                N 步全满足）、trace（ngram 复读检测）。导出 Replay 时当前规则集会随
                annotationsRuleset 字段一起带走。
              </p>
            </div>
          )}
      </div>
    </Drawer>
  );
}
