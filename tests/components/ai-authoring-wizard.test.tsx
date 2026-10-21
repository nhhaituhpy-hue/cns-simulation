import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AiAuthoringField } from "@/components/scenario/ai-authoring-field";
import { useState } from "react";
import { AiAuthoringWizard } from "@/components/scenario/ai-authoring-wizard";
import type { AuthoringSessionDto, AuthoringMutation } from "@/lib/ai/scenario-authoring/types";

const base = "/api/ai/scenario-authoring";
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
function fixture(): AuthoringSessionDto {
  return { id: "draft-1", moduleId: "dvor-220", revision: 1, status: "editing", currentStep: "metadata",
    form: { moduleId: "dvor-220", label: "DVOR 220", version: 1, notices: [], sections: [
      { id: "metadata", title: "Thông tin kịch bản", help: "Đặt tên dễ nhận biết cho bài tập." },
      { id: "initial", title: "Trạng thái khởi đầu", help: "Giữ thông số bình thường trước khi chọn lỗi." },
    ], fields: [
      { id: "name", sectionId: "metadata", group: "Thông tin", schema: { type: "text", label: "Tên kịch bản", help: "Tên giúp giám khảo tìm lại bài.", required: true }, value: "Bài tập mới", baselineEligible: false },
      { id: "config.power", sectionId: "initial", group: "Máy phát", schema: { type: "number", label: "Công suất", help: "Công suất máy phát trước khi đưa lỗi vào.", min: 0, max: 100, unit: "W" }, value: 80, baselineEligible: true },
    ] }, sources: { name: { kind: "native-default" }, "config.power": { kind: "document", documentName: "manual.txt", quote: "Công suất 80 W" } },
    baselineValues: { name: "Bài tập mới", "config.power": 80 }, confirmedSections: [], issues: [], proposal: null,
    preview: { status: "valid", checks: [], notes: [], recoveryVerified: false }, documents: [], analysis: null,
    scenarioRowId: null, scenarioId: null, createdAt: "2026-10-20T00:00:00Z", updatedAt: "2026-10-20T00:00:00Z" };
}
// Explicit HTTP boundary double. React controls, effects and handlers are real.
function server(initial = fixture(), history = false) {
  let current = initial;
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes("?moduleId=")) return reply({ sessions: history ? [{ ...current, name: "Bài đã lưu" }] : [] });
    if (init?.method === "PATCH") {
      const { mutation, expectedRevision } = JSON.parse(init.body as string) as { mutation: AuthoringMutation; expectedRevision: number };
      if (expectedRevision !== current.revision) return reply({ code: "REVISION_CONFLICT", error: "stale" }, 409);
      current = structuredClone(current); current.revision++;
      if (mutation.action === "edit") {
        for (const change of mutation.changes) { current.form.fields.find((f) => f.id === change.fieldId)!.value = change.value; current.sources[change.fieldId] = { kind: "user" }; }
        current.confirmedSections = [];
      }
      if (mutation.action === "navigate") current.currentStep = mutation.sectionId;
      if (mutation.action === "confirm") current.confirmedSections.push(mutation.sectionId);
      if (mutation.action === "reset-field") current.form.fields.find((f) => f.id === mutation.fieldId)!.value = current.baselineValues[mutation.fieldId];
      if (mutation.action === "apply-proposal") {
        for (const change of current.proposal!.changes.filter((c) => mutation.fieldIds.includes(c.fieldId))) current.form.fields.find((f) => f.id === change.fieldId)!.value = change.value;
        current.proposal = null;
      }
      if (mutation.action === "dismiss-proposal") current.proposal = null;
    }
    if (url.endsWith("/finalize")) current = { ...current, revision: current.revision + 1, status: "completed", scenarioRowId: "source-1", scenarioId: "scenario-1" };
    if (url.endsWith("/analysis")) current = { ...current, revision: current.revision + 1, analysis: { id: "analysis-1", status: "queued", errorCode: null } };
    return reply({ session: current });
  });
  vi.stubGlobal("fetch", fetcher);
  return { fetcher, get: () => current, set: (next: AuthoringSessionDto) => { current = next; } };
}
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

