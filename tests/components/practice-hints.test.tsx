import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScenarioStore } from "@/stores/scenario-store";
import { PracticeAiHints } from "@/components/scenario/practice-ai-hints";
const json=(data:unknown)=>new Response(JSON.stringify(data),{headers:{"content-type":"application/json"}});
const props={moduleId:"dvor-1150a" as const,scenarioId:"published",attemptKey:"run",getPayload:()=>({password:"private",note:"Password:\nprivate",checkpoint:{value:1}})};
beforeEach(()=>useScenarioStore.setState({sessionIdentity:"owner",sessionScope:"practice"}));
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.useRealTimers();});
describe("right-column practice tutoring",()=>{
 it("never calls automatically, freezes sanitized request on click and polls the dedicated hint job",async()=>{
  const fetcher=vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({jobId:"hint-one",status:"queued"})).mockResolvedValueOnce(json({jobId:"hint-one",status:"completed",result:{sourceMode:"ai-assisted",summary:"Bước tiếp theo",nextSteps:["Đối chiếu Monitor"],notice:"Không chấm điểm"}}));
  render(<PracticeAiHints {...props} libraryMembershipId="44444444-4444-4444-8444-444444444444"/>);
  expect(screen.getByRole("heading",{name:"Gợi ý từ AI"})).toBeInTheDocument();expect(fetcher).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole("textbox"),{target:{value:"Tôi kiểm tra gì?"}});fireEvent.click(screen.getByRole("button",{name:"Gợi ý một bước"}));
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
