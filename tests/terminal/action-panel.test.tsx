import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ActionPanel } from "@/components/terminal/action-panel";
import type { RecordedAction } from "@/lib/types";

const action: RecordedAction = {
  step: 1,
  kind: "menu-selection",
  menuId: "sa.root",
  menuTitle: "System Administrator Main Menu",
  input: "1",
  resultLabel: "General Settings",
  timestamp: 1,
};

function handlers() {
  return {
    onToggleRecording: vi.fn(),
    onToggleSelected: vi.fn(),
    onSelectAll: vi.fn(),
    onClearSelection: vi.fn(),
    onSubmit: vi.fn(),
  };
}

describe("ActionPanel", () => {
  it("shows an actionable empty state and blocks empty submission", () => {
    render(
      <ActionPanel
        actions={[]}
        selectedActions={[]}
        isRecording
        {...handlers()}
      />,
    );

    expect(screen.getByText("Chưa có thao tác")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nộp bài" })).toBeDisabled();
  });

  it("lets the student select a recorded step", async () => {
    const user = userEvent.setup();
    const callbacks = handlers();
    render(
      <ActionPanel
        actions={[action]}
        selectedActions={[]}
        isRecording
        {...callbacks}
      />,
    );

    await user.click(screen.getByText("General Settings"));
    expect(callbacks.onToggleSelected).toHaveBeenCalledWith(1);
  });

  it("keeps the completion control directly below the selection controls", async () => {
    const user = userEvent.setup();
    const callbacks = handlers();
    render(
      <ActionPanel
        actions={[action]}
        selectedActions={[action]}
        isRecording={false}
        submitLabel="Hoàn tất Terminal và tiếp tục"
        {...callbacks}
      />,
    );

    const selectAll = screen.getByRole("button", { name: "Chọn tất cả" });
    const submit = screen.getByRole("button", {
      name: "Hoàn tất Terminal và tiếp tục",
    });

    expect(submit.parentElement?.previousElementSibling).toContainElement(
      selectAll,
    );
    await user.click(submit);
    expect(callbacks.onSubmit).toHaveBeenCalledOnce();
  });
});