it("uploads actual documents first and displays returned fields without creating a source or nested modal", async () => {
  const { fetcher } = server();
  const { container } = render(<AiAuthoringWizard moduleId="dvor-220" />);
  expect(container.querySelector("dialog")).toBeNull();
  expect(screen.queryByLabelText("Tên kịch bản")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Phân tích tài liệu và điền biểu mẫu" })).toBeDisabled();
  const file = new File(["Công suất 80 W"], "manual.txt", { type: "text/plain" });
  fireEvent.change(screen.getByLabelText("Tài liệu thông số nền"), { target: { files: [file] } });
  fireEvent.click(screen.getByRole("button", { name: "Phân tích tài liệu và điền biểu mẫu" }));
  expect(await screen.findByLabelText("Tên kịch bản")).toHaveValue("Bài tập mới");
  const [, request] = fetcher.mock.calls.find(([, init]) => init?.method === "POST")!;
  expect((request!.body as FormData).get("moduleId")).toBe("dvor-220");
  expect((request!.body as FormData).getAll("files")).toEqual([file]);
  expect(new Headers(request!.headers).get("Idempotency-Key")).toBeTruthy();
  expect(fetcher.mock.calls.some(([url]) => url.includes("finalize"))).toBe(false);
});

async function nativeStart() {
  fireEvent.click(screen.getByRole("button", { name: "Dùng mặc định simulator" }));
  await screen.findByLabelText("Tên kịch bản");
}
it("guides native defaults through editable groups, typed nested unions, source comparison and revision-fenced confirmations", async () => {
  const draft = fixture();
  draft.form.fields.push({ id: "limits", sectionId: "initial", group: "Giới hạn", baselineEligible: true, value: { low: 2, high: 9 }, schema: { type: "object", label: "Khoảng cho phép", help: "Chỉnh hai ngưỡng rồi lưu cùng nhóm.", properties: { low: { type: "number", label: "Ngưỡng dưới", help: "Phải nhỏ hơn ngưỡng trên." }, high: { type: "number", label: "Ngưỡng trên", help: "Phải lớn hơn ngưỡng dưới." } } } });
  draft.form.fields.push({ id: "actions", sectionId: "initial", group: "Thao tác", baselineEligible: false, value: [], schema: { type: "array", label: "Thao tác chuẩn", help: "Chọn thao tác được hỗ trợ.", maxItems: 4, discriminator: "kind", variants: [
    { value: "switch", label: "Chuyển máy", initial: { kind: "switch", target: "TX1" }, schema: { type: "object", label: "Chuyển máy", help: "Chọn máy phát đích.", properties: { target: { type: "select", label: "Máy phát đích", help: "Máy được đưa lên anten.", options: [{ value: "TX1", label: "Máy phát 1" }, { value: "TX2", label: "Máy phát 2" }] } } } },
    { value: "wait", label: "Chờ ổn định", initial: { kind: "wait", seconds: 5 }, schema: { type: "object", label: "Chờ ổn định", help: "Đợi trước khi đo.", properties: { seconds: { type: "number", label: "Thời gian chờ", help: "Số giây chờ.", unit: "s" } } } },
  ] } });
  const api = server(draft);
  render(<AiAuthoringWizard moduleId="dvor-220" />);
  await nativeStart();
  expect(screen.getByText("Tên giúp giám khảo tìm lại bài.")).toBeInTheDocument();
  expect(screen.getByText("Mặc định simulator")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Tên kịch bản"), { target: { value: "Bài của tôi" } });
  expect(api.get().form.fields[0].value).toBe("Bài tập mới");
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận bước và tiếp tục" }));
  await screen.findByLabelText("Công suất");
  expect(api.get().confirmedSections).toContain("metadata");
  expect(api.get().form.fields[0].value).toBe("Bài của tôi");
  expect(screen.getByText(/Từ tài liệu.*manual.txt/)).toBeInTheDocument();
  expect(screen.getByText(/Giá trị nền: 80 W/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Ngưỡng dưới"), { target: { value: "8" } });
  fireEvent.change(screen.getByLabelText("Ngưỡng trên"), { target: { value: "10" } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu nhóm Giới hạn" }));
  await waitFor(() => expect(api.get().form.fields.find((field) => field.id === "limits")!.value).toEqual({ low: 8, high: 10 }));
  fireEvent.click(screen.getByRole("button", { name: "Thêm Thao tác chuẩn" }));
  fireEvent.change(screen.getByLabelText("Máy phát đích"), { target: { value: "TX2" } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu nhóm Thao tác" }));
  await waitFor(() => expect(api.get().form.fields.find((field) => field.id === "actions")!.value).toEqual([{ kind: "switch", target: "TX2" }]));
  fireEvent.change(screen.getByLabelText("Loại Thao tác chuẩn 1"), { target: { value: "wait" } });
  expect(screen.queryByLabelText("Máy phát đích")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Thời gian chờ")).toHaveValue(5);
  expect(document.querySelectorAll("textarea")).toHaveLength(1);
  expect(screen.getByLabelText("Câu hỏi cho AI").tagName).toBe("TEXTAREA");
  fireEvent.click(screen.getByRole("button", { name: "Quay lại" }));
  await screen.findByLabelText("Tên kịch bản");
  expect(screen.getByLabelText("Tên kịch bản")).toHaveValue("Bài của tôi");
  expect(api.get().confirmedSections).not.toContain("initial");
  expect(api.fetcher.mock.calls.filter(([, init]) => init?.method === "PATCH").every(([, init]) => Number.isInteger(JSON.parse(init!.body as string).expectedRevision))).toBe(true);
});

it("resumes the server step after reopening and keeps dirty inputs on revision conflicts until explicit reload", async () => {
  const draft = fixture(); draft.currentStep = "initial";
  const api = server(draft, true);
  const close = vi.fn();
  const view = render(<AiAuthoringWizard moduleId="dvor-220" onClose={close} />);
  fireEvent.click(await screen.findByRole("button", { name: "Tiếp tục: Bài đã lưu" }));
  expect(await screen.findByLabelText("Công suất")).toHaveValue(80);
  fireEvent.change(screen.getByLabelText("Công suất"), { target: { value: "42" } });
  api.set({ ...structuredClone(api.get()), revision: 5 });
  fireEvent.click(screen.getByRole("button", { name: "Lưu nháp" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/phiên mới|phiên khác/i);
  expect(screen.getByLabelText("Công suất")).toHaveValue(42);
  fireEvent.click(screen.getByRole("button", { name: "Tải lại phiên mới, giữ bản chỉnh" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Lưu nháp" })).toBeEnabled());
  expect(screen.getByLabelText("Công suất")).toHaveValue(42);
  fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
  await waitFor(() => expect(close).toHaveBeenCalledOnce());
  expect(api.get().form.fields[1].value).toBe(42);
  view.unmount();
  render(<AiAuthoringWizard moduleId="dvor-220" />);
  fireEvent.click(await screen.findByRole("button", { name: "Tiếp tục: Bài đã lưu" }));
  expect(await screen.findByLabelText("Công suất")).toHaveValue(42);
  expect(api.get().confirmedSections).toEqual([]);
});

it("asks real per-step AI, polls bounded work, shows opt-in diff and preserves edits on replacement documents", async () => {
  vi.useFakeTimers();
  const api = server();
  const view = render(<AiAuthoringWizard moduleId="dvor-220" />);
  fireEvent.click(screen.getByRole("button", { name: "Dùng mặc định simulator" }));
  await act(async () => {});
  fireEvent.click(screen.getByRole("button", { name: /Trạng thái khởi đầu/ }));
  await act(async () => {});
  fireEvent.change(screen.getByLabelText("Câu hỏi cho AI"), { target: { value: "Vì sao chọn công suất này?" } });
  fireEvent.click(screen.getByRole("button", { name: "Hỏi AI về bước này" }));
  await act(async () => {});
  const [, request] = api.fetcher.mock.calls.find(([url]) => url.endsWith("/analysis"))!;
  expect((request!.body as FormData).get("kind")).toBe("guidance");
  expect((request!.body as FormData).get("sectionId")).toBe("initial");
  expect((request!.body as FormData).get("expectedRevision")).toBe("2");
  expect(new Headers(request!.headers).get("Idempotency-Key")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Hỏi AI về bước này" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Công suất"), { target: { value: "42" } });
  api.set({ ...structuredClone(api.get()), revision: 4, analysis: { id: "analysis-1", status: "completed", errorCode: null }, proposal: {
    id: "proposal-1", baseRevision: 3, kind: "guidance", sectionId: "initial", message: "Đối chiếu công suất với manual.", changes: [{ fieldId: "config.power", value: 90, reason: "Theo mục máy phát.", source: { kind: "document", documentName: "manual.txt" } }], issues: [], coverage: { documents: 1, charactersRead: 100, charactersAvailable: 200, truncated: true },
  } });
  await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
  expect(screen.getByLabelText("Công suất")).toHaveValue(42);
  expect(screen.getByText(/Trước: 42 W/)).toBeInTheDocument();
  expect(screen.getByText(/Đề xuất: 90 W/)).toBeInTheDocument();
  expect(screen.getByText(/100.*200.*ký tự/)).toBeInTheDocument();
  expect(screen.getByRole("checkbox", { name: "Áp dụng Công suất" })).not.toBeChecked();
  expect(screen.getByRole("button", { name: "Áp dụng đề xuất đã chọn" })).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox", { name: "Áp dụng Công suất" }));
  fireEvent.click(screen.getByRole("button", { name: "Áp dụng đề xuất đã chọn" }));
  await act(async () => {});
  expect(screen.getByLabelText("Công suất")).toHaveValue(90);
  fireEvent.click(screen.getByRole("button", { name: "Tài liệu" }));
  await act(async () => {});
  fireEvent.change(screen.getByLabelText("Tài liệu thông số nền"), { target: { files: [new File(["New manual"], "new.txt")] } });
  fireEvent.click(screen.getByRole("button", { name: "Phân tích lại tài liệu" }));
  await act(async () => {});
  const analysisCalls = api.fetcher.mock.calls.filter(([url]) => url.endsWith("/analysis"));
  expect((analysisCalls[1][1]!.body as FormData).get("kind")).toBe("baseline");
  expect((analysisCalls[1][1]!.body as FormData).getAll("files")).toHaveLength(1);
  expect(api.get().form.fields[1].value).toBe(90);
  await act(async () => { await vi.advanceTimersByTimeAsync(610000); });
  expect(screen.getByText(/tạm dừng cập nhật tự động/i)).toBeInTheDocument();
  const count = api.fetcher.mock.calls.length;
  await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
  expect(api.fetcher.mock.calls).toHaveLength(count);
  fireEvent.click(screen.getByRole("button", { name: "Tiếp tục cập nhật" }));
  await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
  expect(api.fetcher.mock.calls.length).toBeGreaterThan(count);
  view.unmount();
  const closed = api.fetcher.mock.calls.length;
  await act(async () => { await vi.advanceTimersByTimeAsync(9000); });
  expect(api.fetcher.mock.calls).toHaveLength(closed);
  expect(api.fetcher.mock.calls.some(([url]) => url.endsWith("/finalize"))).toBe(false);
});

it("creates only from final confirmation with all steps confirmed, preserves retry key, then exposes JSON and simulator", async () => {
  const api = server();
  const completed = vi.fn();
  render(<AiAuthoringWizard moduleId="dvor-220" onCompleted={completed} />);
  await nativeStart();
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Hoàn tất tạo kịch bản" })).toBeDisabled());
  expect(api.fetcher.mock.calls.some(([url]) => url.endsWith("/finalize"))).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: /Thông tin kịch bản/ }));
  await screen.findByLabelText("Tên kịch bản");
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận bước và tiếp tục" }));
  await screen.findByLabelText("Công suất");
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận bước và tiếp tục" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Hoàn tất tạo kịch bản" })).toBeEnabled());
  const confirmedRevision = api.get().revision;
  let failed = false;
  const original = api.fetcher.getMockImplementation()!;
  api.fetcher.mockImplementation(async (url, init) => {
    if (url.endsWith("/finalize") && !failed) { failed = true; throw new Error("network lost"); }
    return original(url, init);
  });
  fireEvent.click(screen.getByRole("button", { name: "Hoàn tất tạo kịch bản" }));
  await screen.findByRole("alert");
  expect(completed).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Hoàn tất tạo kịch bản" }));
  await waitFor(() => expect(completed).toHaveBeenCalledOnce());
  const requests = api.fetcher.mock.calls.filter(([url]) => url.endsWith("/finalize"));
  expect(requests).toHaveLength(2);
  expect(JSON.parse(requests[0][1]!.body as string)).toEqual({ expectedRevision: confirmedRevision });
  expect(requests[1][1]!.body).toBe(requests[0][1]!.body);
  expect(new Headers(requests[1][1]!.headers).get("Idempotency-Key")).toBe(new Headers(requests[0][1]!.headers).get("Idempotency-Key"));
  expect(screen.getByRole("link", { name: "Tải JSON đầy đủ" })).toHaveAttribute("href", `${base}/draft-1/download`);
  expect(screen.getByRole("link", { name: "Mở trong simulator" })).toHaveAttribute("href", "/simulator/software/dvor-220?scenarioId=source-1");
  expect(screen.queryByRole("button", { name: "Hoàn tất tạo kịch bản" })).not.toBeInTheDocument();
  expect(completed.mock.calls[0][0].status).toBe("completed");
});
it("blocks final creation for required issues even when every section is confirmed", async () => {
  const draft = fixture(); draft.currentStep = "confirmation"; draft.confirmedSections = ["metadata", "initial"];
  draft.issues = [{ code: "BAD_GOAL", message: "Chọn ít nhất một điều kiện đạt có ý nghĩa.", severity: "error", sectionId: "initial" }];
  server(draft, true); render(<AiAuthoringWizard moduleId="dvor-220" />);
  fireEvent.click(await screen.findByRole("button", { name: "Tiếp tục: Bài đã lưu" }));
  expect(await screen.findByRole("button", { name: "Hoàn tất tạo kịch bản" })).toBeDisabled();
  expect(screen.getByText(/Chọn ít nhất một điều kiện đạt/)).toBeInTheDocument();
});

it("rejects unsafe uploads locally and retries an uncertain upload with its original multipart identity", async () => {
  const api = server(); let failed = false;
  const original = api.fetcher.getMockImplementation()!;
  api.fetcher.mockImplementation(async (url, init) => {
    if (init?.method === "POST" && !failed) { failed = true; throw new Error("offline"); }
    return original(url, init);
  });
  render(<AiAuthoringWizard moduleId="dvor-220" />);
  fireEvent.change(screen.getByLabelText("Tài liệu thông số nền"), { target: { files: [new File([], "empty.txt")] } });
  expect(screen.getByRole("button", { name: "Phân tích tài liệu và điền biểu mẫu" })).toBeDisabled();
  expect(screen.getByRole("alert")).toHaveTextContent(/trống/);
  const file = new File(["manual"], "real.txt");
  fireEvent.change(screen.getByLabelText("Tài liệu thông số nền"), { target: { files: [file] } });
  fireEvent.click(screen.getByRole("button", { name: "Phân tích tài liệu và điền biểu mẫu" }));
  await screen.findByRole("alert");
  expect(screen.getByLabelText("Tài liệu thông số nền")).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Gửi lại yêu cầu" }));
  await screen.findByLabelText("Tên kịch bản");
  const posts = api.fetcher.mock.calls.filter(([, init]) => init?.method === "POST");
  expect(posts).toHaveLength(2);
  expect(posts[1][1]!.body).toBe(posts[0][1]!.body);
  expect(new Headers(posts[1][1]!.headers).get("Idempotency-Key")).toBe(new Headers(posts[0][1]!.headers).get("Idempotency-Key"));
});
it("shows actionable server validation without discarding edits and reset can discard an invalid unsaved field", async () => {
  const api = server();
  const original = api.fetcher.getMockImplementation()!;
  api.fetcher.mockImplementation(async (url, init) => {
    if (init?.method === "PATCH" && JSON.parse(init.body as string).mutation.action === "edit") return reply({ code: "INVALID_FIELD", error: "/private/internal", issues: [{ code: "LIMIT", message: "Công suất không được vượt quá 100 W.", fieldId: "config.power", sectionId: "initial", severity: "error" }] }, 422);
    return original(url, init);
  });
  render(<AiAuthoringWizard moduleId="dvor-220" />); await nativeStart();
  fireEvent.click(screen.getByRole("button", { name: /Trạng thái khởi đầu/ }));
  await screen.findByLabelText("Công suất");
  fireEvent.change(screen.getByLabelText("Công suất"), { target: { value: "101" } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu nhóm Máy phát" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/Công suất không được vượt quá 100 W/);
  expect(screen.getByLabelText("Công suất")).toHaveValue(101);
  expect(screen.queryByText(/private/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Khôi phục nền: Công suất" }));
  await waitFor(() => expect(screen.getByLabelText("Công suất")).toHaveValue(80));
});

it("lets optional native object groups be enabled with typed defaults and cleared again",()=>{
 function Optional(){const [value,setValue]=useState<import("@/lib/ai/scenario-authoring/types").JsonValue>(null);return <AiAuthoringField schema={{type:"object",label:"Chẩn đoán",help:"Thêm nếu cần",nullable:true,initial:{summary:"Mặc định"},properties:{summary:{type:"text",label:"Tóm tắt lỗi",help:"Giải thích"}}}} value={value} onChange={setValue}/>;}
 render(<Optional/>);expect(screen.queryByLabelText("Tóm tắt lỗi")).not.toBeInTheDocument();fireEvent.click(screen.getByRole("checkbox",{name:"Sử dụng Chẩn đoán"}));expect(screen.getByLabelText("Tóm tắt lỗi")).toHaveValue("Mặc định");fireEvent.click(screen.getByRole("checkbox",{name:"Sử dụng Chẩn đoán"}));expect(screen.queryByLabelText("Tóm tắt lỗi")).not.toBeInTheDocument();
});
it("applies an explicitly selected proposal before unsaved edits can invalidate it",async()=>{
 const draft=fixture();draft.currentStep="initial";draft.proposal={id:"p1",baseRevision:1,kind:"guidance",sectionId:"initial",message:"Gợi ý",changes:[{fieldId:"config.power",value:90,reason:"Bài tập",source:{kind:"ai-suggestion"}}],issues:[],coverage:{documents:0,charactersRead:0,charactersAvailable:0,truncated:false}};
 const api=server(draft,true);const impl=api.fetcher.getMockImplementation()!;
 api.fetcher.mockImplementation(async(url,init)=>{const response=await impl(url,init);if(init?.method==="PATCH"&&JSON.parse(init.body as string).mutation.action==="edit"){api.set({...api.get(),proposal:null});return reply({session:api.get()});}return response;});
 render(<AiAuthoringWizard moduleId="dvor-220"/>);fireEvent.click(await screen.findByRole("button",{name:"Tiếp tục: Bài đã lưu"}));fireEvent.change(await screen.findByLabelText("Công suất"),{target:{value:"42"}});fireEvent.click(screen.getByRole("checkbox",{name:"Áp dụng Công suất"}));fireEvent.click(screen.getByRole("button",{name:"Áp dụng đề xuất đã chọn"}));await waitFor(()=>expect(screen.getByLabelText("Công suất")).toHaveValue(90));expect(api.get().form.fields[1].value).toBe(90);
});
