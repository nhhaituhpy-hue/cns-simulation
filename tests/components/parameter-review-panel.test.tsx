import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ParameterReviewPanel } from "@/components/scenario/parameter-review-panel";
import type { ParameterReview } from "@/lib/ai/scenario-generation/parameter-review";

afterEach(cleanup);
const review: ParameterReview = {
  version: 2,
  initial: [{ fieldId: "config.power", label: "Công suất", value: 18, unit: "W" }, { fieldId: "startup.enabled", value: false }],
  recovery: [{ fieldId: "config.power", label: "Công suất khôi phục", value: 100, unit: "W" }],
  verification: { mode: "engine-recovery", initial: [{ id: "initial-alarm", passed: true, detail: "Cảnh báo ban đầu đúng yêu cầu" }], recovered: [{ id: "recovered-alarm", passed: false, detail: "Còn cảnh báo" }], recoveryVerified: false, notes: ["Cần giám khảo kiểm tra lại."] },
};

it("shows actual initial values and totals with recovery checks collapsed", () => {
  render(<ParameterReviewPanel review={review} />);
  const panel = within(screen.getByRole("region", { name: "Cấu hình Scenario Parameters" }));
  expect(panel.getByText("Công suất")).toBeVisible();
  expect(panel.getByText("18 W")).toBeVisible();
  expect(panel.getByText("startup.enabled")).toBeVisible();
  expect(panel.getByText("false")).toBeVisible();
  expect(panel.getByText(/1 thiết lập khôi phục/)).toBeVisible();
  expect(panel.getByText(/2 thiết lập ban đầu/)).toBeVisible();
  const summary = panel.getByText("Kế hoạch khôi phục và kiểm tra");
  expect(summary.closest("details")).not.toHaveAttribute("open");
  expect(panel.getByText("100 W")).not.toBeVisible();
  fireEvent.click(summary);
  expect(panel.getByText("100 W")).toBeVisible();
  expect(panel.getByText("Khôi phục bằng engine mô phỏng")).toBeVisible();
  expect(panel.getByText("Cảnh báo ban đầu đúng yêu cầu")).toBeVisible();
  expect(panel.getByText("Còn cảnh báo")).toBeVisible();
  expect(panel.getByText(/Chưa xác minh khôi phục trong mô phỏng/)).toBeVisible();
  expect(panel.getByText("Cần giám khảo kiểm tra lại.")).toBeVisible();
  expect(panel.getByText(/không.*chứng nhận.*thiết bị.*thật/i)).toBeVisible();
});

it.each([
  ["native-diagnosis", "Kiểm tra chẩn đoán native", /không.*mọi cảnh báo.*hết/i],
  ["native-action-replay", "Phát lại thao tác native", /không.*cảm biến.*xanh.*thực tế/i],
] as const)("explains the limits of %s even when its simulator check passes", (mode, label, limitation) => {
  render(<ParameterReviewPanel review={{ ...review, verification: { ...review.verification, mode, recoveryVerified: true } }} />);
  fireEvent.click(screen.getByText("Kế hoạch khôi phục và kiểm tra"));
  expect(screen.getByText(label)).toBeVisible();
  expect(screen.getByText(limitation)).toBeVisible();
  expect(screen.getByText(/Đã đạt kiểm tra.*trong mô phỏng/)).toBeVisible();
  expect(screen.queryByText("Đã xác minh khôi phục trong mô phỏng.")).not.toBeInTheDocument();
});
