import { useState } from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as workspace from "@/components/scenario/practice-workspace";
import { useScenarioStore } from "@/stores/scenario-store";
vi.mock("@/components/scenario/practice-ai-hints", () => ({ PracticeAiHints: () => <section aria-label="Gợi ý từ AI">Gợi ý từ AI</section> }));
const report = { moduleId: "dme-320", scenarioId: "native-one", scenarioName: "Công suất TX1", status: "IN_PROGRESS", solved: false, sourceMode: "deterministic-only", summary: "Đã đối chiếu barem đã xuất bản", whatToAchieve: [], correctActions: [], redundantOrWrongAdjustments: [], nextSteps: [], suggestedExaminerComment: "", references: [], notice: "Không thay điểm thi" };
const scenario = { id: "source-one", name: "Công suất TX1", description: "Đài DME báo công suất thấp. Hãy kiểm tra và xử lý.", difficulty: "basic" };
const base = { moduleId: "dme-320" as const, scenario, getPayload: () => ({ simulation: { checkpoint: 1 } }) };
const json = (data: unknown) => new Response(JSON.stringify(data));
beforeEach(() => { useScenarioStore.setState({ sessionIdentity: "workspace-student", sessionScope: "practice" }); sessionStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("practice three column workspace", () => {
  it("keeps the native center inert until the requested published scenario is loaded", () => {
    render(<workspace.PracticeWorkspace {...base} scenario={null}><button>Old native control</button></workspace.PracticeWorkspace>);
    expect(screen.getByRole("button", { name: "Old native control", hidden: true }).closest("[data-practice-center]")).toHaveAttribute("inert");
    expect(screen.queryByRole("button", { name: /Nộp bài/ })).not.toBeInTheDocument();
  });
  it("prevents document-level simulator hotkeys after submission starts", () => {
    const nativeApply = vi.fn();
    document.addEventListener("keydown", nativeApply);
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(() => {}));
    try {
      render(<workspace.PracticeWorkspace {...base}><button>Native control</button></workspace.PracticeWorkspace>);
      fireEvent.click(screen.getByRole("button", { name: "Nộp bài ôn tập" }));
      fireEvent.keyDown(document, { key: "F7" });
      expect(nativeApply).not.toHaveBeenCalled();
    } finally { document.removeEventListener("keydown", nativeApply); }
  });
  it("keeps native simulator mounted while entering practice and places one submit beside AI and hardware", async () => {
    const Workspace = workspace.PracticeWorkspace;
    let mounts = 0;
    function Native() { const [value, setValue] = useState(0); return <button onClick={() => { mounts += 1; setValue(value + 1); }}>Native operation</button>; }
    const onHardware = vi.fn();
    const view = render(<Workspace {...base} enabled={false}><Native /></Workspace>);
    const native = screen.getByRole("button", { name: "Native operation" });
    view.rerender(<Workspace {...base} hardware={{ available: true, onOpen: onHardware }}><Native /></Workspace>);
    expect(screen.getByRole("button", { name: "Native operation" })).toBe(native);
    expect(screen.getByRole("region", { name: "Mô tả tình huống" })).toHaveTextContent(scenario.description);
    const assistant = screen.getByRole("complementary", { name: "Trợ giúp và nộp bài" });
    expect(within(assistant).getByRole("region", { name: "Gợi ý từ AI" })).toBeInTheDocument();
    fireEvent.click(within(assistant).getByRole("button", { name: /Bước 2.*Xác định phần cứng/ }));
    expect(onHardware).toHaveBeenCalledOnce();
    expect(screen.getAllByRole("button", { name: /Nộp bài/ })).toHaveLength(1);
    fireEvent.click(native); expect(mounts).toBe(1);
  });
  it("freezes one submission, blocks native editing while saving, and renders feedback without a second AI action", async () => {
    const Workspace = workspace.PracticeWorkspace;
    let acknowledge!: (r: Response) => void;
    const fetcher = vi.spyOn(globalThis, "fetch").mockImplementationOnce(() => new Promise(r => { acknowledge = r; })).mockResolvedValueOnce(json({ status: "completed", feedback: report }));
    render(<Workspace {...base}><button>Native control</button></Workspace>);
    fireEvent.click(screen.getByRole("button", { name: "Nộp bài ôn tập" }));
    expect(screen.getByRole("region", { name: "Simulator thao tác" })).toHaveAttribute("inert");
    expect(fetcher).toHaveBeenCalledOnce();
    await act(async () => acknowledge(json({ submissionId: "frozen-one" })));
    expect(await screen.findByText(report.summary)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "AI nhận xét bài làm" })).not.toBeInTheDocument();
    expect(fetcher.mock.calls.filter(([url]) => String(url).includes("practice-submissions"))).toHaveLength(1);
    expect(screen.getByRole("button", { name: /Bước 2/ })).toBeDisabled();
  });
});
