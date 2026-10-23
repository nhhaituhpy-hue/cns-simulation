import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScenarioStore } from "@/stores/scenario-store";
import { PracticeAiHints } from "@/components/scenario/practice-ai-hints";
const json=(data:unknown)=>new Response(JSON.stringify(data),{headers:{"content-type":"application/json"}});
const props={moduleId:"dvor-1150a" as const,scenarioId:"published",attemptKey:"run",getPayload:()=>({password:"private",note:"Password:\nprivate",checkpoint:{value:1}})};
const reference={id:"monitor-reference",documentId:"monitor-manual",documentName:"DVOR1150A.pdf",sha256:"a".repeat(64),segmentLabel:"Trang 12",quote:"Monitor compares measurements with configured limits.",sourceKind:"uploaded" as const};
beforeEach(()=>useScenarioStore.setState({sessionIdentity:"owner",sessionScope:"practice"}));
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.useRealTimers();});
describe("right-column practice tutoring",()=>{
 it("advertises the native DTO only in GET headers on every poll and read-only retry",async()=>{
  vi.useFakeTimers();
  const answer="Monitor đối chiếu giá trị đo với ngưỡng đã cấu hình.";
  const fetcher=vi.spyOn(globalThis,"fetch")
   .mockResolvedValueOnce(json({jobId:"versioned",status:"queued"}))
   .mockResolvedValueOnce(json({status:"running"}))
   .mockRejectedValueOnce(Error("read failed"))
   .mockResolvedValueOnce(json({status:"completed",result:{sourceMode:"knowledge-only",kind:"answer",answer,summary:"Nguồn đã đối chiếu",nextSteps:[],notice:"Giới hạn nguồn"}}));
  render(<PracticeAiHints {...props}/>);
  fireEvent.click(screen.getByRole("button",{name:"Gợi ý một bước"}));
  await act(async()=>{await vi.advanceTimersByTimeAsync(2000);});
  expect(screen.getByRole("button",{name:"Tải lại gợi ý"})).toBeEnabled();
  fireEvent.click(screen.getByRole("button",{name:"Tải lại gợi ý"}));
  await act(async()=>{await vi.advanceTimersByTimeAsync(0);});
  expect(screen.getByText(answer)).toBeVisible();
  const reads=fetcher.mock.calls.filter(call=>call[1]?.method!=='POST');
  expect(reads).toHaveLength(3);
  for(const [url,init] of reads){
   expect(url).toBe("/api/ai/practice-hints?jobId=versioned");
   expect(new Headers(init?.headers).get("X-CNS-Hint-Version")).toBe("2");
   expect(init?.body).toBeUndefined();
  }
  const posts=fetcher.mock.calls.filter(call=>call[1]?.method==='POST');
  expect(posts).toHaveLength(1);
  expect(Object.keys(JSON.parse(String(posts[0][1]?.body))).sort()).toEqual(["moduleId","payload","question","runKey","scenarioId"]);
 });
 it.each(["ai-assisted","deterministic-only"])("renders an old worker's unversioned %s result while requesting the new DTO",async(sourceMode)=>{
  const legacy={sourceMode,summary:"Legacy summary",nextSteps:["Đối chiếu Monitor từ worker cũ."],notice:"Legacy notice"};
  const fetcher=vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({jobId:"old-worker",status:"queued"})).mockResolvedValueOnce(json({status:"completed",result:legacy}));
  render(<PracticeAiHints {...props}/>);
  fireEvent.click(screen.getByRole("button",{name:"Gợi ý một bước"}));
  expect(await screen.findByText(legacy.nextSteps[0])).toBeVisible();
  expect(new Headers(fetcher.mock.calls[1][1]?.headers).get("X-CNS-Hint-Version")).toBe("2");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
 });
 it("renders an actual tutor answer separately from next steps without technical copy",async()=>{
  const answer="Monitor đối chiếu giá trị đo với ngưỡng đã cấu hình.";
  const summary="Trả lời theo nguồn đã đối chiếu.";
  const notice="AI chọn một bước; Chưa có rubric công bố; Không phải chấm bài.";
  vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({jobId:"answer",status:"queued"})).mockResolvedValueOnce(json({status:"completed",result:{sourceMode:"ai-assisted",kind:"answer",answer,summary,nextSteps:["Đối chiếu trạng thái Monitor."],notice}}));
  render(<PracticeAiHints {...props}/>);
  fireEvent.change(screen.getByRole("textbox"),{target:{value:"Chức năng của Monitor là gì?"}});
  fireEvent.click(screen.getByRole("button"));
  expect(await screen.findByText(answer)).toBeVisible();
  expect(screen.getAllByText(answer)).toHaveLength(1);
  expect(screen.getByText(answer).closest("li")).toBeNull();
  expect(screen.getByText("Đối chiếu trạng thái Monitor.")).toBeVisible();
  expect(screen.queryByText(summary)).not.toBeInTheDocument();
  expect(screen.queryByText(notice)).not.toBeInTheDocument();
  expect(screen.getByText(/Dữ liệu đã lọc sẽ gửi tới dịch vụ AI được cấu hình\./)).toBeVisible();
 });
 it("keeps verified source names and pages in a compact disclosure for knowledge-only answers",async()=>{
  const answer="Chỉ dùng tài khoản huấn luyện của simulator.";
  const fetcher=vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({jobId:"knowledge",status:"queued"})).mockResolvedValueOnce(json({status:"completed",result:{sourceMode:"knowledge-only",kind:"answer",answer,references:[reference,{...reference,id:"training-reference",documentName:"Ghi chú huấn luyện",segmentLabel:"Mục Monitor",sourceKind:"reference-only"}],summary:"Nguồn huấn luyện đã đối chiếu.",nextSteps:[],notice:"Không phải chấm bài; AI chưa khả dụng."}}));
  const view=render(<PracticeAiHints {...props}/>);
  fireEvent.change(screen.getByRole("textbox"),{target:{value:"Tài khoản PMDT mô phỏng là gì?"}});
  fireEvent.click(screen.getByRole("button"));
  expect(await screen.findByText(answer)).toBeVisible();
  const disclosure=screen.getByText("Nguồn tham khảo").closest("details");
  expect(disclosure).not.toBeNull();
  expect(disclosure).not.toHaveAttribute("open");
  fireEvent.click(screen.getByText("Nguồn tham khảo"));
  expect(disclosure).toHaveAttribute("open");
  expect(screen.getByText("DVOR1150A.pdf · Trang 12")).toBeVisible();
  expect(screen.getByText("Ghi chú huấn luyện · Mục Monitor")).toBeVisible();
  expect(screen.getByText("Nguồn huấn luyện")).toBeVisible();
  expect(screen.getAllByText(reference.quote)).toHaveLength(2);
  expect(screen.queryByText(reference.sha256)).not.toBeInTheDocument();
  expect(screen.queryByText(/AI chưa khả dụng|Không phải chấm bài|Nguồn huấn luyện đã đối chiếu/)).not.toBeInTheDocument();
  expect(view.container.querySelector("ul")).not.toBeInTheDocument();
  expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body)).question).toBe("Tài khoản PMDT mô phỏng là gì?");
 });
 it.each(["id","documentId","documentName","sha256","segmentLabel","quote","sourceKind"])("rejects malformed reference %s before displaying any result",async(field)=>{
  const fetcher=vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({jobId:"invalid-reference",status:"queued"})).mockResolvedValueOnce(json({status:"completed",result:{sourceMode:"ai-assisted",kind:"answer",answer:"Untrusted answer",references:[{...reference,[field]:42}],summary:"Internal summary",nextSteps:["Untrusted step"],notice:"Internal notice"}}));
  render(<PracticeAiHints {...props}/>);
  fireEvent.click(screen.getByRole("button",{name:"Gợi ý một bước"}));
  expect(await screen.findByRole("alert")).toHaveTextContent("Kết quả gợi ý không hợp lệ.");
  expect(screen.queryByText(/Untrusted answer|Untrusted step|Internal summary|Internal notice|Nguồn tham khảo/)).not.toBeInTheDocument();
  expect(screen.getByRole("button",{name:"Tải lại gợi ý"})).toBeEnabled();
  expect(fetcher.mock.calls.filter(call=>call[1]?.method==='POST')).toHaveLength(1);
 });
 it.each([
  {label:"numeric answer",fields:{answer:42}},
  {label:"object answer",fields:{answer:{text:"Untrusted answer"}}},
  {label:"null answer",fields:{answer:null}},
  {label:"unknown answer kind",fields:{kind:"knowledge"}},
  {label:"null answer kind",fields:{kind:null}},
  {label:"null references",fields:{references:null}},
  {label:"non-array references",fields:{references:{quote:"Untrusted quote"}}},
  {label:"null reference entry",fields:{references:[null]}},
  {label:"missing reference fields",fields:{references:[{id:"incomplete"}]}},
  {label:"object reference quote",fields:{references:[{...reference,quote:{text:"Untrusted quote"}}]}},
  {label:"unknown reference source kind",fields:{references:[{...reference,sourceKind:"manual"}]}},
  {label:"unknown source mode",fields:{sourceMode:"unknown"}},
  {label:"missing summary",fields:{summary:undefined}},
  {label:"non-string next step",fields:{nextSteps:[42]}},
  {label:"missing notice",fields:{notice:undefined}},
 ])("rejects $label without rendering partial result text",async({fields})=>{
  vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({jobId:"invalid-answer",status:"queued"})).mockResolvedValueOnce(json({status:"completed",result:{sourceMode:"ai-assisted",kind:"answer",answer:"Untrusted answer",summary:"Internal summary",nextSteps:["Untrusted step"],notice:"Internal notice",...fields}}));
  render(<PracticeAiHints {...props}/>);
  fireEvent.click(screen.getByRole("button",{name:"Gợi ý một bước"}));
  expect(await screen.findByRole("alert")).toHaveTextContent("Kết quả gợi ý không hợp lệ.");
  expect(screen.queryByText(/Untrusted answer|Untrusted step|Internal summary|Internal notice/)).not.toBeInTheDocument();
 });
 it("labels nonempty questions as Hỏi AI and keeps the step label for blank input",()=>{
  const fetcher=vi.spyOn(globalThis,"fetch");
  render(<PracticeAiHints {...props}/>);
  expect(screen.getByRole("button",{name:"Gợi ý một bước"})).toBeEnabled();
  fireEvent.change(screen.getByRole("textbox"),{target:{value:"  Chức năng Monitor là gì?  "}});
  expect(screen.getByRole("button",{name:"Hỏi AI"})).toBeEnabled();
  fireEvent.change(screen.getByRole("textbox"),{target:{value:" \n "}});
  expect(screen.getByRole("button",{name:"Gợi ý một bước"})).toBeEnabled();
  expect(screen.getByRole("heading",{name:"Gợi ý từ AI"})).toBeVisible();
  expect(fetcher).not.toHaveBeenCalled();
 });
 it.each(["Password:\nui-private-credential","API key: ui-private-credential"])("sanitizes a blocked question before posting: %s",async(question)=>{
  const fetcher=vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({jobId:"blocked",status:"queued"})).mockResolvedValueOnce(json({status:"completed",result:{sourceMode:"knowledge-only",kind:"answer",answer:"Không hỗ trợ thông tin nhạy cảm.",summary:"Thông tin huấn luyện",nextSteps:[],references:[],notice:"Giới hạn nguồn"}}));
  render(<PracticeAiHints {...props}/>);
  fireEvent.change(screen.getByRole("textbox"),{target:{value:question}});
  fireEvent.click(screen.getByRole("button",{name:"Hỏi AI"}));
  expect(await screen.findByText("Không hỗ trợ thông tin nhạy cảm.")).toBeVisible();
  const body=String(fetcher.mock.calls[0][1]?.body);
  expect(JSON.parse(body).question).toBe("[Câu hỏi về thông tin nhạy cảm không được hỗ trợ]");
  expect(body).not.toContain("ui-private-credential");
  expect(body).not.toMatch(/password|private/);
 });
 it("shows the suggested step without repeated technical explanations",async()=>{
  const summary="Gợi ý bước tiếp theo từ bằng chứng mô phỏng.";
  const notice="AI chọn một bước trong các gợi ý đã đối chiếu bằng engine. Chưa có rubric công bố; chỉ đối chiếu trạng thái native, không suy quy trình hoặc số bước đúng. Không phải chấm bài; không tự áp dụng cấu hình.";
  vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({jobId:"concise",status:"queued"})).mockResolvedValueOnce(json({status:"completed",result:{sourceMode:"ai-assisted",summary,nextSteps:["Đối chiếu Monitor"],notice}}));
  render(<PracticeAiHints {...props}/>);
  expect(screen.getByText(/Dữ liệu đã lọc sẽ gửi tới dịch vụ AI được cấu hình\./)).toBeVisible();
  expect(screen.getByRole("textbox",{name:"Câu hỏi (không bắt buộc)"})).toBeEnabled();
  fireEvent.click(screen.getByRole("button",{name:"Gợi ý một bước"}));
  expect(await screen.findByText("Đối chiếu Monitor")).toBeVisible();
  expect(screen.queryByText(summary)).not.toBeInTheDocument();
  expect(screen.queryByText(/AI hỗ trợ lựa chọn bước|AI chọn một bước|Chưa có rubric công bố|Không phải chấm bài|Gợi ý một bước từ bài ôn tập/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Gợi ý hệ thống/)).not.toBeInTheDocument();
 });
 it("identifies the system fallback briefly while preserving its actual step",async()=>{
  vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({jobId:"fallback",status:"queued"})).mockResolvedValueOnce(json({status:"completed",result:{sourceMode:"deterministic-only",summary:"Gợi ý bước tiếp theo từ bằng chứng mô phỏng.",nextSteps:["Kiểm tra trạng thái Monitor trước khi đổi cấu hình."],notice:"Gợi ý tất định; AI chưa khả dụng. Chưa có rubric công bố; chỉ đối chiếu trạng thái native, không suy quy trình hoặc số bước đúng."}}));
  render(<PracticeAiHints {...props}/>);
  fireEvent.click(screen.getByRole("button",{name:"Gợi ý một bước"}));
  expect(await screen.findByText("Kiểm tra trạng thái Monitor trước khi đổi cấu hình.")).toBeVisible();
  expect(screen.getByText("Gợi ý hệ thống · AI chưa khả dụng.")).toBeVisible();
  expect(screen.queryByText(/Chưa có rubric công bố|Phân tích tất định|Gợi ý bước tiếp theo từ bằng chứng/)).not.toBeInTheDocument();
  expect(screen.getByRole("button",{name:"Gợi ý một bước"})).toBeEnabled();
 });
 it("never calls automatically, freezes sanitized request on click and polls the dedicated hint job",async()=>{
  const fetcher=vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({jobId:"hint-one",status:"queued"})).mockResolvedValueOnce(json({jobId:"hint-one",status:"completed",result:{sourceMode:"ai-assisted",summary:"Bước tiếp theo",nextSteps:["Đối chiếu Monitor"],notice:"Không chấm điểm"}}));
  render(<PracticeAiHints {...props} libraryMembershipId="44444444-4444-4444-8444-444444444444"/>);
  expect(screen.getByRole("heading",{name:"Gợi ý từ AI"})).toBeInTheDocument();expect(fetcher).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole("textbox"),{target:{value:"Tôi kiểm tra gì?"}});fireEvent.click(screen.getByRole("button",{name:"Hỏi AI"}));
  expect(await screen.findByText("Đối chiếu Monitor")).toBeInTheDocument();
  expect(fetcher.mock.calls[0][0]).toBe("/api/ai/practice-hints");expect(fetcher.mock.calls[1][0]).toBe("/api/ai/practice-hints?jobId=hint-one");
  const body=String(fetcher.mock.calls[0][1]?.body);expect(body).not.toMatch(/password|private/);expect(JSON.parse(body)).toMatchObject({runKey:"run",question:"Tôi kiểm tra gì?",libraryMembershipId:"44444444-4444-4444-8444-444444444444"});
 });
 it("retries ambiguous enqueue with the exact body/key and never re-posts for read retry",async()=>{
  let value=1;const fetcher=vi.spyOn(globalThis,"fetch").mockRejectedValueOnce(Error("network")).mockResolvedValueOnce(json({jobId:"hint",status:"queued"})).mockRejectedValueOnce(Error("read"));
  render(<PracticeAiHints {...props} getPayload={()=>({value})}/>);fireEvent.click(screen.getByRole("button",{name:"Gợi ý một bước"}));await screen.findByRole("alert");value=2;
  fireEvent.click(screen.getByRole("button",{name:"Gợi ý một bước"}));await screen.findByRole("button",{name:"Tải lại gợi ý"});
  expect(fetcher.mock.calls[1][1]?.body).toBe(fetcher.mock.calls[0][1]?.body);expect(fetcher.mock.calls[1][1]?.headers).toEqual(fetcher.mock.calls[0][1]?.headers);
  fetcher.mockResolvedValueOnce(json({jobId:"hint",status:"failed"}));fireEvent.click(screen.getByRole("button",{name:"Tải lại gợi ý"}));await screen.findByRole("alert");expect(fetcher.mock.calls.filter(c=>c[1]?.method==='POST')).toHaveLength(2);
 });
 it("bounds queued polling and offers read-only retry after the bound",async()=>{
  vi.useFakeTimers();const fetcher=vi.spyOn(globalThis,"fetch").mockImplementation(async(_url,init)=>json(init?.method==='POST'?{jobId:"bounded",status:"queued"}:{jobId:"bounded",status:"running"}));
  render(<PracticeAiHints {...props}/>);fireEvent.click(screen.getByRole("button",{name:"Gợi ý một bước"}));
  await act(async()=>{await vi.advanceTimersByTimeAsync(65_000);});
  expect(fetcher.mock.calls.filter(c=>c[1]?.method==='POST')).toHaveLength(1);expect(fetcher).toHaveBeenCalledTimes(31);expect(screen.getByRole("button",{name:"Tải lại gợi ý"})).toBeEnabled();
  await act(async()=>{await vi.advanceTimersByTimeAsync(60_000);});expect(fetcher).toHaveBeenCalledTimes(31);
 });
 it("times out a stalled enqueue without losing the immutable retry body",async()=>{
  vi.useFakeTimers();const fetcher=vi.spyOn(globalThis,"fetch").mockImplementation(()=>new Promise(()=>{}));
  render(<PracticeAiHints {...props}/>);fireEvent.click(screen.getByRole("button",{name:"Gợi ý một bước"}));
  await act(async()=>{await vi.advanceTimersByTimeAsync(16_000);});expect(screen.getByRole("alert")).toHaveTextContent(/quá thời gian/);expect((fetcher.mock.calls[0][1]?.signal as AbortSignal).aborted).toBe(true);
  fireEvent.click(screen.getByRole("button",{name:"Gợi ý một bước"}));expect(fetcher.mock.calls[1][1]?.body).toBe(fetcher.mock.calls[0][1]?.body);expect(fetcher.mock.calls[1][1]?.headers).toEqual(fetcher.mock.calls[0][1]?.headers);
 });
 it("fences late results on run/identity change and disables after submit",async()=>{
  let resolve!:(r:Response)=>void;const fetcher=vi.spyOn(globalThis,"fetch").mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
  const view=render(<PracticeAiHints {...props}/>);fireEvent.click(screen.getByRole("button",{name:"Gợi ý một bước"}));
  view.rerender(<PracticeAiHints {...props} attemptKey="new" disabled/>);act(()=>useScenarioStore.setState({sessionIdentity:"other"}));
  await act(async()=>resolve(json({jobId:"late",status:"completed",result:{summary:"secret old result",nextSteps:[]}})));
  expect(screen.queryByText("secret old result")).not.toBeInTheDocument();expect(screen.getByRole("button",{name:"Gợi ý một bước"})).toBeDisabled();expect(fetcher).toHaveBeenCalledOnce();
 });
});
