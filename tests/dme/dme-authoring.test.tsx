import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DmeScenarioAuthor } from "@/components/dme/admin/dme-scenario-author";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { useDmeScenarioStore } from "@/stores/dme-scenario-store";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("DME scenario authoring", () => {
  beforeEach(() => {
    useDmePmdtStore.getState().reset();
    useDmeScenarioStore.setState({
      scenarios: [],
      isHydrated: true,
      isLoading: false,
      syncError: null,
    });
  });

  it("edits an RMS alarm state using the allowed State values", async () => {
    const user = userEvent.setup();
    render(<DmeScenarioAuthor />);

    expect(screen.getByRole("complementary", { name: "Bảng xây dựng kịch bản" })).toHaveClass(
      "overflow-y-auto",
      "overscroll-contain",
    );
    expect(screen.getByRole("region", { name: "DME PMDT Simulator" })).toHaveClass(
      "h-[calc(100dvh-4rem)]",
    );

    await user.click(screen.getByRole("button", { name: "RMS" }));
    await user.click(screen.getByRole("menuitem", { name: "Logs" }));
    fireEvent.pointerDown(
      screen.getByText("Normal", {
        selector: '[data-dme-field-id="alarmLogs.0.state"]',
      }),
    );

    await user.selectOptions(screen.getByLabelText("Giá trị State"), "Primary Alarm Low");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(useDmePmdtStore.getState().overrides).toContainEqual({
      fieldId: "alarmLogs.0.state",
      value: "Primary Alarm Low",
      status: "alarm",
    });
  });

  it("opens the DME hardware diagnosis configuration", async () => {
    const user = userEvent.setup();
    render(<DmeScenarioAuthor />);

    await user.click(screen.getByRole("button", { name: "Cấu hình" }));
    await user.click(screen.getByRole("checkbox", { name: "Bật bước xác định phần cứng cho kịch bản này" }));
    await user.click(screen.getByRole("button", { name: /High Power Amplifier TX1, TX1/ }));

    expect(screen.getByText("Đã chọn 1 block phần cứng.")).toBeInTheDocument();
  });
});
