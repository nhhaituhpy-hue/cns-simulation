import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { VorStudentDashboard } from "@/components/vor/student/vor-student-dashboard";
import { VorStudentSession } from "@/components/vor/student/vor-student-session";
import type { VorScenario } from "@/lib/vor-types";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import { useVorScenarioStore } from "@/stores/vor-scenario-store";
import { useVorSubmissionStore } from "@/stores/vor-submission-store";

const scenario: VorScenario = {
  id: "vor-power-loss",
  title: "Mất công suất phát",
  description: "Tx #1 mất công suất trong khi hệ thống đang khai thác.",
  difficulty: "medium",
  prompt: "Xác định vị trí sự cố và đề xuất hướng khắc phục.",
  createdAt: "2026-07-16T10:00:00.000Z",
  overrides: [{ fieldId: "txPower.0.tx1", value: 0, status: "red" }],
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

describe("VOR student workflow", () => {
  beforeEach(() => {
    useVorPmdtStore.getState().reset();
    useVorScenarioStore.setState({
      scenarios: [scenario],
      isHydrated: true,
      isLoading: false,
      syncError: null,
    });
    useVorSubmissionStore.setState({
      submissions: [],
      isHydrated: true,
      isLoading: false,
      syncError: null,
    });
  });

  it("lists available VOR exercises separately", () => {
    render(<VorStudentDashboard />);
    expect(screen.getByRole("heading", { name: "Mất công suất phát" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bắt đầu bài VOR: Mất công suất phát" })).toHaveAttribute(
      "href",
      "/student/vor?id=vor-power-loss",
    );
  });

  it("records PMDT visits, annotations, written diagnosis, and submits for review", async () => {
    const user = userEvent.setup();
    render(<VorStudentSession scenarioId={scenario.id} />);

    await user.type(screen.getByLabelText("Họ và tên học viên"), "Nguyễn Văn A");
    await user.type(screen.getByLabelText("Mã học viên"), "HV001");
    await user.click(screen.getByRole("button", { name: "Vào màn hình PMDT" }));

    await user.click(screen.getByRole("button", { name: "Transmitters" }));
    await user.click(screen.getByRole("menuitem", { name: "Data" }));
    expect(screen.getByText("Transmitter Data", { selector: "h2" })).toBeInTheDocument();
    expect(document.querySelector('[data-vor-field-id="txPower.0.tx1"]')).toHaveTextContent("0.0");

    await user.type(screen.getByLabelText("Chú thích Data lần 1"), "Công suất Tx #1 bằng 0.");
    await user.type(screen.getByLabelText("Vị trí / sự cố nghi ngờ"), "Khối PA Tx #1");
    await user.type(screen.getByLabelText("Căn cứ chẩn đoán"), "Công suất đo được bằng 0");
    await user.type(screen.getByLabelText("Hướng khắc phục"), "Kiểm tra nguồn và PA");
    await user.click(screen.getByRole("button", { name: "Nộp bài cho giám khảo" }));

    await waitFor(() => expect(screen.getByRole("heading", { name: "Đã nộp bài VOR" })).toBeInTheDocument());
    expect(useVorSubmissionStore.getState().submissions).toHaveLength(1);
    expect(useVorSubmissionStore.getState().submissions[0]).toMatchObject({
      scenarioId: scenario.id,
      studentName: "Nguyễn Văn A",
      studentCode: "HV001",
      status: "submitted",
      answer: { suspectedFault: "Khối PA Tx #1" },
      events: [{ viewId: "tx-data-main", annotation: "Công suất Tx #1 bằng 0." }],
    });
  });
});
