import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VorScenarioAuthor } from "@/components/vor/admin/vor-scenario-author";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import { useVorScenarioStore } from "@/stores/vor-scenario-store";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("VOR scenario authoring", () => {
  beforeEach(() => {
    push.mockClear();
    useVorPmdtStore.getState().reset();
    useVorScenarioStore.setState({
      scenarios: [],
      isHydrated: true,
      isLoading: false,
      syncError: null,
    });
  });

  it("configures a fault and expected checkpoint on the shared PMDT", async () => {
    const user = userEvent.setup();
    render(<VorScenarioAuthor />);

    await user.click(screen.getByRole("button", { name: "Transmitters" }));
    await user.click(screen.getByRole("menuitem", { name: "Data" }));
    fireEvent.pointerDown(screen.getByText("98.8"));
    expect(screen.getByText("txPower.0.tx1")).toBeInTheDocument();

    const valueInput = screen.getByText("Giá trị").closest("label")?.querySelector("input");
    expect(valueInput).not.toBeNull();
    await user.clear(valueInput as HTMLInputElement);
    await user.type(valueInput as HTMLInputElement, "0");
    await user.selectOptions(screen.getByLabelText("Màu / trạng thái"), "red");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));
    await user.click(screen.getByRole("button", { name: "Thêm màn hình" }));

    await user.type(screen.getByLabelText("Tiêu đề"), "Mất công suất phát");
    await user.type(
      screen.getByLabelText("Mô tả"),
      "Tx #1 mất công suất trong khi hệ thống đang khai thác.",
    );
    await user.type(
      screen.getByLabelText("Đề bài"),
      "Xác định vị trí sự cố và đề xuất hướng khắc phục.",
    );
    await user.click(screen.getByRole("button", { name: "Lưu" }));

    await waitFor(() => expect(useVorScenarioStore.getState().scenarios).toHaveLength(1));
    expect(useVorScenarioStore.getState().scenarios[0]).toMatchObject({
      title: "Mất công suất phát",
      overrides: [{ fieldId: "txPower.0.tx1", value: 0, status: "red" }],
    });
    expect(
      useVorScenarioStore.getState().scenarios[0].expectedCheckpoints[0].viewId,
    ).toBe("tx-data-main");
    expect(push).toHaveBeenCalledWith("/admin/vor");
  }, 10_000);

  it("configures Local and Bypass as yellow student interaction targets", async () => {
    const user = userEvent.setup();
    render(<VorScenarioAuthor />);

    fireEvent.pointerDown(screen.getByRole("button", { name: "Local" }));
    expect(screen.getByText("local")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Bật trạng thái" }));
    await user.selectOptions(screen.getByLabelText("Màu / trạng thái"), "yellow");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    fireEvent.pointerDown(screen.getByRole("button", { name: "Bypass" }));
    expect(screen.getByText("monitorIntegral.bypass")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Bật trạng thái" }));
    await user.selectOptions(screen.getByLabelText("Màu / trạng thái"), "yellow");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(useVorPmdtStore.getState().overrides).toEqual(expect.arrayContaining([
      { fieldId: "local", value: true, status: "yellow" },
      { fieldId: "monitorIntegral.bypass", value: true, status: "yellow" },
    ]));
    expect(screen.getByRole("heading", { name: "Thao tác sidebar cần chấm" })).toBeInTheDocument();
  });
});
