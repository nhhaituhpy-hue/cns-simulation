import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AiScenarioDialog } from "@/components/scenario/ai-scenario-dialog";
import { AdsbAdminDashboard } from "@/modules/devices/adsb/admin-dashboard";
import { useScenarioStore } from "@/stores/scenario-store";
import { ScenarioManagementWorkspace } from "@/components/scenario/scenario-management-workspace";
import { authoringStateDto, createAuthoringState } from "@/lib/ai/scenario-authoring/state";
import type { AuthoringSession } from "@/lib/ai/scenario-authoring/types";

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


it("offers the two brief entry paths without creating a draft or exposing native defaults", async () => {
  const user = userEvent.setup();
  render(<AiScenarioDialog moduleId="dvor-220" />);
  await user.click(screen.getByRole("button", { name: "Tạo kịch bản bằng AI" }));
  expect(screen.getByRole("button", { name: "Tải tài liệu" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Mô tả tình huống" })).toBeEnabled();
  expect(screen.queryByRole("button", { name: "Dùng mặc định simulator" })).not.toBeInTheDocument();
  expect(vi.mocked(fetch).mock.calls.every(([, init]) => !init?.method || init.method === "GET")).toBe(true);
});

it.each(["documents", "description"] as const)("resumes, resets and explicitly creates through the real %s dialog path", async mode => {
  const saved: AuthoringSession = { id: "draft-saved", actorId: "test-admin", moduleId: "dvor-220", revision: 1, status: "editing", state: { ...createAuthoringState("dvor-220", "test-source"), mode, currentStep: "documents", context: "Mục tiêu đã lưu" }, documents: [], scenarioRowId: null, scenarioId: null, createdAt: "now", updatedAt: "now" };
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes("scenario-jobs")) return reply({ jobs: [] });
    if (url.includes("?moduleId=")) return reply({ sessions: [{ id: saved.id, name: "Bản nháp cũ", status: "editing" }] });
    if (init?.method === "DELETE") return reply({ deleted: true });
    return reply({ session: authoringStateDto(saved, null) });
  });
  vi.stubGlobal("fetch", fetcher);
  const user = userEvent.setup();
  render(<AiScenarioDialog moduleId="dvor-220" />);
  await user.click(screen.getByRole("button", { name: "Tạo kịch bản bằng AI" }));
  await user.click(screen.getByRole("button", { name: mode === "description" ? "Mô tả tình huống" : "Tải tài liệu" }));
  await user.click(await screen.findByRole("button", { name: "Tiếp tục: Bản nháp cũ" }));
  expect(fetcher.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);
  await user.click(screen.getByRole("button", { name: "Xóa & tạo lại từ đầu" }));
  const contextLabel = mode === "description" ? "Mô tả tình huống" : "Mục tiêu huấn luyện (không bắt buộc)";
  expect(screen.getByLabelText(contextLabel)).toHaveValue("");
  expect(fetcher.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);
  fireEvent.change(screen.getByLabelText(contextLabel), { target: { value: "Luyện khôi phục công suất." } });
  const file = new File(["Synthetic test document"], "manual.txt");
  if (mode === "documents") fireEvent.change(screen.getByLabelText("Tài liệu thông số nền"), { target: { files: [file] } });
  await user.click(screen.getByRole("button", { name: "AI soạn kịch bản" }));
  const posts = fetcher.mock.calls.filter(([, init]) => init?.method === "POST");
  expect(posts).toHaveLength(1);
  expect(posts[0][0]).toBe("/api/ai/scenario-authoring");
  const body = posts[0][1]!.body as FormData;
  expect(body.get("mode")).toBe(mode);
  expect(body.get("context")).toBe("Luyện khôi phục công suất.");
  expect(body.get("moduleId")).toBe("dvor-220");
  expect(body.getAll("files")).toEqual(mode === "documents" ? [file] : []);
});

