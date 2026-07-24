import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { ActionBuilder } from "@/components/admin/action-builder";
import { NOI_BAI_TRAINING_SENSOR } from "@/lib/sensor-data-presets";
import { TerminalEngine } from "@/lib/terminal-engine";
import type { RecordedAction } from "@/lib/types";

afterEach(cleanup);

function ActionBuilderHarness() {
  const [actions, setActions] = useState<RecordedAction[]>([]);

  return (
    <ActionBuilder
      loginUser="sysadmin"
      sensorName="Training Sensor A"
      sensorDataProfile={NOI_BAI_TRAINING_SENSOR}
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

function createActionsAcrossLogins(): RecordedAction[] {
  const actions: RecordedAction[] = [];
  const sysadmin = new TerminalEngine({ targetLoginUser: "sysadmin" });

  for (const input of ["9", "1", "X"]) {
    const recordableAction = sysadmin.processInput(input).recordableAction;
    if (recordableAction) {
      actions.push({
        ...recordableAction,
        step: actions.length + 1,
        timestamp: actions.length + 1,
      });
    }
  }

  const maintenance = new TerminalEngine({ targetLoginUser: "maintenance" });
  maintenance.restorePersistentState(sysadmin.getPersistentState());
  const generalSettings = maintenance.processInput("1").recordableAction;
  if (generalSettings) {
    actions.push({
      ...generalSettings,
      step: actions.length + 1,
      timestamp: actions.length + 1,
    });
  }

  return actions;
}

function MultiLoginActionHarness() {
  const [actions, setActions] = useState<RecordedAction[]>(
    createActionsAcrossLogins,
  );

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
  it("starts a new sysadmin answer in Operational Mode", () => {
    render(<ActionBuilderHarness />);

    expect(screen.getByRole("log")).toHaveTextContent("OPERATIONAL MODE");
    expect(screen.getByRole("log")).toHaveTextContent("VERSION: 1-14-1");
    expect(
      screen.getByRole("heading", {
        name: "System Administrator Main Menu",
      }),
    ).toBeInTheDocument();
  });

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

  it("returns to the sysadmin menu showing Maintenance Mode after changing mode", async () => {
    const user = userEvent.setup();
    render(<ActionBuilderHarness />);

    await user.click(
      screen.getByRole("button", { name: /Change Actual Operation Mode/ }),
    );
    await user.click(
      screen.getByRole("button", {
        name: /Set Sensor Operating Mode to MAINTENANCE/,
      }),
    );

    expect(screen.getByRole("log")).toHaveTextContent(
      'Actual Sensor Operating Mode: "MAINTENANCE"',
    );

    await user.click(
      screen.getByRole("button", { name: /0 \/ RETURN · Quay lại/ }),
    );

    expect(
      screen.getByRole("heading", {
        name: "System Administrator Main Menu",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("log")).toHaveTextContent("MAINTENANCE MODE");
  });

  it("keeps Maintenance Mode when logging out and switching account", async () => {
    const user = userEvent.setup();
    render(<ActionBuilderHarness />);

    await user.click(
      screen.getByRole("button", { name: /Change Actual Operation Mode/ }),
    );
    await user.click(
      screen.getByRole("button", {
        name: /Set Sensor Operating Mode to MAINTENANCE/,
      }),
    );
    await user.click(screen.getByRole("button", { name: /X · Đăng xuất/ }));

    expect(
      screen.getByText("Đã đăng xuất tài khoản sysadmin"),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Đăng nhập maintenance/ }),
    );

    expect(
      screen.getByRole("heading", { name: "Maintenance Main Menu" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("log")).toHaveTextContent("MAINTENANCE MODE");
    expect(screen.getByRole("log")).toHaveTextContent("USER: MAINTENANCE");

    await user.click(screen.getByRole("button", { name: /General Settings/ }));
    expect(
      screen.getByRole("button", { name: /Configure ASTERIX/ }),
    ).toBeInTheDocument();
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

  it("replays an existing answer across sysadmin and maintenance logins", () => {
    render(<MultiLoginActionHarness />);

    expect(
      screen.getByRole("heading", { name: "General Settings" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Configure ASTERIX/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("4 thao tác")).toBeInTheDocument();
    expect(screen.getByRole("log")).toHaveTextContent(/MAINTENANCE MODE/i);
  });
});
