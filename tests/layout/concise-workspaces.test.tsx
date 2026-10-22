import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SIMULATOR_MODULES } from "@/modules/core/registry";
import type { SimulatorModuleDefinition } from "@/modules/core/types";
const devices: readonly SimulatorModuleDefinition[] = SIMULATOR_MODULES;
import { SimulatorCatalog } from "@/modules/simulator/simulator-catalog";
import { TrainingWorkspaceCatalog } from "@/modules/training/training-workspace";
import { AiScenarioDialog } from "@/components/scenario/ai-scenario-dialog";
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, useSearchParams: () => new URLSearchParams() }));
const showModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
const close = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close");
beforeEach(() => {
  router.push.mockReset();
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function(this: HTMLDialogElement) { this.removeAttribute("open"); } });
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ jobs: [], sessions: [] }))));
});
afterEach(() => {
  cleanup(); vi.useRealTimers(); vi.unstubAllGlobals();
  for (const [key, descriptor] of [["showModal", showModal], ["close", close]] as const) {
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, key, descriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, key);
  }
});
describe("self-explanatory workspace UI", () => {
  it("uses device names and actions instead of repeated ready labels and generic descriptions", async () => {
    vi.useFakeTimers(); render(<SimulatorCatalog />);
    expect(screen.queryAllByText("ready")).toHaveLength(0);
    for (const device of devices) {
      const card = screen.getByRole("heading", { name: device.name }).closest("article")!;
      expect(within(card).queryByText(device.description)).not.toBeInTheDocument();
      if (device.status === "available") expect(within(card).getByRole("button", { name: "Mở simulator" })).toBeEnabled();
      else { expect(within(card).getByText("Đang hoàn thiện")).toBeVisible(); expect(within(card).queryByRole("button")).not.toBeInTheDocument(); }
    }
    const first = SIMULATOR_MODULES.find(device => device.status === "available")!;
    fireEvent.click(screen.getAllByRole("button", { name: "Mở simulator" })[0]);
    expect(screen.getByRole("status", { name: "Đang mở simulator" })).toBeVisible();
    expect(screen.getAllByRole("button").every(button => (button as HTMLButtonElement).disabled)).toBe(true);
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(router.push).toHaveBeenCalledExactlyOnceWith(first.routes.simulator);
  });
  it.each(["authoring", "review"] as const)("keeps all available %s destinations and planned devices without explanatory copy", mode => {
    render(<TrainingWorkspaceCatalog mode={mode} modules={SIMULATOR_MODULES} />);
    expect(screen.queryAllByText("ready")).toHaveLength(0);
    for (const device of devices) {
      const card = within(screen.getByRole("heading", { name: device.shortName }).closest("article")!);
      expect(card.queryByText(device.description)).not.toBeInTheDocument();
      const available = (mode === "review" ? device.reviewStatus ?? device.trainingStatus ?? device.status : device.trainingStatus ?? device.status) === "available";
      if (available) expect(card.getByRole("link", { name: mode === "authoring" ? "Mở kịch bản" : "Vào ôn tập" })).toHaveAttribute("href", device.routes[mode]);
      else expect(card.getByText("Đang hoàn thiện")).toHaveAttribute("aria-disabled", "true");
    }
  });
  it.each(["documents", "description"] as const)("shows concise entry actions and preserves %s labels, privacy and no implicit generation", async mode => {
    const user = userEvent.setup();render(<AiScenarioDialog moduleId="dme-320" />);
    await user.click(screen.getByRole("button", { name: "Tạo kịch bản bằng AI" }));
    const chooser = screen.getByRole("region", { name: "Chọn phương thức khởi tạo kịch bản AI" });
    expect(within(chooser).queryByText("Chọn phương thức khởi tạo kịch bản AI")).not.toBeInTheDocument();
    expect(within(chooser).queryByText("Từ mô tả của bạn")).not.toBeInTheDocument();
    await user.click(within(chooser).getByRole("button", { name: mode === "documents" ? "Tải tài liệu" : "Mô tả tình huống" }));
    const dialog = screen.getByRole("dialog", { name: "Tạo kịch bản bằng AI" });
    expect(within(dialog).queryByText("Menu tính năng")).not.toBeInTheDocument();
    expect(within(dialog).getByRole("region", { name: "Menu tính năng tạo kịch bản" })).toBeVisible();
    expect(within(dialog).getByText(/Không tự đưa vào Ôn tập hoặc Kỳ thi/)).toBeVisible();
    expect(within(dialog).getByText(/Tài liệu được gửi tới dịch vụ AI bên ngoài/)).toBeVisible();
    expect(within(dialog).getByLabelText(mode === "description" ? "Mô tả tình huống" : "Mục tiêu huấn luyện (không bắt buộc)")).toBeVisible();
    expect(within(dialog).getByRole("button", { name: "AI soạn kịch bản" })).toBeDisabled();
    expect(vi.mocked(fetch).mock.calls.every(([, init]) => !init?.method || init.method === "GET")).toBe(true);
  });
});
