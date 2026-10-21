import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AiAuthoringWizard } from "@/components/scenario/ai-authoring-wizard";
import { createAuthoringState, authoringStateDto, mutateAuthoringState, applyAnalysisProposal } from "@/lib/ai/scenario-authoring/state";
import type { AnalysisJob, AuthoringSession } from "@/lib/ai/scenario-authoring/types";
import { nativeBlueprintFixture } from "../helpers/native-blueprint";

const base = "/api/ai/scenario-authoring";
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
function server(mode?: "documents" | "description") {
  let current: AuthoringSession = { id: "draft-1", actorId: "test-admin", moduleId: "dvor-220", revision: 1, status: "editing", state: createAuthoringState("dvor-220", "audit-scenario"), documents: [], scenarioRowId: null, scenarioId: null, createdAt: "now", updatedAt: "now" };
  if (mode) current.state = { ...current.state, mode, currentStep: "documents", context: "Luyện khôi phục công suất máy phát." };
  let analysis: AnalysisJob | null = null;
  const dto = () => authoringStateDto(current, analysis);
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes("?moduleId=")) return reply({ sessions: [{ id: current.id, name: "Bài trước đó", status: "editing" }] });
    if (init?.method === "DELETE") return reply({ deleted: true });
    if (init?.method === "PATCH") {
      const body = JSON.parse(init.body as string);
      expect(body.expectedRevision).toBe(current.revision);
      current = { ...current, revision: current.revision + 1, state: mutateAuthoringState(current.state, body.mutation) };
    }
    if (url.endsWith("/analysis")) analysis = { id: "a1", status: "running", errorCode: null } as AnalysisJob;
    return reply({ session: dto() });
  });
  vi.stubGlobal("fetch", fetcher);
  return { fetcher, get: () => current, update: (s: AuthoringSession["state"]) => { current.state = s; }, analysis: (value: Pick<AnalysisJob, "id" | "status" | "errorCode">) => { analysis = value as AnalysisJob; }, documents: () => { current.documents = [{ id: "doc-1", name: "manual.txt", mimeType: "text/plain", bytes: 20, sha256: "a".repeat(64), storageKey: "private/not-public" }]; } };
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });

it("offers a safe close while AI runs without deleting the saved draft or silently losing local edits", async () => {
  const api = server();
  api.analysis({ id: "a1", status: "running", errorCode: null });
  const close = vi.fn();
  let requestClose: (() => Promise<boolean>) | null = null;
  render(<AiAuthoringWizard moduleId="dvor-220" onClose={close} registerClose={handler => { requestClose = handler; }} />);
  fireEvent.click(await screen.findByRole("button", { name: "Tiếp tục: Bài trước đó" }));
  const name = await screen.findByLabelText("Tên kịch bản");
  fireEvent.change(name, { target: { value: "Chỉnh khi AI đang chạy" } });
  fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
  expect(await screen.findByRole("button", { name: "Bỏ thay đổi chưa lưu và đóng" })).toBeEnabled();
  expect(close).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Giữ bản chỉnh và tiếp tục" }));
  expect(name).toHaveValue("Chỉnh khi AI đang chạy");
  let canClose: Promise<boolean>;
  await act(async () => { canClose = requestClose!(); });
  fireEvent.click(screen.getByRole("button", { name: "Bỏ thay đổi chưa lưu và đóng" }));
  await expect(canClose!).resolves.toBe(true);
  expect(api.fetcher.mock.calls.filter(([, init]) => init?.method === "PATCH" || init?.method === "DELETE")).toEqual([]);
  expect(authoringStateDto(api.get(), null).form.fields.find(field => field.id === "name")?.value).not.toBe("Chỉnh khi AI đang chạy");
});

it.each([
  ["CLARIFICATION_REQUIRED", /Hãy bổ sung triệu chứng, mục tiêu xử lý hoặc phạm vi bài tập/],
  ["KNOWLEDGE_UNAVAILABLE", /Chưa có manual.*đúng thiết bị/],
  ["UNSUPPORTED_REQUEST", /chưa hỗ trợ tình huống/],
  ["INVALID_RECOVERY", /chưa kiểm chứng được.*khôi phục/],
] as const)("explains %s safely and retries the blueprint with stored documents and context", async (code, message) => {
  const api = server("documents"); api.documents(); api.analysis({ id: "a1", status: "failed", errorCode: code });
  render(<AiAuthoringWizard moduleId="dvor-220" initialMode="documents" />);
  fireEvent.click(await screen.findByRole("button", { name: "Tiếp tục: Bài trước đó" }));
  expect(await screen.findByText(message)).toBeInTheDocument();
  expect(screen.getByRole("list", { name: "Tài liệu đã lưu" })).toHaveTextContent("manual.txt");
  expect(screen.getByLabelText("Mục tiêu huấn luyện (không bắt buộc)")).toHaveValue("Luyện khôi phục công suất máy phát.");
  expect(screen.getByRole("button", { name: "AI soạn kịch bản" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "AI soạn kịch bản" }));
  await screen.findByText("AI đang phân tích tài liệu hoặc câu hỏi");
  const [url, init] = api.fetcher.mock.calls.find(([, init]) => init?.method === "POST")!;
  expect(url).toBe(`${base}/draft-1/analysis`);
  const body = init!.body as FormData;
  expect(body.get("kind")).toBe("blueprint");
  expect(body.get("question")).toBe("Luyện khôi phục công suất máy phát.");
  expect(body.get("expectedRevision")).toBe("1");
  expect(body.getAll("files")).toHaveLength(0);
  expect(screen.queryByRole("button", { name: "Lưu kịch bản" })).not.toBeInTheDocument();
  expect(screen.queryByText(/private\/not-public/)).not.toBeInTheDocument();
});

