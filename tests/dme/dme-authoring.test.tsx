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
    await loginAs(user);

    expect(screen.getByRole("complementary", { name: "Bảng xây dựng kịch bản" })).toHaveClass(
      "pmdt-classic-inspector",
    );
    expect(screen.getByRole("region", { name: "DME PMDT Simulator" })).toHaveClass(
      "pmdt-classic-window",
      "dme-pmdt-window",
    );

    await user.click(screen.getByRole("button", { name: "RMS" }));
    await user.click(screen.getByRole("menuitem", { name: "Logs" }));
    await user.click(screen.getByRole("tab", { name: "Alarms" }));
    fireEvent.pointerDown(
      screen.getByText("Primary Alarm Low", {
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
    await loginAs(user);

    await user.click(screen.getByRole("button", { name: "Cấu hình" }));
    await user.click(screen.getByRole("checkbox", { name: "Bật bước xác định phần cứng cho kịch bản này" }));
    await user.click(screen.getByRole("button", { name: /High Power Amplifier TX1, TX1/ }));

    expect(screen.getByText("Đã chọn 1 block phần cứng.")).toBeInTheDocument();
  });
});

async function loginAs(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("User ID"), "SEC3");
  await user.type(screen.getByLabelText("Password"), "THREE");
  await user.click(screen.getByRole("button", { name: "OK" }));
}
