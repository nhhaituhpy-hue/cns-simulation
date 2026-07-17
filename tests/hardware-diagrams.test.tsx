import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EquipmentBlockDiagram } from "@/components/hardware/equipment-block-diagram";
import { HardwareReview } from "@/components/hardware/hardware-review";
import { DME_EQUIPMENT_DIAGRAMS } from "@/lib/dme-hardware-model";
import { validateEquipmentDiagrams } from "@/lib/equipment-diagram-types";
import { VOR_EQUIPMENT_DIAGRAMS } from "@/lib/vor-hardware-model";

describe("equipment block diagrams", () => {
  it("keeps all VOR and DME component/link identifiers valid", () => {
    expect(validateEquipmentDiagrams(VOR_EQUIPMENT_DIAGRAMS)).toBe(true);
    expect(validateEquipmentDiagrams(DME_EQUIPMENT_DIAGRAMS)).toBe(true);
  });

  it("lets the operator inspect and select a native block control", async () => {
    const user = userEvent.setup();
    const onInspect = vi.fn();
    const onToggle = vi.fn();
    render(
      <EquipmentBlockDiagram
        diagrams={DME_EQUIPMENT_DIAGRAMS}
        selectedComponentIds={[]}
        onInspectComponent={onInspect}
        onToggleComponent={onToggle}
      />,
    );

    const block = screen.getByRole("button", { name: /High Power Amplifier TX1, TX1/ });
    await user.click(block);
    expect(onInspect).toHaveBeenCalledWith(expect.objectContaining({ id: "dme-hpa-1" }));
    expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ id: "dme-hpa-1" }));
    expect(screen.getByRole("status")).toHaveTextContent("High Power Amplifier TX1");
  });

  it("shows matched, missing, and extra component evidence for the examiner", () => {
    render(
      <HardwareReview
        diagrams={DME_EQUIPMENT_DIAGRAMS}
        task={{
          expectedComponentIds: ["dme-hpa-1", "dme-rf-switch"],
          faultType: "Mất tín hiệu",
          adminNote: "Kiểm tra nhánh RF TX1.",
        }}
        answer={{
          selectedComponentIds: ["dme-hpa-1", "dme-rtc-1"],
          reasoning: "Công suất TX1 mất tại nhánh khuếch đại.",
          inspectedComponentIds: ["dme-hpa-1", "dme-rtc-1"],
          completedAt: "2026-07-17T09:00:00.000Z",
        }}
      />,
    );

    expect(screen.getByText("Khớp: High Power Amplifier TX1")).toBeInTheDocument();
    expect(screen.getByText("Bỏ sót: Transmit RF Switch")).toBeInTheDocument();
    expect(screen.getByText("Chọn thêm: Receiver / Transmitter Controller 1")).toBeInTheDocument();
  });
});