it("keeps dirty pending close decisions inside the real dialog and resumes the saved draft afterwards", async () => {
  const saved: AuthoringSession = { id: "draft-saved", actorId: "test-admin", moduleId: "dvor-220", revision: 1, status: "editing", state: createAuthoringState("dvor-220", "test-source"), documents: [], scenarioRowId: null, scenarioId: null, createdAt: "now", updatedAt: "now" };
  const dto = { ...authoringStateDto(saved, null), analysis: { id: "a1", status: "running", errorCode: null } };
  const fetcher = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async url => reply(url.includes("scenario-jobs") ? { jobs: [] } : url.includes("?moduleId=") ? { sessions: [{ id: saved.id, name: "Bản nháp cũ", status: "editing" }] } : { session: dto }));
  vi.stubGlobal("fetch", fetcher);
  const user = userEvent.setup();
  render(<AiScenarioDialog moduleId="dvor-220" />);
  const open = async () => {
    await user.click(screen.getByRole("button", { name: "Tạo kịch bản bằng AI" }));
    await user.click(screen.getByRole("button", { name: "Mô tả tình huống" }));
    await user.click(await screen.findByRole("button", { name: "Tiếp tục: Bản nháp cũ" }));
  };
  await open();
  fireEvent.change(screen.getByLabelText("Tên kịch bản"), { target: { value: "Chưa lưu" } });
  fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
  await user.click(await screen.findByRole("button", { name: "Giữ bản chỉnh và tiếp tục" }));
  expect(screen.getByLabelText("Tên kịch bản")).toHaveValue("Chưa lưu");
  await user.click(screen.getByRole("button", { name: "Đóng" }));
  await user.click(screen.getByRole("button", { name: "Bỏ thay đổi chưa lưu và đóng" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await open();
  expect(screen.getByLabelText("Tên kịch bản")).not.toHaveValue("Chưa lưu");
  expect(fetcher.mock.calls.every(([, init]) => !init?.method || init.method === "GET")).toBe(true);
});

const savedJob = (overrides: Record<string, unknown> = {}) => ({id:"job-saved",moduleId:"dvor-220",name:"Lỗi Carrier đã lưu",status:"running",phase:"extracting",createdAt:"2026-10-20T00:00:00Z",updatedAt:"2026-10-20T00:00:00Z",...overrides});
it.each(["dvor-1150","dvor-1150a","dme-1119a","dvor-220","dme-320","ads-b"] as const)("starts document-first %s wizard with template, description choice and no immediate generation",async moduleId=>{
 const user=userEvent.setup();render(<AiScenarioDialog moduleId={moduleId}/>);await user.click(screen.getByRole("button",{name:"Tạo kịch bản bằng AI"}));
 expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
 expect(screen.getByRole("button",{name:"Tải tài liệu"})).toBeEnabled();
 expect(screen.getByRole("button",{name:"Mô tả tình huống"})).toBeEnabled();
 await user.click(screen.getByRole("button",{name:"Tải tài liệu"}));
 const modal=within(screen.getByRole("dialog"));
 expect(modal.getByRole("button",{name:"Chọn tệp"})).toBeVisible();
 expect(modal.getByTestId("selected-files-status")).toHaveTextContent("Không có tệp nào được chọn");
 expect(modal.getByRole("button",{name:"AI soạn kịch bản"})).toBeDisabled();
 expect(modal.queryByRole("button",{name:"Dùng mặc định simulator"})).not.toBeInTheDocument();
 expect(modal.getByRole("link",{name:"Tải mẫu thông số nền (.docx)"})).toHaveAttribute("href",`/templates/ai-scenario-${moduleId}.docx`);expect(modal.queryByLabelText("Tên kịch bản")).not.toBeInTheDocument();expect(modal.queryByRole("button",{name:"Bắt đầu tạo"})).not.toBeInTheDocument();expect(vi.mocked(fetch).mock.calls.every(([,init])=>!init?.method||init.method==="GET")).toBe(true);
});
it.each([ ["empty",[new File([],"empty.txt")],/trống/], ["unsupported",[new File(["x"],"scan.png")],/PDF.*DOCX/], ["count",Array.from({length:6},(_,i)=>new File(["x"],`${i}.txt`)),/5 tệp/], ["size",[Object.defineProperty(new File(["x"],"large.pdf"),"size",{value:10485761})],/10 MiB/], ["total",Array.from({length:3},(_,i)=>Object.defineProperty(new File(["x"],`${i}.txt`),"size",{value:9437184})),/25 MiB/] ] as const)("rejects %s upload without submitting",async(_label,files,message)=>{render(<AiScenarioDialog moduleId="dvor-1150a"/>);fireEvent.click(screen.getByRole("button",{name:"Tạo kịch bản bằng AI"}));fireEvent.click(screen.getByRole("button",{name:"Tải tài liệu"}));fireEvent.change(screen.getByLabelText("Tài liệu thông số nền"),{target:{files:[...files]}});expect(await screen.findByRole("alert")).toHaveTextContent(message);expect(screen.getByRole("button",{name:"AI soạn kịch bản"})).toBeDisabled();expect(vi.mocked(fetch).mock.calls.every(([,init])=>!init?.method||init.method==="GET")).toBe(true);});
it("uses only the AI trigger and refreshes only unpublished sources",async()=>{
 const source={id:"row-generated",moduleId:"dvor-220",scenarioId:"generated",name:"Nguồn AI mới",description:"Mô tả",difficulty:"intermediate",schemaVersion:1,definition:{},sourceFileName:null,createdAt:"2026-10-20T00:00:00Z",updatedAt:"2026-10-20T00:00:00Z"};let complete=false;
 const fetcher=vi.fn((url:string)=>Promise.resolve(reply(url.includes("scenario-authoring")?{sessions:[]}:url.includes("scenario-jobs")?{jobs:[savedJob({status:"completed",phase:"completed",scenarioRowId:source.id})]}:url.includes("scenario-libraries")?{practice:[],exam:[]}:complete?[source]:[])));vi.stubGlobal("fetch",fetcher);
 render(<ScenarioManagementWorkspace moduleId="dvor-220"/>);const trigger=await screen.findByRole("button",{name:"Tạo kịch bản bằng AI"});expect(screen.queryByRole("button",{name:"Thêm"})).not.toBeInTheDocument();complete=true;fireEvent.click(trigger);await screen.findByRole("button",{name:/Nguồn AI mới/});expect(screen.getByRole("checkbox",{name:"Nạp “Nguồn AI mới” vào Thư viện Ôn tập"})).not.toBeChecked();expect(fetcher.mock.calls.every(([url])=>!url.includes("publish"))).toBe(true);
});
it("uses only AI creation for ADS-B and refreshes canonical plus legacy sources on completion",async()=>{
 const original=useScenarioStore.getState().hydrate;const hydrate=vi.fn(()=>useScenarioStore.setState({isHydrated:true}));useScenarioStore.setState({scenarios:[],isHydrated:true,storageError:null,hydrate});
 const fetcher=vi.fn((url:string)=>Promise.resolve(reply(url.includes("scenario-authoring")?{sessions:[]}:url.includes("scenario-jobs")?{jobs:[savedJob({moduleId:"ads-b",status:"completed",phase:"completed",scenarioId:"adsb-generated",scenarioRowId:"row"})]}:[])));vi.stubGlobal("fetch",fetcher);
 try{render(<AdsbAdminDashboard/>);expect(screen.queryByRole("link",{name:/Tạo kịch bản/})).not.toBeInTheDocument();fireEvent.click(screen.getByRole("button",{name:"Tạo kịch bản bằng AI"}));await waitFor(()=>expect(hydrate).toHaveBeenCalledTimes(2));expect(fetcher.mock.calls.filter(([url])=>url==="/api/scenario-parameters").length).toBeGreaterThan(1);}finally{cleanup();useScenarioStore.setState({scenarios:[],isHydrated:false,storageError:null,hydrate:original});}
});
it("polls historical jobs only inside the open modal without inventing completion",async()=>{
 vi.useFakeTimers();let done=false;const fetcher=vi.fn((url:string)=>Promise.resolve(reply(url.includes("scenario-authoring")?{sessions:[]}: {jobs:[savedJob(done?{status:"completed",phase:"completed",scenarioRowId:"source"}:{})]})));vi.stubGlobal("fetch",fetcher);const completed=vi.fn();render(<AiScenarioDialog moduleId="dvor-220" onCompleted={completed}/>);await act(async()=>{});expect(fetcher).not.toHaveBeenCalled();fireEvent.click(screen.getByRole("button",{name:"Tạo kịch bản bằng AI"}));await act(async()=>{});expect(completed).not.toHaveBeenCalled();const initial=fetcher.mock.calls.length;await act(async()=>{await vi.advanceTimersByTimeAsync(3000);});expect(fetcher.mock.calls.length).toBeGreaterThan(initial);done=true;await act(async()=>{await vi.advanceTimersByTimeAsync(3000);});expect(completed).toHaveBeenCalledTimes(1);fireEvent.click(screen.getByRole("button",{name:"Đóng"}));await act(async()=>{});const closed=fetcher.mock.calls.length;await act(async()=>{await vi.advanceTimersByTimeAsync(9000);});expect(fetcher.mock.calls).toHaveLength(closed);
});
const persistedReview = () => ({
  version: 2, configuredFieldCount: 16,
  initial: [{ fieldId: "config.power", label: "Công suất đã lưu", value: 23, unit: "W", citation: 4 }],
  recovery: [{ fieldId: "config.power", value: 100, unit: "W" }],
  verification: { mode: "engine-recovery", initial: [{ id: "fault", passed: true, detail: "Cảnh báo ban đầu" }], recovered: [{ id: "clear", passed: true, detail: "Khôi phục trong engine" }], recoveryVerified: true, notes: ["Giám khảo kiểm tra trước khi xuất bản."] },
  workerKey: "worker-secret", citations: [{ path: "/private/source" }],
});

it("reviews persisted settings alongside the completed scenario link and retains no provider internals", async () => {
  const completed = savedJob({ status: "completed", phase: "completed", scenarioRowId: "saved-source", parameterReview: persistedReview(), provenance: { workerKey: "worker-secret" } });
  vi.stubGlobal("fetch", vi.fn((url: string) => Promise.resolve(reply(url.includes("/job-saved") ? { job: completed } : { jobs: [completed] }))));
  const onCompleted = vi.fn();
  render(<AiScenarioDialog moduleId="dvor-220" onCompleted={onCompleted} />);


  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Tạo kịch bản bằng AI" }));
  await user.click(screen.getByRole("button", { name: "Tải tài liệu" }));
  const modal = within(screen.getByRole("dialog"));
  const history = await modal.findByText("Lịch sử yêu cầu AI trước đây");
  expect(history.closest("details")).not.toHaveAttribute("open");
  await user.click(history);
  await waitFor(() => expect(onCompleted).toHaveBeenCalledTimes(1));
  expect(JSON.stringify(onCompleted.mock.calls[0][0])).not.toMatch(/worker-secret|private|citation|provenance|configuredFieldCount/);
  await user.click(modal.getByRole("button", { name: "Xem tiến độ: Lỗi Carrier đã lưu" }));
  const panel = within(await modal.findByRole("region", { name: "Cấu hình Scenario Parameters" }));
  expect(panel.getByText("Công suất đã lưu")).toBeVisible();
  expect(panel.getByText("23 W")).toBeVisible();
  expect(modal.getByRole("link", { name: "Mở kịch bản cũ để kiểm tra" })).toBeInTheDocument();
  expect(panel.getByText("100 W")).not.toBeVisible();
  await user.click(panel.getByText("Kế hoạch khôi phục và kiểm tra"));
  expect(panel.getByText("100 W")).toBeVisible();
  expect(panel.getByText("Khôi phục trong engine")).toBeVisible();
  expect(modal.queryByText(/worker-secret|private/)).not.toBeInTheDocument();
});

it.each([undefined, { ...persistedReview(), initial: [{ fieldId: "config.power", value: { secret: true } }] }])("omits parameter review for legacy or malformed summaries without fabricating settings", async (parameterReview) => {
  const completed = savedJob({ status: "completed", phase: "completed", scenarioRowId: "saved-source", parameterReview });
  const onCompleted = vi.fn();
  vi.stubGlobal("fetch", vi.fn((url: string) => Promise.resolve(reply(url.includes("/job-saved") ? { job: completed } : { jobs: [completed] }))));
  render(<AiScenarioDialog moduleId="dvor-220" onCompleted={onCompleted} />);

  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Tạo kịch bản bằng AI" }));
  await user.click(screen.getByRole("button", { name: "Tải tài liệu" }));
  const modal = within(screen.getByRole("dialog"));
  await user.click(modal.getByText("Lịch sử yêu cầu AI trước đây"));
  await user.click(modal.getByRole("button", { name: "Xem tiến độ: Lỗi Carrier đã lưu" }));
  expect(modal.getByRole("link", { name: "Mở kịch bản cũ để kiểm tra" })).toBeInTheDocument();
  expect(modal.queryByRole("region", { name: "Cấu hình Scenario Parameters" })).not.toBeInTheDocument();
  expect(onCompleted.mock.calls[0][0].parameterReview).toBeUndefined();
});

it.each([
  ["INVALID_PARAMETERS", /giá trị.*không hợp lệ.*kiểm tra/i],
  ["INVALID_PARAMETER_UNIT", /đơn vị.*kiểm tra/i],
  ["UNGROUNDED_PARAMETER", /nguồn.*giá trị.*bổ sung/i],
  ["UNHANDLED_PARAMETER", /chưa.*đáp ứng.*tách/i],
  ["INVALID_RECOVERY", /khôi phục.*điều chỉnh/i],
  ["UNSUPPORTED_PARAMETERS", /chưa.*hỗ trợ.*thủ công/i],
  ["REQUEST_TOO_COMPLEX", /quá nhiều.*tách/i],
] as const)("shows an actionable safe message for %s without exposing diagnostics or a review panel", async (errorCode, message) => {
  const failed = savedJob({ status: "failed", phase: "failed", errorCode, errorMessage: "/private/source worker-secret", parameterReview: persistedReview() });
  vi.stubGlobal("fetch", vi.fn((url: string) => Promise.resolve(reply(url.includes("/job-saved") ? { job: failed } : { jobs: [failed] }))));
  render(<AiScenarioDialog moduleId="dvor-220" />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Tạo kịch bản bằng AI" }));
  await user.click(screen.getByRole("button", { name: "Tải tài liệu" }));
  const modal = within(screen.getByRole("dialog"));
  await user.click(await modal.findByText("Lịch sử yêu cầu AI trước đây"));
  await user.click(modal.getByRole("button", { name: "Xem tiến độ: Lỗi Carrier đã lưu" }));
  expect(modal.getByRole("alert")).toHaveTextContent(message);
  expect(modal.queryByText(/private|worker-secret/)).not.toBeInTheDocument();
  expect(modal.queryByRole("region", { name: "Cấu hình Scenario Parameters" })).not.toBeInTheDocument();
});

it("does not close the AI scenario modal when the user cancels the native file picker", async () => {
  const user = userEvent.setup();
  render(<AiScenarioDialog moduleId="dvor-220" />);
  await user.click(screen.getByRole("button", { name: "Tạo kịch bản bằng AI" }));
  await user.click(screen.getByRole("button", { name: "Tải tài liệu" }));
  const dialog = screen.getByRole("dialog");
  const fileInput = within(dialog).getByLabelText("Tài liệu thông số nền");

  await act(async () => {
    fireEvent.click(fileInput);
    fireEvent(fileInput, new Event("cancel", { bubbles: true, cancelable: true }));
  });

  expect(screen.getByRole("dialog")).toBeVisible();
  expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Chọn tệp" })).toBeVisible();
  expect(within(screen.getByRole("dialog")).getByTestId("selected-files-status")).toHaveTextContent("Không có tệp nào được chọn");
});

it("lets the user delete a previous AI job from LegacyHistory", async () => {
  const job = savedJob({ status: "failed", phase: "failed", errorCode: "INVALID_PARAMETERS" });
  const fetcher = vi.fn((url: string, init?: RequestInit) => {
    if (init?.method === "DELETE") return Promise.resolve(reply({ deleted: true, id: job.id }));
    return Promise.resolve(reply(url.includes("scenario-authoring") ? { sessions: [] } : { jobs: [job] }));
  });
  vi.stubGlobal("fetch", fetcher);
  const user = userEvent.setup();
  render(<AiScenarioDialog moduleId="dvor-220" />);
  await user.click(screen.getByRole("button", { name: "Tạo kịch bản bằng AI" }));
  await user.click(screen.getByRole("button", { name: "Tải tài liệu" }));
  const modal = within(screen.getByRole("dialog"));
  await user.click(await modal.findByText("Lịch sử yêu cầu AI trước đây"));
  expect(await modal.findByText("Lỗi Carrier đã lưu")).toBeVisible();

  await user.click(modal.getByRole("button", { name: "Xóa yêu cầu: Lỗi Carrier đã lưu" }));
  await waitFor(() => expect(modal.queryByText("Lỗi Carrier đã lưu")).not.toBeInTheDocument());
  expect(fetcher).toHaveBeenCalledWith(
    `/api/ai/scenario-jobs/${job.id}`,
    expect.objectContaining({ method: "DELETE" }),
  );
});
