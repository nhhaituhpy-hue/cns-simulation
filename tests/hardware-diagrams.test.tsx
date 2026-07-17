import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EquipmentBlockDiagram } from "@/components/hardware/equipment-block-diagram";
import { HardwareReview } from "@/components/hardware/hardware-review";
import { DME_EQUIPMENT_DIAGRAMS } from "@/lib/dme-hardware-model";
import { normalizeEquipmentComponentIds } from "@/lib/equipment-diagram-compatibility";
import { validateEquipmentDiagrams } from "@/lib/equipment-diagram-types";
import { VOR_EQUIPMENT_DIAGRAMS } from "@/lib/vor-hardware-model";

describe("equipment block diagrams", () => {
  it("keeps all VOR and DME component/link identifiers valid", () => {
    expect(validateEquipmentDiagrams(VOR_EQUIPMENT_DIAGRAMS)).toBe(true);
    expect(validateEquipmentDiagrams(DME_EQUIPMENT_DIAGRAMS)).toBe(true);
  });

  it("keeps detailed diagram canvases compact enough for a desktop workspace", () => {
    const detailedDiagrams = [
      VOR_EQUIPMENT_DIAGRAMS.find((diagram) => diagram.id === "vor-transmitter-rf"),
      DME_EQUIPMENT_DIAGRAMS[0],
    ];

    for (const diagram of detailedDiagrams) {
      expect(diagram?.canvas?.widthRem).toBeLessThanOrEqual(64);
      expect(diagram?.canvas?.heightRem).toBeLessThanOrEqual(42);
    }
  });

  it("models the detailed DVOR sideband and antenna distribution paths", () => {
    const transmitter = VOR_EQUIPMENT_DIAGRAMS.find((diagram) => diagram.id === "vor-transmitter-rf");
    expect(transmitter).toBeDefined();
    expect(transmitter?.components).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "vor-tx1-sideband-1" }),
      expect.objectContaining({ id: "vor-tx1-sideband-4" }),
      expect.objectContaining({ id: "vor-tx2-sideband-1" }),
      expect.objectContaining({ id: "vor-sideband-switch-1" }),
      expect.objectContaining({ id: "vor-sideband-switch-4" }),
      expect.objectContaining({ id: "vor-antenna-bank-1" }),
      expect.objectContaining({ id: "vor-antenna-bank-4" }),
      expect.objectContaining({ id: "vor-directional-coupler-30db" }),
    ]));
    expect(transmitter?.links).toEqual(expect.arrayContaining([
      expect.objectContaining({ fromComponentId: "vor-tx1-sideband-1", toComponentId: "vor-sideband-switch-1", kind: "rf" }),
      expect.objectContaining({ fromComponentId: "vor-sideband-switch-1", toComponentId: "vor-antenna-bank-1", kind: "rf" }),
      expect.objectContaining({ fromComponentId: "vor-commutator", toComponentId: "vor-antenna-bank-4", kind: "control" }),
    ]));
  });

  it("keeps HPA between each DME LPA/Synth and the shared RF switch", () => {
    const diagram = DME_EQUIPMENT_DIAGRAMS[0];
    expect(diagram.links).toEqual(expect.arrayContaining([
      expect.objectContaining({ fromComponentId: "dme-lpa-synth-1", toComponentId: "dme-hpa-1", kind: "rf" }),
      expect.objectContaining({ fromComponentId: "dme-hpa-1", toComponentId: "dme-rf-switch", kind: "rf" }),
      expect.objectContaining({ fromComponentId: "dme-lpa-synth-2", toComponentId: "dme-hpa-2", kind: "rf" }),
      expect.objectContaining({ fromComponentId: "dme-hpa-2", toComponentId: "dme-rf-switch", kind: "rf" }),
      expect.objectContaining({ fromComponentId: "dme-hpa-1", toComponentId: "dme-monitor-2", kind: "monitor" }),
      expect.objectContaining({ fromComponentId: "dme-hpa-2", toComponentId: "dme-monitor-1", kind: "monitor" }),
    ]));
    expect(diagram.links).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ fromComponentId: "dme-lpa-synth-1", toComponentId: "dme-rf-switch" }),
      expect.objectContaining({ fromComponentId: "dme-lpa-synth-2", toComponentId: "dme-rf-switch" }),
    ]));
  });

  it("expands legacy aggregate component IDs without losing unknown IDs", () => {
    expect(normalizeEquipmentComponentIds("vor", ["vor-sideband-amp-1", "vor-carrier-amp-1"])).toEqual([
      "vor-tx1-sideband-1",
      "vor-tx1-sideband-2",
      "vor-tx1-sideband-3",
      "vor-tx1-sideband-4",
      "vor-carrier-amp-1",
    ]);
    expect(normalizeEquipmentComponentIds("dme", ["dme-bcps"])).toEqual([
      "dme-bcps-1",
      "dme-bcps-2",
    ]);
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
    expect(block).toHaveTextContent("HPA 1");
    expect(block).not.toHaveTextContent("TX1 High Power");
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
