import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { ActionBuilder } from "@/components/admin/action-builder";
import type { RecordedAction } from "@/lib/types";

afterEach(cleanup);

function ActionBuilderHarness() {
  const [actions, setActions] = useState<RecordedAction[]>([]);

  return (
    <ActionBuilder
      loginUser="sysadmin"
      sensorName="Training Sensor A"
      actions={actions}
      onChange={setActions}
    />
  );
}

function ExistingActionHarness() {
  const [actions, setActions] = useState<RecordedAction[]>([
    {
      step: 1,
      kind: "menu-selection",
      menuId: "sa.root",
      menuTitle: "System Administrator Main Menu",
      input: "1",
      resultLabel: "General Settings",
      timestamp: 1,
    },
  ]);

  return (
    <ActionBuilder
      loginUser="sysadmin"
      sensorName="Training Sensor A"
      actions={actions}
      onChange={setActions}
    />
  );
}

describe("ActionBuilder", () => {
  it("records menu actions from the TerminalEngine context", async () => {
    const user = userEvent.setup();
    render(<ActionBuilderHarness />);

    expect(screen.getByText("0 thao tác")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /General Settings/ }));
    expect(
      screen.getByRole("heading", { name: "General Settings" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 thao tác")).toBeInTheDocument();
    expect(screen.getByTitle("Đưa thao tác lên")).toBeInTheDocument();
    expect(screen.getByTitle("Đưa thao tác xuống")).toBeInTheDocument();
    expect(screen.getByTitle("Xóa thao tác")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Enable \/ Disable ADS-B Cat21/ }),
    );
    await user.click(screen.getByRole("button", { name: /Enabled/ }));

    expect(screen.getByText("3 thao tác")).toBeInTheDocument();
    expect(screen.getByText(/Set Enable \/ Disable ADS-B Cat21 to Enabled/)).toBeInTheDocument();
  });

  it("removes and renumbers recorded actions", async () => {
    const user = userEvent.setup();
    render(<ActionBuilderHarness />);

    await user.click(screen.getByRole("button", { name: /General Settings/ }));
    await user.click(
      screen.getByRole("button", { name: /Enable \/ Disable ADS-B Cat21/ }),
    );

    expect(screen.getByText("2 thao tác")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Xóa thao tác 1" }));

    expect(screen.getByText("1 thao tác")).toBeInTheDocument();
    expect(screen.getByText("1", { selector: "span" })).toBeInTheDocument();
  });

  it("replays existing actions before adding from the current menu", async () => {
    const user = userEvent.setup();
    render(<ExistingActionHarness />);

    expect(
      screen.getByRole("heading", { name: "General Settings" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Enable \/ Disable ADS-B Cat21/ }),
    );
    expect(screen.getByText("2 thao tác")).toBeInTheDocument();
  });
});
