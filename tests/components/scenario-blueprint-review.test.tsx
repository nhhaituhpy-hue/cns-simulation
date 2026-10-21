import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ScenarioBlueprintReview } from "@/components/scenario/scenario-blueprint-review";
import type { ScenarioBlueprint } from "@/lib/ai/scenario-blueprint/types";

// The HTTP review shape never needs the credential-bearing native definition.
const blueprint: Omit<ScenarioBlueprint, "definition"> = {
  version: 1, moduleId: "dvor-220", title: "Khôi phục máy phát",
  situation: "Trạm báo công suất thấp.", cause: "Suy giảm công suất phát.",
  symptoms: ["Cảnh báo công suất"], assumptions: ["Thực hành trong mô phỏng, không phải thiết bị thật."],
  rubric: { version: 1, moduleId: "dvor-220", steps: [
    { id: "inspect", label: "Kiểm tra màn hình máy phát", required: true, prerequisites: [], alternatives: [[{ kind: "view", viewId: "tx" }]], citationIds: ["manual-1"] },
    { id: "restore", label: "Khôi phục công suất", required: true, prerequisites: ["inspect"], alternatives: [[{ kind: "parameter", fieldId: "config.power", value: 80 }]], citationIds: ["manual-1"] },
    { id: "extra", label: "Kiểm tra phụ hợp lệ", required: false, prerequisites: [], alternatives: [], citationIds: [] },
  ], parameterRelevance: [{ fieldId: "config.power", label: "Công suất", initialValue: 20, targetValue: 80, reason: "Cần khôi phục công suất phát.", citationIds: ["manual-1"] }], citations: [] },
  verification: { mode: "engine-recovery", initial: [{ id: "alarm", passed: true, detail: "Đã tái hiện cảnh báo ban đầu." }], recovered: [{ id: "clear", passed: true, detail: "Khôi phục đạt kiểm tra engine." }], recoveryVerified: true, notes: ["Giám khảo cần thử thao tác trước công bố."] },
  citations: [{ id: "manual-1", documentId: "doc-1", documentName: "DVOR manual", sha256: "a".repeat(64), segmentLabel: "Trang 12", quote: "Check transmitter power before restoring service.", sourceKind: "reference-only" }],
};
afterEach(cleanup);

it("reviews the public blueprint in sections with cited steps and explicit unpublished save", () => {
  const save = vi.fn();
  render(<ScenarioBlueprintReview blueprint={blueprint} onSave={save} disabled={false} />);
  const layout = screen.getByTestId("blueprint-review-columns");
  expect(layout.className).toContain("lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]");
  const menu = screen.getByRole("navigation", { name: "Các phần bài tập" });
  const draft = screen.getByRole("region", { name: "Bản xem thử kịch bản" });
  const sources = screen.getByRole("complementary", { name: "Nguồn và gợi ý" });
  expect(within(menu).getByRole("link", { name: "Quy trình xử lý" })).toHaveAttribute("href");
  expect(draft).toHaveTextContent(blueprint.situation);
  expect(draft).toHaveTextContent(blueprint.cause);
  expect(draft).toHaveTextContent("Khôi phục công suất");
  expect(draft).toHaveTextContent("Bắt buộc");
  expect(draft).toHaveTextContent("Kiểm tra phụ");
  expect(draft).toHaveTextContent("Đã kiểm chứng khôi phục bằng simulator");
  expect(draft).toHaveTextContent("Chưa xuất bản");
  expect(sources).toHaveTextContent("Trang 12");
  expect(sources).toHaveTextContent(blueprint.citations[0].quote);
  expect(sources).toHaveTextContent(blueprint.citations[0].sha256);
  expect(sources).toHaveTextContent("Tài liệu tham chiếu");
  const citation = within(draft).getAllByRole("link", { name: /DVOR manual/ })[0];
  expect(document.getElementById(citation.getAttribute("href")!.slice(1))).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Lưu kịch bản" }));
  expect(save).toHaveBeenCalledOnce();
});

it("states configuration-only verification explicitly for ADS-B terminal replay",()=>{
 render(<ScenarioBlueprintReview blueprint={{...blueprint,moduleId:"ads-b",verification:{...blueprint.verification,mode:"native-action-replay"}}} onSave={vi.fn()} disabled={false}/>);
 expect(screen.getByText(/chuỗi thao tác và cấu hình/)).toBeInTheDocument();
 expect(screen.queryByText("Đã kiểm chứng khôi phục bằng simulator")).not.toBeInTheDocument();
});
it("does not claim recovered verification for initial-only results", () => {
  render(<ScenarioBlueprintReview blueprint={{ ...blueprint, verification: { ...blueprint.verification, recoveryVerified: false, recovered: [] } }} onSave={vi.fn()} disabled />);
  expect(screen.getByText(/Chưa kiểm chứng khôi phục/)).toBeInTheDocument();
  expect(screen.queryByText("Đã kiểm chứng khôi phục bằng simulator")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Lưu kịch bản" })).toBeDisabled();
});

it("cannot save a blueprint whose recovery has not been verified even if the parent is idle", () => {
  const save = vi.fn();
  render(<ScenarioBlueprintReview blueprint={{ ...blueprint, verification: { ...blueprint.verification, recoveryVerified: false, recovered: [] } }} onSave={save} disabled={false} />);
  expect(screen.getByRole("button", { name: "Lưu kịch bản" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Lưu kịch bản" }));
  expect(save).not.toHaveBeenCalled();
});
