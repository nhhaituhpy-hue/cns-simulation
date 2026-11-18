import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DME_320_BLOCK_BY_ID } from "@/modules/operations/dme-320/block-diagram-data";
import { Dme320ModuleFaceplate } from "@/modules/operations/dme-320/dme320-module-faceplates";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

// Explicit physical connector IDs, not a label/prefix-matching oracle.
const panelPoints = {
  scu: { "test-pin": ["TP9", "TP16"] },
  rxu: { bnc: ["LOG VIDEO WIDE", "ON CH DET", "LOG VIDEO"] },
  hpa: { bnc: ["REPLY ENV"] },
  txu: { bnc: ["DETECTED VIDEO", "FREQ."] },
  dcdc: { "test-jack": ["+5V_TP", "+8V_TP", "+15V_TP", "-15V_TP", "+28V_TP", "+50V_TP", "GND"] },
  "dcdc-a": { "test-jack": ["+5V_TP", "+15V_TP", "-15V_TP", "GND"] },
  tcu: { "test-pin": ["TOA PULSE", "DECODED", "DEAD TIME", "GAUSSIAN PULSE", "RECTANGULAR PULSE", "GND", "RX INHIBIT", "LDES", "ID CODE", "ID PULSE", "SQUITTER"] },
  mon: { "test-pin": ["FPGA STATUS", "MCU STATUS", "INTG PULSE", "INPUT ENVELOPE", "INTERROGATION TRIGGER", "IDENT"] },
  pmu: { "test-jack": ["GND", "BATT VOLT", "ACDC VOLT"] },
  rfg: { bnc: ["68 MHz OSC", "RFG FREQ."], "test-pin": ["PULSE DETECT"] },
} as const;

describe("DME 320 exact source-aligned panel connectors", () => {
  it("does not bind a connector to a similar label or a composite/unknown ID", () => {
    const block = DME_320_BLOCK_BY_ID.get("rxu")!;
    const get = DME_320_BLOCK_BY_ID.get.bind(DME_320_BLOCK_BY_ID);
    const points = [{ id: "LOG VIDEO / LOG VIDEO WIDE", label: "LOG VIDEO", description: "Synthetic unknown ID, not a manual record." }];
    vi.spyOn(DME_320_BLOCK_BY_ID, "get").mockImplementation((id) => id === "rxu" ? { ...block, testPoints: points } : get(id));
    render(<Dme320ModuleFaceplate kind="rxu" blockId="rxu" onSelectPoint={vi.fn()} />);
    expect(within(screen.getByRole("group")).queryByRole("button")).not.toBeInTheDocument();
    expect(document.querySelector("[data-point-id]")).toBeNull();
  });

  it("shows only the three source-backed PMU jacks and a non-telemetry display", () => {
    render(<Dme320ModuleFaceplate kind="pmu" blockId="pmu" onSelectPoint={vi.fn()} />);
    const panel = screen.getByRole("group");
    expect(within(panel).queryByText("28.0")).not.toBeInTheDocument();
    expect(within(panel).getByText("----")).toBeInTheDocument();
    for (const label of ["+5V", "+15V", "-15V"]) expect(within(panel).queryByText(label)).not.toBeInTheDocument();
    expect(panel.querySelectorAll('[data-connector-kind="test-jack"]')).toHaveLength(3);
    const labels = [...panel.querySelectorAll('[data-connector-kind="test-jack"] text')].map((node) => node.textContent);
    expect(labels).toEqual(["GND", "BATT VOLT", "ACDC VOLT"]);
    for (const label of ["TEMP", "DC V", "DC I", "BATT V", "BATT I"]) {
      expect(within(panel).getByText(label).closest('[role="button"]')).toBeNull();
    }
  });

  it("keeps gradient identifiers unique when two identical panels mount together", () => {
    const view = render(<><Dme320ModuleFaceplate kind="rxu" blockId="rxu" /><Dme320ModuleFaceplate kind="rxu" blockId="rxu" /></>);
    const ids = [...view.container.querySelectorAll("linearGradient")].map((node) => node.id);
    expect(new Set(ids).size).toBe(2);
    for (const svg of view.container.querySelectorAll("svg")) {
      expect(svg.querySelector('rect[fill^="url"]')?.getAttribute("fill")).toBe(`url(#${svg.querySelector("linearGradient")!.id})`);
    }
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it.each(Object.keys(panelPoints) as (keyof typeof panelPoints)[])("%s exposes mapped physical points and invokes the exact catalog object", (blockId) => {
    const block = DME_320_BLOCK_BY_ID.get(blockId)!;
    const select = vi.fn();
    render(<Dme320ModuleFaceplate kind={block.faceplate!} blockId={blockId} onSelectPoint={select} />);
    const panel = screen.getByRole("group");
    const expected = Object.entries(panelPoints[blockId]).flatMap(([kind, ids]) => ids.map((id: string) => ({ kind, point: block.testPoints.find((point) => point.id === id) })));
    expect(expected.length).toBe(block.testPoints.length);
    expect(expected.every((item) => item.point)).toBe(true);
    expect(within(panel).getAllByRole("button")).toHaveLength(expected.length);
    for (const { kind, point } of expected) {
      const connector = within(panel).getByRole("button", { name: `Xem tín hiệu ${point!.id} ${point!.label} trên panel` });
      expect(connector).toHaveAttribute("data-point-id", point!.id);
      expect(connector).toHaveAttribute("data-connector-kind", kind);
      connector.focus();
      fireEvent.click(connector);
      fireEvent.keyDown(connector, { key: "Enter" });
      fireEvent.keyDown(connector, { key: " " });
      expect(select).toHaveBeenLastCalledWith(point);
    }
    expect(select).toHaveBeenCalledTimes(expected.length * 3);
  });
});
