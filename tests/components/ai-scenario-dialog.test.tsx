import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AiScenarioDialog } from "@/components/scenario/ai-scenario-dialog";
import { AdsbAdminDashboard } from "@/modules/devices/adsb/admin-dashboard";
import { useScenarioStore } from "@/stores/scenario-store";
import { ScenarioManagementWorkspace } from "@/components/scenario/scenario-management-workspace";

const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close");
const reply = (payload: unknown, status = 200) => new Response(JSON.stringify(payload), { status });

beforeEach(() => {
  // JSDOM does not implement the native top-layer/focus lifecycle.
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  }) });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  }) });
  vi.stubGlobal("fetch", vi.fn((url: string) => Promise.resolve(reply(
    url.startsWith("/api/ai/") ? { jobs: [] } : [],
  ))));
});
afterEach(() => {
  cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  for (const [key, descriptor] of [["showModal", originalShowModal], ["close", originalClose]] as const) {
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, key, descriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, key);
  }
});

describe("AI scenario dialog", () => {
  it("opens a labelled native modal with required inputs and restores focus on Escape, backdrop and close", async () => {
    const user = userEvent.setup();
    render(<ScenarioManagementWorkspace moduleId="dvor-220" />);
    const trigger = await screen.findByRole("button", { name: "Tạo kịch bản bằng AI" });
    expect(trigger.parentElement).toContainElement(screen.getByRole("button", { name: "Thêm" }));
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Tạo kịch bản bằng AI" });
    expect(dialog.tagName).toBe("DIALOG");
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
    expect(within(dialog).getByLabelText("Thiết bị")).toHaveValue("dvor-220");
    expect(within(dialog).getByLabelText("Thiết bị")).toBeDisabled();
    expect(within(dialog).getByLabelText("Tên kịch bản")).toBeRequired();
    expect(within(dialog).getByLabelText("Tên kịch bản")).toHaveFocus();
    expect(within(dialog).getByLabelText("Mô tả yêu cầu")).toBeRequired();
    expect(within(dialog).getByLabelText("Độ khó")).toHaveValue("intermediate");
    expect(within(dialog).getByText(/OCR/)).toBeInTheDocument();
    expect(within(dialog).getByText(/AI bên ngoài/)).toBeInTheDocument();
    expect(within(dialog).getByText(/giám khảo.*duyệt/i)).toBeInTheDocument();
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    await user.click(trigger);
    fireEvent.click(screen.getByRole("dialog"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Đóng" }));
    expect(trigger).toHaveFocus();
    expect(screen.getByRole("button", { name: "Thêm" })).toBeInTheDocument();
  });
});

it.each(["dvor-1150", "dvor-1150a", "dme-1119a", "dvor-220", "dme-320", "ads-b"] as const)("offers an editable Word template on %s without submitting a job", async (moduleId) => {
  const user = userEvent.setup();
  render(<AiScenarioDialog moduleId={moduleId} />);
  await user.click(screen.getByRole("button", { name: "Tạo kịch bản bằng AI" }));
  const modal = within(screen.getByRole("dialog"));
  const template = modal.getByRole("link", { name: "Tải file mẫu (.docx)" });
  expect(template).toHaveAttribute("href", "/templates/mau-tai-lieu-tao-kich-ban-ai.docx");
  expect(template).toHaveAttribute("download", "mau-tai-lieu-tao-kich-ban-ai.docx");
  expect(template.previousElementSibling).toContainElement(modal.getByLabelText("Tài liệu đính kèm (không bắt buộc)"));
  expect(modal.getByText(/Tải mẫu, thay nội dung hướng dẫn bằng tình huống của bạn/)).toBeInTheDocument();
  template.addEventListener("click", (event) => event.preventDefault(), { once: true });
  await user.click(template);
  expect(modal.getByRole("button", { name: "Bắt đầu tạo" })).toBeEnabled();
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(vi.mocked(fetch).mock.calls.every(([, init]) => !init?.method || init.method === "GET")).toBe(true);
});

it("retries an ambiguous network failure with the same multipart payload and UUID without duplicate pending submits", async () => {
  const user = userEvent.setup();
  const requests: RequestInit[] = [];
  let accept: ((response: Response) => void) | undefined;
  vi.stubGlobal("fetch", vi.fn((_url: string, init?: RequestInit) => {
    if (init?.method !== "POST") return Promise.resolve(reply(_url.includes("/job-submit")
      ? { job: { id: "job-submit", moduleId: "dme-320", name: "Lỗi công suất HPA", status: "queued", phase: "queued", createdAt: "2026-10-20T00:00:00Z", updatedAt: "2026-10-20T00:00:00Z" } }
      : { jobs: [] }));
    requests.push(init);
    if (requests.length === 1) return Promise.reject(new Error("offline"));
    return new Promise<Response>((resolve) => { accept = resolve; });
  }));
  render(<AiScenarioDialog moduleId="dme-320" />);
  await user.click(screen.getByRole("button", { name: "Tạo kịch bản bằng AI" }));
  await user.type(screen.getByLabelText("Tên kịch bản"), "Lỗi công suất HPA");
  await user.type(screen.getByLabelText("Mô tả yêu cầu"), "Tạo tình huống công suất HPA thấp để kiểm tra.");
  await user.upload(screen.getByLabelText("Tài liệu đính kèm (không bắt buộc)"), new File(["HPA manual"], "manual.txt", { type: "text/plain" }));
  await user.click(screen.getByRole("button", { name: "Bắt đầu tạo" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/gửi lại/i);
  expect(screen.getByLabelText("Tên kịch bản")).toHaveValue("Lỗi công suất HPA");
  expect(screen.getByLabelText("Tài liệu đính kèm (không bắt buộc)")).toHaveProperty("files", expect.objectContaining({ length: 1 }));
  await user.click(screen.getByRole("button", { name: "Gửi lại yêu cầu" }));
  expect(screen.getByRole("button", { name: "Đang gửi…" })).toBeDisabled();
  fireEvent.submit(screen.getByLabelText("Tên kịch bản").closest("form")!);
  expect(requests).toHaveLength(2);
  const firstHeaders = new Headers(requests[0].headers);
  expect(firstHeaders.get("Idempotency-Key")).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  expect(new Headers(requests[1].headers).get("Idempotency-Key")).toBe(firstHeaders.get("Idempotency-Key"));
  expect(firstHeaders.has("Content-Type")).toBe(false);
  const body = requests[1].body as FormData;
  expect(body.get("moduleId")).toBe("dme-320");
  expect(body.get("name")).toBe("Lỗi công suất HPA");
  expect(body.get("description")).toBe("Tạo tình huống công suất HPA thấp để kiểm tra.");
  expect(body.get("difficulty")).toBe("intermediate");
  expect(body.getAll("files")).toHaveLength(1);
  accept!(reply({ job: { id: "job-submit", moduleId: "dme-320", name: "Lỗi công suất HPA", status: "queued", phase: "queued", createdAt: "2026-10-20T00:00:00Z", updatedAt: "2026-10-20T00:00:00Z" } }, 202));
  expect(await within(screen.getByRole("dialog")).findByText("Đang chờ xử lý")).toBeInTheDocument();
});

it.each([
  ["empty file", [new File([], "empty.txt")], /trống/],
  ["unsupported", [new File(["image"], "scan.png", { type: "image/png" })], /PDF.*DOCX.*TXT.*MD/],
  ["too many", Array.from({ length: 6 }, (_, index) => new File(["a"], `manual-${index}.txt`)), /5 tệp/],
  ["large file", [Object.defineProperty(new File(["a"], "manual.pdf"), "size", { value: 10 * 1024 * 1024 + 1 })], /10 MiB/],
  ["large total", Array.from({ length: 3 }, (_, index) => Object.defineProperty(new File(["a"], `manual-${index}.txt`), "size", { value: 9 * 1024 * 1024 })), /25 MiB/],
] as const)("rejects %s attachments before uploading and allows replacement", async (_name, files, message) => {
  const user = userEvent.setup();
  const fetcher = vi.fn((_url: string, init?: RequestInit) => Promise.resolve(reply(init?.method === "POST" ? {} : { jobs: [] })));
  vi.stubGlobal("fetch", fetcher);
  render(<AiScenarioDialog moduleId="dvor-1150" />);
  await user.click(screen.getByRole("button", { name: "Tạo kịch bản bằng AI" }));
  await user.type(screen.getByLabelText("Tên kịch bản"), "Lỗi Carrier");
  await user.type(screen.getByLabelText("Mô tả yêu cầu"), "Tình huống mất công suất.");
  fireEvent.change(screen.getByLabelText("Tài liệu đính kèm (không bắt buộc)"), { target: { files: [...files] } });
  expect(await screen.findByRole("alert")).toHaveTextContent(message);
  expect(screen.getByRole("button", { name: "Bắt đầu tạo" })).toBeDisabled();
  expect(fetcher.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);
  fireEvent.change(screen.getByLabelText("Tài liệu đính kèm (không bắt buộc)"), { target: { files: [new File(["manual"], "manual.md")] } });
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Bắt đầu tạo" })).toBeEnabled();
});

const savedJob = (overrides: Record<string, unknown> = {}) => ({
  id: "job-saved", moduleId: "dvor-220", name: "Lỗi Carrier đã lưu", status: "running", phase: "extracting",
  createdAt: "2026-10-20T00:00:00Z", updatedAt: "2026-10-20T00:00:00Z", ...overrides,
});

it("keeps completed-job notices off the page while retaining history inside the AI modal", async () => {
  const user = userEvent.setup();
  const onCompleted = vi.fn();
  const fetcher = vi.fn((_url: string, init?: RequestInit) => {
    if (init?.method && init.method !== "GET") throw new Error("History access must not mutate saved data");
    return Promise.resolve(reply(_url.includes("/job-saved") ? { job: savedJob({ status: "completed", phase: "completed", scenarioRowId: "saved-source" }) } : { jobs: [savedJob({ status: "completed", phase: "completed", scenarioRowId: "saved-source" })] }));
  });
  vi.stubGlobal("fetch", fetcher);
  render(<AiScenarioDialog moduleId="dvor-220" onCompleted={onCompleted} />);
  await waitFor(() => expect(onCompleted).toHaveBeenCalledTimes(1));
  expect(screen.queryByText("Yêu cầu AI gần đây")).not.toBeInTheDocument();
  expect(screen.queryByText("Hoàn tất · Chưa xuất bản")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Tạo kịch bản bằng AI" }));
  const modal = within(screen.getByRole("dialog"));
  await user.click(modal.getByText("Lịch sử yêu cầu AI"));
  await user.click(modal.getByRole("button", { name: "Xem tiến độ: Lỗi Carrier đã lưu" }));
  expect(modal.getByRole("link", { name: "Mở kịch bản để kiểm tra" })).toHaveAttribute("href", "/simulator/software/dvor-220?scenarioId=saved-source");
  await user.click(screen.getByRole("button", { name: "Đóng" }));
  expect(screen.getByText("Hoàn tất · Chưa xuất bản")).not.toBeVisible();
  expect(screen.queryByText("Lịch sử yêu cầu AI")).not.toBeInTheDocument();
  expect(fetcher.mock.calls.every(([, init]) => !init?.method || init.method === "GET")).toBe(true);
});

it("restores durable history inside the modal, polls real phases only while open, and refreshes completed source once", async () => {
  vi.useFakeTimers();
  let phase = "extracting";
  const fetcher = vi.fn((url: string) => Promise.resolve(reply(url.includes("/job-saved")
    ? { job: savedJob({ phase, status: phase === "completed" ? "completed" : "running", scenarioRowId: phase === "completed" ? "row-saved" : null }) }
    : { jobs: [savedJob({ phase })] })));
  vi.stubGlobal("fetch", fetcher);
  const onCompleted = vi.fn();
  const view = render(<AiScenarioDialog moduleId="dvor-220" onCompleted={onCompleted} />);
  await act(async () => {});
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Xem tiến độ: Lỗi Carrier đã lưu" })).not.toBeInTheDocument();
  const initial = fetcher.mock.calls.length;
  await act(async () => { await vi.advanceTimersByTimeAsync(6000); });
  expect(fetcher.mock.calls).toHaveLength(initial);
  fireEvent.click(screen.getByRole("button", { name: "Tạo kịch bản bằng AI" }));
  fireEvent.click(screen.getByText("Lịch sử yêu cầu AI"));
  fireEvent.click(screen.getByRole("button", { name: "Xem tiến độ: Lỗi Carrier đã lưu" }));
  await act(async () => {});
  expect(within(screen.getByRole("dialog")).getByText("Đang đọc tài liệu")).toBeInTheDocument();
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  phase = "generating";
  await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
  expect(within(screen.getByRole("dialog")).getByText("Đang tạo kịch bản")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
  await act(async () => {});
  const closed = fetcher.mock.calls.length;
  await act(async () => { await vi.advanceTimersByTimeAsync(9000); });
  expect(fetcher.mock.calls).toHaveLength(closed);
  phase = "validating";
  fireEvent.click(screen.getByRole("button", { name: "Tạo kịch bản bằng AI" }));
  fireEvent.click(screen.getByText("Lịch sử yêu cầu AI"));
  fireEvent.click(screen.getByRole("button", { name: "Xem tiến độ: Lỗi Carrier đã lưu" }));
  await act(async () => {});
  expect(within(screen.getByRole("dialog")).getByText("Đang kiểm tra kịch bản")).toBeInTheDocument();
  phase = "completed";
  await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
  const modal = within(screen.getByRole("dialog"));
  expect(modal.getByText("Hoàn tất · Chưa xuất bản")).toBeInTheDocument();
  expect(modal.getByRole("link", { name: "Mở kịch bản để kiểm tra" })).toHaveAttribute("href", "/simulator/software/dvor-220?scenarioId=row-saved");
  expect(onCompleted).toHaveBeenCalledTimes(1);
  const done = fetcher.mock.calls.length;
  await act(async () => { await vi.advanceTimersByTimeAsync(6000); });
  expect(fetcher.mock.calls).toHaveLength(done);
  view.rerender(<AiScenarioDialog moduleId="dvor-220" onCompleted={onCompleted} />);
  expect(onCompleted).toHaveBeenCalledTimes(1);
});

it("refreshes generic source and canonical library after a persisted job completes without publishing it", async () => {
  let complete = false;
  const source = { id: "row-generated", moduleId: "dvor-220", scenarioId: "generated", name: "Nguồn AI mới", description: "Mô tả", difficulty: "intermediate", schemaVersion: 1, definition: {}, sourceFileName: null, createdAt: "2026-10-20T00:00:00Z", updatedAt: "2026-10-20T00:00:00Z" };
  const fetcher = vi.fn((url: string) => Promise.resolve(reply(url.startsWith("/api/ai/") ?
    { jobs: [savedJob({ status: complete ? "completed" : "running", phase: complete ? "completed" : "generating", scenarioRowId: complete ? source.id : null })] } :
    url.startsWith("/api/scenario-libraries") ? { practice: [], exam: [] } : complete ? [source] : [])));
  vi.stubGlobal("fetch", fetcher);
  const user = userEvent.setup();
  render(<ScenarioManagementWorkspace moduleId="dvor-220" />);
  await waitFor(() => expect(fetcher.mock.calls.some(([url]) => url.startsWith("/api/ai/"))).toBe(true));
  complete = true;
  await user.click(screen.getByRole("button", { name: "Tạo kịch bản bằng AI" }));
  await user.click(screen.getByRole("button", { name: "Đóng" }));
  await waitFor(() => expect(screen.getByRole("button", { name: /Nguồn AI mới/ })).toBeInTheDocument());
  expect(screen.getByRole("checkbox", { name: "Nạp “Nguồn AI mới” vào Thư viện Ôn tập" })).not.toBeChecked();
  expect(fetcher.mock.calls.every(([url]) => !url.includes("publish"))).toBe(true);
});

it("offers AI alongside ADS-B manual actions and refreshes legacy and canonical sources on completion", async () => {
  const originalHydrate = useScenarioStore.getState().hydrate;
  const hydrate = vi.fn(() => { useScenarioStore.setState({ isHydrated: true }); });
  useScenarioStore.setState({ scenarios: [], isHydrated: true, storageError: null, hydrate });
  let complete = false;
  const fetcher = vi.fn((url: string) => Promise.resolve(reply(url.startsWith("/api/ai/") ? { jobs: [savedJob({ moduleId: "ads-b", status: complete ? "completed" : "running", phase: complete ? "completed" : "validating", scenarioId: "adsb-generated", scenarioRowId: "adsb-row" })] } : [])));
  vi.stubGlobal("fetch", fetcher);
  const user = userEvent.setup();
  try {
    render(<AdsbAdminDashboard />);
    expect(screen.getByRole("link", { name: "Tạo kịch bản ADS-B" })).toHaveAttribute("href", "/authoring/ads-b/create");
    const trigger = screen.getByRole("button", { name: "Tạo kịch bản bằng AI" });
    expect(trigger.parentElement).toContainElement(screen.getByRole("link", { name: "Tạo kịch bản ADS-B" }));
    await waitFor(() => expect(fetcher.mock.calls.some(([url]) => url.startsWith("/api/ai/"))).toBe(true));
    const initialCanonicalReads = fetcher.mock.calls.filter(([url]) => url === "/api/scenario-parameters").length;
    complete = true;
    await user.click(trigger);
    await waitFor(() => expect(hydrate).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(fetcher.mock.calls.filter(([url]) => url === "/api/scenario-parameters").length).toBeGreaterThan(initialCanonicalReads));
    await user.click(screen.getByRole("button", { name: "Đóng" }));
    await user.click(trigger);
    await user.click(screen.getByText("Lịch sử yêu cầu AI"));
    await user.click(screen.getByRole("button", { name: "Xem tiến độ: Lỗi Carrier đã lưu" }));
    expect(await within(screen.getByRole("dialog")).findByRole("link", { name: "Mở kịch bản để kiểm tra" })).toHaveAttribute("href", "/authoring/ads-b/edit?id=adsb-generated");
  } finally {
    cleanup();
    useScenarioStore.setState({ scenarios: [], isHydrated: false, storageError: null, hydrate: originalHydrate });
  }
});

it("uses a new idempotency key only after retrying a terminal failed job", async () => {
  const user = userEvent.setup();
  const requests: RequestInit[] = [];
  const failed = savedJob({ id: "job-failed", status: "failed", phase: "failed", errorCode: "OCR_REQUIRED", errorMessage: "/private/raw.txt API_KEY=secret" });
  vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
    if (init?.method === "POST") { requests.push(init); return Promise.resolve(reply({ job: failed }, 202)); }
    return Promise.resolve(reply(url.endsWith("/job-failed") ? { job: failed } : { jobs: requests.length ? [failed] : [] }));
  }));
  render(<AiScenarioDialog moduleId="dvor-220" />);
  await user.click(screen.getByRole("button", { name: "Tạo kịch bản bằng AI" }));
  await user.type(screen.getByLabelText("Tên kịch bản"), "Lỗi kiểm tra");
  await user.type(screen.getByLabelText("Mô tả yêu cầu"), "Tạo một kịch bản mới.");
  await user.upload(screen.getByLabelText("Tài liệu đính kèm (không bắt buộc)"), new File(["manual"], "manual.txt"));
  await user.click(screen.getByRole("button", { name: "Bắt đầu tạo" }));
  expect(await within(screen.getByRole("dialog")).findByRole("alert")).toHaveTextContent(/OCR/);
  expect(screen.queryByText(/private|API_KEY/)).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Tạo yêu cầu mới" }));
  expect(screen.getByLabelText("Tên kịch bản")).toHaveFocus();
  expect(screen.getByText("manual.txt")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Bắt đầu tạo" }));
  expect(requests).toHaveLength(2);
  expect(new Headers(requests[0].headers).get("Idempotency-Key")).not.toBe(new Headers(requests[1].headers).get("Idempotency-Key"));
  expect((requests[1].body as FormData).getAll("files")).toHaveLength(1);
});

it("unlocks a rejected request for correction and uses a new key without exposing server internals", async () => {
  const user = userEvent.setup();
  const requests: RequestInit[] = [];
  vi.stubGlobal("fetch", vi.fn((_url: string, init?: RequestInit) => {
    if (init?.method !== "POST") return Promise.resolve(reply({ jobs: [] }));
    requests.push(init);
    return Promise.resolve(reply({ error: "/private/raw.txt sk-secret", code: "INVALID_REQUEST" }, 400));
  }));
  render(<AiScenarioDialog moduleId="dme-1119a" />);
  await user.click(screen.getByRole("button", { name: "Tạo kịch bản bằng AI" }));
  await user.type(screen.getByLabelText("Tên kịch bản"), "Kịch bản thử");
  await user.type(screen.getByLabelText("Mô tả yêu cầu"), "Mô tả đầu tiên.");
  await user.click(screen.getByRole("button", { name: "Bắt đầu tạo" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/kiểm tra/i);
  expect(screen.getByLabelText("Tên kịch bản")).toBeEnabled();
  expect(screen.getByLabelText("Mô tả yêu cầu")).toBeEnabled();
  expect(screen.queryByText(/private|sk-secret/)).not.toBeInTheDocument();
  await user.type(screen.getByLabelText("Mô tả yêu cầu"), " Bổ sung yêu cầu.");
  await user.click(screen.getByRole("button", { name: "Bắt đầu tạo" }));
  expect(requests).toHaveLength(2);
  expect(new Headers(requests[0].headers).get("Idempotency-Key")).not.toBe(new Headers(requests[1].headers).get("Idempotency-Key"));
});

it("pauses bounded polling without cancelling the durable job and can resume", async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn(() => Promise.resolve(reply({ jobs: [savedJob()] })));
  vi.stubGlobal("fetch", fetcher);
  render(<AiScenarioDialog moduleId="dvor-220" />);
  await act(async () => {});
  fireEvent.click(screen.getByRole("button", { name: "Tạo kịch bản bằng AI" }));
  await act(async () => {});
  await act(async () => { await vi.advanceTimersByTimeAsync(600000); });
  expect(within(screen.getByRole("dialog")).getByText(/tạm dừng cập nhật tự động/)).toBeInTheDocument();
  const paused = fetcher.mock.calls.length;
  await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
  expect(fetcher.mock.calls).toHaveLength(paused);
  fireEvent.click(screen.getByRole("button", { name: "Tiếp tục cập nhật" }));
  await act(async () => {});
  expect(fetcher.mock.calls.length).toBeGreaterThan(paused);
});

it("shows a configured-provider rejection safely and keeps the draft editable", async () => {
  const user = userEvent.setup();
  vi.stubGlobal("fetch", vi.fn((_url: string, init?: RequestInit) => Promise.resolve(reply(init?.method === "POST" ? { code: "PROVIDER_NOT_CONFIGURED", error: "sk-provider-secret" } : { jobs: [] }, init?.method === "POST" ? 503 : 200))));
  render(<AiScenarioDialog moduleId="ads-b" />);
  await user.click(screen.getByRole("button", { name: "Tạo kịch bản bằng AI" }));
  await user.type(screen.getByLabelText("Tên kịch bản"), "Lỗi cảm biến");
  await user.type(screen.getByLabelText("Mô tả yêu cầu"), "Tạo tình huống cảm biến A.");
  await user.click(screen.getByRole("button", { name: "Bắt đầu tạo" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/chưa.*cấu hình|chưa.*bật/i);
  expect(screen.getByLabelText("Mô tả yêu cầu")).toBeEnabled();
  expect(screen.queryByText(/sk-provider-secret/)).not.toBeInTheDocument();
});

it("keeps restored progress visible when a poll fails instead of fabricating completion", async () => {
  vi.useFakeTimers();
  let offline = false;
  vi.stubGlobal("fetch", vi.fn(() => offline ? Promise.reject(new Error("offline")) : Promise.resolve(reply({ jobs: [savedJob()] }))));
  render(<AiScenarioDialog moduleId="dvor-220" />);
  await act(async () => {});
  fireEvent.click(screen.getByRole("button", { name: "Tạo kịch bản bằng AI" }));
  await act(async () => {});
  fireEvent.click(screen.getByText("Lịch sử yêu cầu AI"));
  offline = true;
  await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
  const modal = within(screen.getByRole("dialog"));
  expect(modal.getByText(/Chưa tải được tiến độ AI/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Xem tiến độ: Lỗi Carrier đã lưu" })).toBeInTheDocument();
  expect(modal.queryByText("Hoàn tất · Chưa xuất bản")).not.toBeInTheDocument();
});

it.each(["dvor-1150", "dvor-1150a", "dme-1119a", "dvor-220", "dme-320", "ads-b"] as const)("preselects the %s module and enforces the server description limit", async (moduleId) => {
  const user = userEvent.setup();
  render(<AiScenarioDialog moduleId={moduleId} />);
  await user.click(screen.getByRole("button", { name: "Tạo kịch bản bằng AI" }));
  const modal = within(screen.getByRole("dialog"));
  expect(modal.getByLabelText("Thiết bị")).toHaveValue(moduleId);
  expect(modal.getByLabelText("Mô tả yêu cầu")).toHaveAttribute("maxlength", "2000");
});