it("shows explanation-only guidance without a proposal blocker and allows another question", async () => {
  const api = server();
  api.update(applyAnalysisProposal(api.get().state, {
    id: "p-explain", baseRevision: 1, kind: "guidance", sectionId: "metadata", message: "Tên bài giúp giám khảo nhận biết mục tiêu huấn luyện.",
    changes: [], issues: [], coverage: { documents: 0, charactersRead: 0, charactersAvailable: 0, truncated: false },
  }));
  render(<AiAuthoringWizard moduleId="dvor-220" />);
  fireEvent.click(await screen.findByRole("button", { name: "Tiếp tục: Bài trước đó" }));
  expect(await screen.findByText("Tên bài giúp giám khảo nhận biết mục tiêu huấn luyện.")).toBeInTheDocument();
  expect(screen.queryByRole("complementary", { name: "Đề xuất AI cần duyệt" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Bỏ qua đề xuất" })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Câu hỏi cho AI"), { target: { value: "Giải thích thêm giúp tôi" } });
  fireEvent.click(screen.getByRole("button", { name: "Hỏi AI về bước này" }));
  await screen.findByText("AI đang phân tích tài liệu hoặc câu hỏi");
  expect(api.fetcher.mock.calls.filter(([url]) => url.endsWith("/analysis"))).toHaveLength(1);
});

it("keeps a rejected description editable and retries with a new key and safe error text", async () => {
  const api = server("description");
  const original = api.fetcher.getMockImplementation()!;
  let rejected = false;
  api.fetcher.mockImplementation(async (url, init) => {
    if (init?.method === "POST" && !rejected) {
      rejected = true;
      return reply({ code: "CLARIFICATION_REQUIRED", error: "/private/provider-response", issues: [{ message: "worker-secret" }] }, 422);
    }
    return original(url, init);
  });
  render(<AiAuthoringWizard moduleId="dvor-220" initialMode="description" />);
  const description = screen.getByLabelText("Mô tả tình huống");
  expect(description).toHaveAttribute("maxlength", "2000");
  fireEvent.change(description, { target: { value: "Có sự cố." } });
  fireEvent.click(screen.getByRole("button", { name: "AI soạn kịch bản" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Hãy bổ sung triệu chứng");
  expect(screen.queryByText(/private|worker-secret/)).not.toBeInTheDocument();
  expect(description).toBeEnabled();
  fireEvent.change(description, { target: { value: "Luyện khôi phục công suất máy phát." } });
  fireEvent.click(screen.getByRole("button", { name: "AI soạn kịch bản" }));
  await screen.findByRole("button", { name: "Chỉnh sửa nâng cao" });
  const posts = api.fetcher.mock.calls.filter(([, init]) => init?.method === "POST");
  expect(posts).toHaveLength(2);
  expect(new Headers(posts[1][1]!.headers).get("Idempotency-Key")).not.toBe(new Headers(posts[0][1]!.headers).get("Idempotency-Key"));
  expect((posts[1][1]!.body as FormData).get("context")).toBe("Luyện khôi phục công suất máy phát.");
});

it("saves advanced edits before returning to review and requires a rebuilt blueprint", async () => {
  const api = server("description");
  const blueprint = nativeBlueprintFixture("dvor-220");
  api.update(applyAnalysisProposal(api.get().state, {
    id: "blueprint-1", kind: "blueprint", baseRevision: 1, blueprint, message: "Bài mẫu đã kiểm chứng.", changes: [], issues: [],
    coverage: { documents: 1, charactersRead: 100, charactersAvailable: 100, truncated: false },
  }));
  render(<AiAuthoringWizard moduleId="dvor-220" initialMode="description" />);
  fireEvent.click(await screen.findByRole("button", { name: "Tiếp tục: Bài trước đó" }));
  expect(await screen.findByRole("button", { name: "Lưu kịch bản" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa nâng cao" }));
  fireEvent.change(screen.getByLabelText("Tên kịch bản"), { target: { value: "Yêu cầu đã sửa" } });
  fireEvent.click(screen.getByRole("button", { name: "Quay lại bản xem thử" }));
  await waitFor(() => expect(api.get().state.blueprint).toBeUndefined());
  expect(screen.queryByRole("button", { name: "Lưu kịch bản" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "AI soạn kịch bản" })).toBeEnabled();
  expect(screen.getByLabelText("Mô tả tình huống")).toHaveValue("Luyện khôi phục công suất máy phát.");
  fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa nâng cao" }));
  expect(screen.getByLabelText("Tên kịch bản")).toHaveValue("Yêu cầu đã sửa");
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
  expect(await screen.findByText(/Cần AI soạn lại.*kiểm chứng/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Hoàn tất tạo kịch bản" })).not.toBeInTheDocument();
});
