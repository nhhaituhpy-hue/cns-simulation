import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const h = vi.hoisted(() => ({ profile: vi.fn(), get: vi.fn(), list: vi.fn(), update: vi.fn(), latest: vi.fn() }));
vi.mock("@/lib/auth/profile", () => ({ getCurrentProfile: h.profile }));
vi.mock("@/lib/db", () => ({ getDatabasePool: () => ({}) }));
vi.mock("@/lib/ai/scenario-authoring/repository", () => ({ getAuthoringSession: h.get, listAuthoringSessions: h.list, updateAuthoringSession: h.update, latestAuthoringAnalysis: h.latest }));
import { AiScenarioDialog } from "@/components/scenario/ai-scenario-dialog";
import { getAuthoringResponse, listAuthoringResponse, updateAuthoringResponse } from "@/lib/ai/scenario-authoring/api-service";
import { applyAnalysisProposal, authoringStateDto, createAuthoringState, mutateAuthoringState, validateFinalAuthoring } from "@/lib/ai/scenario-authoring/state";
import type { AnalysisJob, AuthoringSession } from "@/lib/ai/scenario-authoring/types";
import { nativeBlueprintFixture } from "../helpers/native-blueprint";

const id = "11111111-1111-4111-8111-111111111111";
const origin = "https://labs.cnsvn.com";
const originalShow = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close");
beforeEach(() => {
  vi.clearAllMocks(); process.env.CNS_PUBLIC_ORIGIN = origin;
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function(this: HTMLDialogElement) { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); } });
});
afterEach(() => {
  cleanup(); vi.unstubAllGlobals(); vi.useRealTimers();
  for (const [key, descriptor] of [["showModal", originalShow], ["close", originalClose]] as const) {
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, key, descriptor); else Reflect.deleteProperty(HTMLDialogElement.prototype, key);
  }
});
function server() {
  let saved: AuthoringSession = { id, actorId: id, moduleId: "dvor-220", revision: 1, status: "editing", documents: [], scenarioRowId: null, scenarioId: null, createdAt: "now", updatedAt: "now", state: { ...createAuthoringState("dvor-220", "goal-draft"), mode: "description", context: "Mục tiêu cũ", currentStep: "documents" } };
  let analysis: AnalysisJob | null = null;
  h.profile.mockResolvedValue({ id, role: "admin" });
  h.get.mockImplementation(async () => saved); h.list.mockImplementation(async () => [saved]); h.latest.mockImplementation(async () => analysis);
  h.update.mockImplementation(async (_pool, sessionId, actorId, revision, mutation) => {
    expect([sessionId, actorId, revision]).toEqual([id, id, saved.revision]);
    saved = { ...saved, revision: saved.revision + 1, state: mutateAuthoringState(saved.state, mutation) };
    return saved;
  });
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes("scenario-jobs")) return Response.json({ jobs: [] });
    const request = new Request(origin + url, { ...init, headers: { ...Object.fromEntries(new Headers(init?.headers)), Origin: origin } });
    if (init?.method === "PATCH") return updateAuthoringResponse(request, id);
    if (url.includes("?moduleId=")) return listAuthoringResponse(request);
    return getAuthoringResponse(id);
  });
  vi.stubGlobal("fetch", fetcher);
  return { get: () => saved, set: (state: AuthoringSession["state"]) => { saved.state = state; }, analysis: (status: AnalysisJob["status"]) => { analysis = { id, status, errorCode: null } as AnalysisJob; }, fetcher };
}
async function resume(name: string) {
  fireEvent.click(screen.getByRole("button", { name: "Tạo kịch bản bằng AI" }));
  fireEvent.click(screen.getByRole("button", { name: "Mô tả tình huống" }));
  fireEvent.click(await screen.findByRole("button", { name: `Tiếp tục: ${name}` }));
}
it("persists a resumed training-goal edit through the real HTTP mutation before close and reopens it", async () => {
  const api = server();
  render(<AiScenarioDialog moduleId="dvor-220" />);
  // Use the server's native default name rather than an invented history label.
  const name = api.get().state.definition.name;
  fireEvent.click(screen.getByRole("button", { name: "Tạo kịch bản bằng AI" }));
  fireEvent.click(screen.getByRole("button", { name: "Mô tả tình huống" }));
  fireEvent.click(await screen.findByRole("button", { name: `Tiếp tục: ${name}` }));
  const input = await screen.findByLabelText("Mô tả tình huống");
  fireEvent.change(input, { target: { value: "Luyện xác định cảnh báo công suất TX1" } });
  fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(api.get().state.context).toBe("Luyện xác định cảnh báo công suất TX1");
  expect(h.update).toHaveBeenCalledWith(expect.anything(), id, id, 1, { action: "edit-context", context: "Luyện xác định cảnh báo công suất TX1" });
  fireEvent.click(screen.getByRole("button", { name: "Tạo kịch bản bằng AI" }));
  fireEvent.click(screen.getByRole("button", { name: "Mô tả tình huống" }));
  fireEvent.click(await screen.findByRole("button", { name: `Tiếp tục: ${name}` }));
  expect(await screen.findByLabelText("Mô tả tình huống")).toHaveValue("Luyện xác định cảnh báo công suất TX1");
  expect(authoringStateDto(api.get(), null).context).toBe("Luyện xác định cảnh báo công suất TX1");
  expect(api.fetcher.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
});
function verified(state: AuthoringSession["state"]) {
  return mutateAuthoringState(applyAnalysisProposal(state, { id: "blueprint-result", baseRevision: 1, kind: "blueprint", blueprint: nativeBlueprintFixture("dvor-220"), message: "Native fixture", changes: [], issues: [], coverage: { documents: 1, charactersRead: 100, charactersAvailable: 100, truncated: false } }), { action: "confirm-blueprint" });
}
it("invalidates the verified server blueprint when an advanced documents goal edit returns to review without regenerating", async () => {
  const api = server(); api.set(verified(api.get().state));
  render(<AiScenarioDialog moduleId="dvor-220" />);
  await resume(api.get().state.definition.name);
  expect(await screen.findByRole("button", { name: "Lưu kịch bản" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa nâng cao" }));
  fireEvent.click(screen.getByRole("button", { name: "Tài liệu" }));
  const goal = await screen.findByLabelText("Mục tiêu huấn luyện (không bắt buộc)");
  await waitFor(() => expect(goal).toBeEnabled());
  fireEvent.change(goal, { target: { value: "Mục tiêu mới cần kiểm chứng lại" } });
  expect(screen.getByText("Có thay đổi chưa lưu")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Quay lại bản xem thử" }));
  await waitFor(() => expect(api.get().state.context).toBe("Mục tiêu mới cần kiểm chứng lại"));
  await waitFor(() => expect(screen.getByRole("button", { name: "AI soạn kịch bản" })).toBeEnabled());
  expect(api.get().state.blueprint).toBeUndefined();
  expect(api.get().state.confirmations).toEqual({});
  expect(api.get().state.currentStep).toBe("documents");
  expect(() => validateFinalAuthoring(api.get().state)).toThrow();
  expect(screen.queryByRole("button", { name: "Lưu kịch bản" })).not.toBeInTheDocument();
  expect(api.fetcher.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
});
it("retains pending goal edits through completion and prompts rather than silently closing them", async () => {
  const api = server(); api.analysis("running");
  render(<AiScenarioDialog moduleId="dvor-220" />);
  await resume(api.get().state.definition.name);
  const goal = await screen.findByLabelText("Mô tả tình huống");
  vi.useFakeTimers();
  fireEvent.change(goal, { target: { value: "Mục tiêu trong lúc AI chạy" } });
  fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
  expect(screen.getByRole("region", { name: "Thay đổi chưa lưu" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Giữ bản chỉnh và tiếp tục" }));
  await act(async () => { await Promise.resolve(); });
  expect(goal).toHaveValue("Mục tiêu trong lúc AI chạy");
  expect(h.update).not.toHaveBeenCalled();
  api.set(verified(api.get().state)); api.analysis("completed");
  await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
  expect(screen.getByLabelText("Mô tả tình huống")).toHaveValue("Mục tiêu trong lúc AI chạy");
  expect(screen.queryByRole("button", { name: "Lưu kịch bản" })).not.toBeInTheDocument();
  vi.useRealTimers();
  fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(api.get().state.context).toBe("Mục tiêu trong lúc AI chạy");
  expect(api.get().state.blueprint).toBeUndefined();
});
it("queues the persisted edited goal and exact new revision, retaining body and key only for an ambiguous retry", async () => {
  const api = server();
  const original = api.fetcher.getMockImplementation()!;
  let posts = 0;
  api.fetcher.mockImplementation(async (url, init) => {
    if (url.endsWith("/analysis")) {
      posts += 1;
      expect((init!.body as FormData).get("question")).toBe(api.get().state.context);
      expect((init!.body as FormData).get("expectedRevision")).toBe(String(api.get().revision));
      if (posts === 1) throw new Error("network outcome unknown");
      api.analysis("running");
      return Response.json({ session: authoringStateDto(api.get(), { id, status: "running", errorCode: null } as AnalysisJob) });
    }
    return original(url, init);
  });
  render(<AiScenarioDialog moduleId="dvor-220" />);
  await resume(api.get().state.definition.name);
  fireEvent.change(await screen.findByLabelText("Mô tả tình huống"), { target: { value: "Đã sửa mục tiêu trước khi soạn" } });
  fireEvent.click(screen.getByRole("button", { name: "AI soạn kịch bản" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Chưa nhận được xác nhận");
  expect(api.get().state.context).toBe("Đã sửa mục tiêu trước khi soạn");
  expect(h.update).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Gửi lại yêu cầu" }));
  await screen.findByText("AI đang phân tích tài liệu hoặc câu hỏi");
  const attempts = api.fetcher.mock.calls.filter(([url]) => url.endsWith("/analysis"));
  expect(attempts).toHaveLength(2);
  expect(attempts[1][1]!.body).toBe(attempts[0][1]!.body);
  expect(new Headers(attempts[1][1]!.headers).get("Idempotency-Key")).toBe(new Headers(attempts[0][1]!.headers).get("Idempotency-Key"));
  expect(h.update).toHaveBeenCalledTimes(1);
});
it("prompts before discarding an initial unsaved brief without creating a server draft", async () => {
  server();
  render(<AiScenarioDialog moduleId="dvor-220" />);
  fireEvent.click(screen.getByRole("button", { name: "Tạo kịch bản bằng AI" }));
  fireEvent.click(screen.getByRole("button", { name: "Mô tả tình huống" }));
  fireEvent.change(screen.getByLabelText("Mô tả tình huống"), { target: { value: "Bản mô tả chưa gửi" } });
  fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Mô tả chưa được lưu trên máy chủ");
  fireEvent.click(screen.getByRole("button", { name: "Giữ bản chỉnh và tiếp tục" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Đóng" })).toBeEnabled());
  expect(screen.getByLabelText("Mô tả tình huống")).toHaveValue("Bản mô tả chưa gửi");
  fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
  fireEvent.click(screen.getByRole("button", { name: "Bỏ thay đổi chưa lưu và đóng" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(h.update).not.toHaveBeenCalled();
});
