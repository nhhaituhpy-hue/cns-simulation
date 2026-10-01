import { describe, expect, it } from "vitest";
import { examEvidenceControl, examEvidenceValue, formatExamEvidenceTime, presentExamCriterion, presentExamEvidenceAction } from "@/lib/scenario-exams/evidence-presentation";
import type { ScenarioActionEvent } from "@/lib/scenario-evidence";

const event: ScenarioActionEvent = { id: "event-1", sequence: 1, occurredAt: "2026-10-01T08:07:31.000Z", actor: "student", kind: "control", controlId: "transmitter-tx2-main", label: "TX TX2 main", menuPath: ["Commands"], accepted: true };

describe("examiner evidence presentation", () => {
  it("names transmitter commands and legacy labels after the software controls", () => {
    expect(examEvidenceControl("transmitter-tx2-main", event.label, "dvor-1150a")).toEqual({ title: "Chọn TX2 làm máy phát chính", button: "Main TX2" });
    expect(examEvidenceControl("", "TX2 load", "dme-1119a")).toEqual({ title: "Chuyển TX2 sang tải giả", button: "Load TX2" });
    expect(examEvidenceControl("tx-transfer-tx1", "tx-transfer-tx1", "dvor-1150").title).toBe("Chọn TX1 làm máy phát chính");
  });

  it("replaces internal field identifiers with visible function names", () => {
    expect(examEvidenceControl("simulation.local", "Set simulation.local", "dvor-1150a")).toEqual({ title: "Thay đổi: Chế độ Local", button: "Chế độ Local" });
    expect(examEvidenceControl("transmitters.tx2.main", "Main TX2", "dvor-1150a").button).toBe("Main TX2");
    expect(examEvidenceControl("station.stationDescription", "Set station.stationDescription", "dvor-1150a").title).not.toContain("stationDescription");
  });

  it("does not invert alarm booleans or describe Local as an alarm", () => {
    expect(examEvidenceValue(true, "primaryMonitorAlarm")).toEqual({ text: "Có cảnh báo", tone: "danger" });
    expect(examEvidenceValue(false, "primaryMonitorAlarm")).toEqual({ text: "Không cảnh báo", tone: "success" });
    expect(examEvidenceValue(false, "monitorNormal").tone).toBe("danger");
    expect(examEvidenceValue("false", "simulation.local")).toEqual({ text: "Tắt", tone: "neutral" });
    expect(examEvidenceValue(true, "monitorBypass").tone).toBe("warning");
  });

  it("preserves unfavorable monitor changes beside a successfully accepted TX command", () => {
    const action = presentExamEvidenceAction({ ...event, before: { monitorNormal: false, primaryMonitorAlarm: false, activeTransmitter: "tx1" }, after: { monitorNormal: true, primaryMonitorAlarm: true, activeTransmitter: "tx2" } }, "dvor-1150a");
    expect(action.changes).toContainEqual(expect.objectContaining({ label: "Integral Monitor", after: { text: "Bình thường", tone: "success" } }));
    expect(action.changes).toContainEqual(expect.objectContaining({ label: "Cảnh báo Monitor chính", after: { text: "Có cảnh báo", tone: "danger" } }));
    expect(action.changes).toContainEqual(expect.objectContaining({ label: "Máy phát chính", before: { text: "TX1", tone: "neutral" }, after: { text: "TX2", tone: "neutral" } }));
  });

  it("shows rejected values as requests without inventing an applied state", () => {
    const action = presentExamEvidenceAction({ ...event, controlId: "simulation.local", label: "Set simulation.local", accepted: false, input: { fieldId: "simulation.local", value: "true" }, before: { local: false }, after: { local: false }, reason: "Security level is insufficient." }, "dvor-1150a");
    expect(action.changes).toEqual([]);
    expect(action.facts).toEqual([{ label: "Giá trị yêu cầu", value: "Bật" }]);
    expect(action.reason).toContain("Quyền truy cập");
  });

  it("distinguishes staged parameter changes from Apply and preserves rejected change metadata", () => {
    const action = presentExamEvidenceAction({ ...event, kind: "configuration", parameterChanges: [
      { fieldId: "simulation.local", label: "Local", before: false, after: true, phase: "draft", accepted: true },
      { fieldId: "simulation.local", label: "Local", before: true, after: false, phase: "apply", accepted: false },
    ] }, "dvor-1150a");
    expect(action.changes).toMatchObject([{ phase: "Bản nháp", accepted: true }, { phase: "Yêu cầu Apply", accepted: false }]);
  });

  it("translates required action criteria without changing the evaluated result", () => {
    const check = { id: "action-diagnostics-run-full", label: "PMDT action: diagnostics-run-full", passed: false, detail: "Chưa thực hiện" };
    expect(presentExamCriterion(check, "dvor-1150a")).toEqual({ label: "Chạy Diagnostics đầy đủ", detail: "Chưa thực hiện" });
    expect(check.passed).toBe(false);
    expect(presentExamCriterion({ id: "integral-monitor", label: "Integral Monitor", passed: false, detail: "Alarm active" }, "dvor-1150a").detail).toBe("Đang có cảnh báo");
  });

  it("uses the exam timezone and handles absent legacy timestamps", () => {
    expect(formatExamEvidenceTime(event.occurredAt)).toBe("15:07:31");
    expect(formatExamEvidenceTime("")).toBe("Chưa ghi nhận giờ");
  });
});
