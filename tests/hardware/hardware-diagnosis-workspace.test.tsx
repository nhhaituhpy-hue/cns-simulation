import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { HardwareDiagnosisWorkspace } from "@/components/hardware/hardware-diagnosis-workspace";
import { createScenarioHardwareFault } from "@/components/admin/hardware-fault-step";
import { CON_SON_FAULT_SCENARIOS } from "@/lib/fault-scenarios";

describe("HardwareDiagnosisWorkspace", () => {
  it("shows only learner-selected components as failed", async () => {
    const user = userEvent.setup();
    const hardwareFault = createScenarioHardwareFault(
      CON_SON_FAULT_SCENARIOS[0],
    );
    hardwareFault.hardwareLayout[0].status = "failed";

    render(
      <HardwareDiagnosisWorkspace
        hardwareFault={hardwareFault}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const componentCard = screen.getByRole("button", {
      name: /1090 MHz Omni Antenna/,
    });
    expect(within(componentCard).getByText("NORMAL")).toBeInTheDocument();

    await user.click(componentCard);
    const markCheckbox = screen.getByRole("checkbox", {
      name: "Đánh dấu phần cứng sự cố",
    });
    await user.click(markCheckbox);

    expect(within(componentCard).getByText("FAILED")).toBeInTheDocument();
    expect(
      within(screen.getByRole("complementary")).getByText("FAILED"),
    ).toBeInTheDocument();

    await user.click(markCheckbox);
    expect(within(componentCard).getByText("NORMAL")).toBeInTheDocument();
  });
});
