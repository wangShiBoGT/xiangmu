import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

// 模拟推理 Worker：load → ready；generate → start/update*/complete
class FakeWorker {
  static instances: FakeWorker[] = [];
  /** 这些模型 id 的 load 会失败，用于验证自动降级 */
  static failModels = new Set<string>();
  listeners: { type: string; fn: (e: MessageEvent) => void }[] = [];
  interrupted = false;
  loadedModels: string[] = [];

  constructor() {
    FakeWorker.instances.push(this);
  }

  addEventListener(type: string, fn: (e: MessageEvent) => void) {
    this.listeners.push({ type, fn });
  }
  removeEventListener(type: string, fn: (e: MessageEvent) => void) {
    this.listeners = this.listeners.filter(
      (l) => l.fn !== fn || l.type !== type,
    );
  }
  emit(data: unknown) {
    this.listeners
      .filter((l) => l.type === "message")
      .forEach((l) => l.fn({ data } as MessageEvent));
  }

  // 真实 Worker 的消息是异步送达的，用宏任务模拟
  postMessage(msg: { type: string; data?: unknown }) {
    setTimeout(() => this.handle(msg), 0);
  }

  handle(msg: { type: string; data?: unknown }) {
    if (msg.type === "load") {
      const modelId = (msg.data as { modelId?: string } | undefined)?.modelId ?? "";
      this.loadedModels.push(modelId);
      if (FakeWorker.failModels.has(modelId)) {
        this.emit({ status: "error", data: "内存不足" });
        return;
      }
      this.emit({ status: "loading", data: "正在加载模型..." });
      this.emit({ status: "initiate", file: "model.onnx", progress: 0, total: 100 });
      this.emit({ status: "progress", file: "model.onnx", progress: 50, total: 100 });
      this.emit({ status: "done", file: "model.onnx" });
      this.emit({ status: "ready", device: "webgpu" });
    } else if (msg.type === "generate") {
      this.emit({ status: "start" });
      this.emit({ status: "update", output: "<think>思考</think>", tps: 10, numTokens: 4 });
      this.emit({ status: "update", output: "回答内容", tps: 12, numTokens: 8 });
      this.emit({ status: "complete", output: [""] });
    } else if (msg.type === "interrupt") {
      this.interrupted = true;
    }
  }
  terminate() {}
}

vi.stubGlobal("Worker", FakeWorker);

import App from "./App";

beforeEach(() => {
  FakeWorker.instances = [];
  FakeWorker.failModels = new Set();
  localStorage.clear();
});

/** 新入口流程：不自动下载——打开模型选择、知情点选某个模型后才开始加载，
 *  就绪后自动进入工作台（默认实验台），再切到「对话」 */
async function enterApp(modelName: RegExp = /Qwen3 0\.6B/) {
  fireEvent.click(await screen.findByRole("button", { name: /用自己的模型跑/ }));
  fireEvent.click(await screen.findByRole("button", { name: modelName }));
  fireEvent.click(await screen.findByRole("button", { name: "对话" }));
}

