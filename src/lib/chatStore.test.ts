import { describe, it, expect } from "vitest";
import {
  loadSessions,
  saveSessions,
  createSession,
  titleFromMessage,
  loadParams,
  saveParams,
  clamp,
  DEFAULT_PARAMS,
} from "./chatStore";

describe("chatStore 会话持久化", () => {
  it("初始为空列表", () => {
    expect(loadSessions()).toEqual([]);
  });

  it("保存后可读回", () => {
    const s = createSession();
    s.messages.push({ role: "user", content: "hi" });
    saveSessions([s]);
    const loaded = loadSessions();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe(s.id);
    expect(loaded[0].messages[0]).toEqual({ role: "user", content: "hi" });
  });

  it("损坏的 JSON 不抛异常，返回空列表", () => {
    localStorage.setItem("webgpu-llm-chat.sessions.v1", "{bad json");
    expect(loadSessions()).toEqual([]);
  });

  it("非法结构被过滤", () => {
    localStorage.setItem(
      "webgpu-llm-chat.sessions.v1",
      JSON.stringify([{ id: 1 }, null, { id: "ok", messages: [] }]),
    );
    const loaded = loadSessions();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe("ok");
  });

  it("createSession 生成唯一 id", () => {
    const ids = new Set(Array.from({ length: 50 }, () => createSession().id));
    expect(ids.size).toBe(50);
  });
});

describe("titleFromMessage", () => {
  it("取首行并截断", () => {
    expect(titleFromMessage("你好\n第二行")).toBe("你好");
    expect(titleFromMessage("a".repeat(30))).toBe("a".repeat(20) + "…");
    expect(titleFromMessage("   ")).toBe("新对话");
  });
});

describe("生成参数持久化与边界", () => {
  it("默认参数", () => {
    expect(loadParams()).toEqual(DEFAULT_PARAMS);
  });

  it("保存后读回", () => {
    saveParams({ maxTokens: 512, temperature: 0.7, topP: 0.9, chineseOnly: false });
    expect(loadParams()).toEqual({
      maxTokens: 512,
      temperature: 0.7,
      topP: 0.9,
      chineseOnly: false,
    });
  });

  it("越界值被夹紧到合法区间", () => {
    localStorage.setItem(
      "webgpu-llm-chat.params.v1",
      JSON.stringify({ maxTokens: 999999, temperature: -5, topP: 3 }),
    );
    // 旧版本存的参数无 chineseOnly 字段，读回时按默认开启
    expect(loadParams()).toEqual({
      maxTokens: 8192,
      temperature: 0,
      topP: 1,
      chineseOnly: true,
    });
  });

  it("clamp 处理 NaN", () => {
    expect(clamp(NaN, 1, 10)).toBe(1);
    expect(clamp(5, 1, 10)).toBe(5);
    expect(clamp(100, 1, 10)).toBe(10);
  });
});
