import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { VorSubmissionList } from "@/components/vor/admin/vor-submission-list";
import { VorSubmissionReview } from "@/components/vor/admin/vor-submission-review";
import type { VorScenario, VorSubmission } from "@/lib/vor-types";
import { useVorScenarioStore } from "@/stores/vor-scenario-store";
import { useVorSubmissionStore } from "@/stores/vor-submission-store";

const scenario: VorScenario = {
  id: "scenario-1",
  title: "Mất công suất phát",
  description: "Tx #1 mất công suất.",
  difficulty: "medium",
  prompt: "Xác định sự cố.",
  createdAt: "2026-07-16T10:00:00.000Z",
  overrides: [
    { fieldId: "txPower.0.tx1", value: 0, status: "red" },
    { fieldId: "local", value: true, status: "yellow" },
    { fieldId: "monitorIntegral.bypass", value: true, status: "yellow" },
  ],
  expectedCheckpoints: [{
    id: "checkpoint-1",
    order: 1,
    viewId: "tx-data-main",
    menuPath: ["Transmitters", "Data", "Transmitter Data"],
    title: "Transmitter Data",
    guidance: "Kiểm tra công suất phát.",
    required: true,
    points: 20,
  }],
};

const submission: VorSubmission = {
  id: "submission-1",
  scenarioId: scenario.id,
  studentName: "Nguyễn Văn A",
  studentCode: "HV001",
  status: "submitted",
  startedAt: "2026-07-16T10:00:00.000Z",
  submittedAt: "2026-07-16T10:10:00.000Z",
  events: [
    {
      id: "event-sidebar-1",
      sequence: 1,
      eventType: "sidebar",
      screenId: "home",
      viewId: "home",
      menuPath: ["Sidebar", "Local"],
      title: "Local",
      visitedAt: "2026-07-16T10:01:00.000Z",
      annotation: "Chuyển thiết bị sang Local.",
      fieldId: "local",
      resultValue: true,
      resultStatus: "yellow",
    },
    {
      id: "event-1",
      sequence: 2,
      eventType: "view",
      screenId: "tx-data",
      viewId: "tx-data-main",
      menuPath: ["Transmitters", "Data", "Transmitter Data"],
      title: "Transmitter Data",
      visitedAt: "2026-07-16T10:02:00.000Z",
      annotation: "Công suất Tx #1 bằng 0.",
    },
  ],
  answer: {
    suspectedFault: "Khối PA Tx #1",
    reasoning: "Công suất đo được bằng 0.",
    remediation: "Kiểm tra nguồn và PA.",
  },
};

describe("VOR examiner workflow", () => {
  beforeEach(() => {
    useVorScenarioStore.setState({ scenarios: [scenario], isHydrated: true, isLoading: false, syncError: null });
    useVorSubmissionStore.setState({ submissions: [submission], isHydrated: true, isLoading: false, syncError: null });
  });

  it("lists submitted exercises and links to examiner review", () => {
    render(<VorSubmissionList />);
    expect(screen.getByRole("heading", { name: "Nguyễn Văn A" })).toBeInTheDocument();
    expect(screen.getByText("Chờ chấm")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Đọc và chấm/ })).toHaveAttribute(
      "href",
      "/admin/vor/submissions/submission-1",
    );
  });

  it("shows checkpoint coverage and saves the examiner's manual score", async () => {
    const user = userEvent.setup();
    render(<VorSubmissionReview submissionId={submission.id} />);

    expect(screen.getByLabelText("Đã kiểm tra")).toBeInTheDocument();
    expect(screen.getByLabelText("Đã thao tác")).toBeInTheDocument();
    expect(screen.getByLabelText("Chưa thao tác")).toBeInTheDocument();
    expect(screen.getByText("Khối PA Tx #1")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Điểm (0–100)"), "85");
    await user.type(screen.getByLabelText("Nhận xét"), "Quy trình kiểm tra hợp lý.");
    await user.click(screen.getByRole("button", { name: "Lưu điểm và nhận xét" }));

    await waitFor(() => expect(screen.getByText("Đã lưu đánh giá của giám khảo.")).toBeInTheDocument());
    expect(useVorSubmissionStore.getState().submissions[0]).toMatchObject({
      status: "reviewed",
      score: 85,
      examinerComment: "Quy trình kiểm tra hợp lý.",
    });
  });
});