describe("App 全链路（模拟 Worker）", () => {
  it("知情选择模型 → 加载就绪 → 发送消息 → 流式回复 → 历史持久化", async () => {
    render(<App />);

    // 不自动下载：用户在首屏选择模型后才加载，就绪后进入对话界面
    await enterApp();
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/问任何问题/)).toBeInTheDocument(),
    );

    // 发送消息
    fireEvent.change(screen.getByPlaceholderText(/问任何问题/), {
      target: { value: "什么是WebGPU" },
    });
    fireEvent.click(screen.getByLabelText("发送"));

    // 用户消息与助手流式回复渲染
    await waitFor(() => {
      expect(screen.getByTestId("msg-user")).toHaveTextContent("什么是WebGPU");
      expect(screen.getByTestId("answer")).toHaveTextContent("回答内容");
    });
    // 生成结束后思考胶囊默认收起，点击展开
    fireEvent.click(screen.getByText(/推理段（<think> 输出）/));
    expect(screen.getByTestId("thinking")).toHaveTextContent("思考");

    // 会话已持久化到 localStorage，标题取自首条消息
    const stored = JSON.parse(
      localStorage.getItem("webgpu-llm-chat.sessions.v1")!,
    );
    expect(stored).toHaveLength(1);
    expect(stored[0].title).toBe("什么是WebGPU");
    expect(stored[0].messages).toHaveLength(2);
    expect(stored[0].messages[1].content).toContain("回答内容");
  });

  it("新对话/删除会话/侧边栏切换", async () => {
    render(<App />);
    await enterApp();
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/问任何问题/)).toBeInTheDocument(),
    );

    // 发一条消息形成会话
    fireEvent.change(screen.getByPlaceholderText(/问任何问题/), {
      target: { value: "第一个问题" },
    });
    fireEvent.click(screen.getByLabelText("发送"));
    // 等待本轮生成完全结束（发送按钮重新出现）再切换会话
    await waitFor(() => expect(screen.getByTestId("answer")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByLabelText("发送")).toBeInTheDocument());

    // 新对话
    fireEvent.click(screen.getByText("新对话"));
    expect(screen.queryByTestId("msg-user")).toBeNull();

    // 侧边栏切回旧会话
    fireEvent.click(screen.getByTitle("第一个问题"));
    expect(screen.getByTestId("msg-user")).toHaveTextContent("第一个问题");

    // 删除该会话（点击对应会话项内的删除按钮）
    const item = screen.getByTitle("第一个问题");
    fireEvent.click(item.querySelector('[aria-label="删除会话"]')!);
    await waitFor(() => expect(screen.queryByTitle("第一个问题")).toBeNull());
  });

  it("设置面板可调参数并持久化", async () => {
    render(<App />);
    await enterApp();
    await waitFor(() => expect(screen.getByText("设置")).toBeInTheDocument());

    fireEvent.click(screen.getByText("设置"));
    const sliders = screen.getAllByRole("slider");
    fireEvent.change(sliders[0], { target: { value: "1024" } });

    const params = JSON.parse(localStorage.getItem("webgpu-llm-chat.params.v1")!);
    expect(params.maxTokens).toBe(1024);
  });

  it("无 WebGPU 环境默认推荐 0.6B，可切换模型并持久化", async () => {
    render(<App />);
    await enterApp();
    await waitFor(() =>
      expect(screen.getByLabelText("选择模型")).toBeInTheDocument(),
    );
    const trigger = screen.getByLabelText("选择模型");
    // jsdom 无 navigator.gpu → tier1，推荐 Qwen3 0.6B
    expect(trigger).toHaveTextContent("Qwen3 0.6B");

    fireEvent.click(trigger);
    fireEvent.click(screen.getByText("GLM-Edge 1.5B"));
    expect(localStorage.getItem("webgpu-llm-chat.model.v1")).toBe(
      "onnx-community/glm-edge-1.5b-chat-ONNX",
    );
    // 切换后重新加载并回到就绪态
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/问任何问题/)).toBeInTheDocument(),
    );
  });

  it("上传 txt 文档后随消息一起发送并入库", async () => {
    render(<App />);
    await enterApp();
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/问任何问题/)).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByTestId("doc-input"), {
      target: { files: [new File(["文档正文内容"], "资料.txt")] },
    });
    await waitFor(() => expect(screen.getByText(/资料\.txt/)).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/问任何问题/), {
      target: { value: "帮我总结这份文档" },
    });
    fireEvent.click(screen.getByLabelText("发送"));

    await waitFor(() =>
      expect(screen.getByTestId("msg-user")).toHaveTextContent("帮我总结这份文档"),
    );
    const stored = JSON.parse(
      localStorage.getItem("webgpu-llm-chat.sessions.v1")!,
    );
    expect(stored[0].messages[0].content).toContain("文档正文内容");
    expect(stored[0].messages[0].attachments).toEqual(["资料.txt"]);
  });

  it("模型加载失败时自动降级到更小的内置模型", async () => {
    const big = "onnx-community/Qwen3-1.7B-ONNX";
    const small = "onnx-community/Qwen3-0.6B-ONNX";
    localStorage.setItem("webgpu-llm-chat.model.v1", big);
    FakeWorker.failModels = new Set([big]);
    render(<App />);
    // 用户选中大模型；失败后自动改用最小的内置模型并成功就绪
    await enterApp(/Qwen3 1\.7B/);
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/问任何问题/)).toBeInTheDocument(),
    );
    // 失败的加载发生在旧 worker；降级重试必须发生在重建后的干净 worker（脏 WASM 堆会连锁 bad_alloc）
    expect(FakeWorker.instances.length).toBeGreaterThanOrEqual(2);
    expect(FakeWorker.instances[0].loadedModels[0]).toBe(big);
    const w = FakeWorker.instances.at(-1)!;
    expect(w.loadedModels).toContain(small);
    expect(localStorage.getItem("webgpu-llm-chat.model.v1")).toBe(small);
  });

  it("worker 报错时显示错误信息", async () => {
    render(<App />);
    await enterApp();
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/问任何问题/)).toBeInTheDocument(),
    );
    act(() => {
      FakeWorker.instances.at(-1)!.emit({ status: "error", data: "boom" });
    });
    await waitFor(() => expect(screen.getByText(/boom/)).toBeInTheDocument());
  });
});
