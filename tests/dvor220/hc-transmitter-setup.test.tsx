import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Dvor220SetupScreen } from "@/modules/operations/dvor-220/ui/setup-screens";
import { reduceDvor220Command } from "@/modules/operations/dvor-220/domain/commands";
import { deriveDvor220Snapshot } from "@/modules/operations/dvor-220/domain/engine";
import type { Dvor220Command } from "@/modules/operations/dvor-220/domain/types";
import { createAuthorizedDvor220State } from "./helpers";

afterEach(cleanup);

function mount(initial = createAuthorizedDvor220State(), screenId: "setup-transmitter" | "setup-station" = "setup-transmitter") {
  let device = initial;
  const dispatch = vi.fn((command: Dvor220Command) => {
    const result = reduceDvor220Command(device, command);
    device = result.state;
    view.rerender(content());
    return result;
  });
  const content = () => <Dvor220SetupScreen screenId={screenId} device={device} snapshot={deriveDvor220Snapshot(device)} dispatch={dispatch} />;
  const view = render(content());
  return { dispatch, device: () => device };
}

function header() {
  return within(screen.getByRole("heading", { name: "Transmitter Setup" }).closest("header")!);
}

describe("HC Transmitter Setup shared table", () => {
  it("renders HC columns, sections and rows in order with collapsible sections", () => {
    mount();
    const table = within(screen.getByRole("table", { name: "Transmitter Setup" }));
    expect(table.getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual(["Items", "TX1", "TX2", "Units", "Helper"]);
    const sections = ["Output Power", "Setup Option", "Azimuth Offset", "RF Phasing", "STB RF Phasing", "Modulation Depth"];
    expect(table.getAllByRole("button").map((button) => button.textContent?.replace(/[▾▸]/g, "").trim())).toEqual(sections);
    for (const section of sections) expect(table.getByRole("button", { name: section })).toHaveAttribute("aria-expanded", "true");
    expect(table.getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual([
      "Carrier", "USB COS", "USB SIN", "LSB COS", "LSB SIN", "Modulation Depth", "IDENT", "Azimuth", "Azimuth",
      "USB Phasing COS to SIN", "LSB Phasing COS to SIN", "Carrier to sideband",
      "USB Phasing COS to SIN", "LSB Phasing COS to SIN", "Carrier to sideband", "30Hz", "IDENT", "Voice", "IDENT code",
    ]);
    fireEvent.click(table.getByRole("button", { name: "Output Power" }));
    expect(table.queryByRole("spinbutton", { name: "TX1 Carrier" })).not.toBeInTheDocument();
    fireEvent.click(table.getByRole("button", { name: "Output Power" }));
    expect(table.getByRole("spinbutton", { name: "TX1 Carrier" })).toBeInTheDocument();
  });

  it.each(["Carrier", "USB COS", "USB SIN", "LSB COS", "LSB SIN"])("opens the unchanged Helper from %s on TX1", (label) => {
    mount();
    const row = screen.getByRole("spinbutton", { name: `TX1 ${label}` }).closest("tr")!;
    fireEvent.click(within(row).getByRole("link", { name: "Helper" }));
    const dialog = within(screen.getByRole("dialog", { name: "Output Power" }));
    expect(dialog.getByRole("tab", { name: "TX1" })).toHaveAttribute("aria-selected", "true");
    expect(dialog.getAllByRole("slider")).toHaveLength(5);
    expect(dialog.getByRole("spinbutton", { name: "USB COS" })).toHaveAttribute("step", "0.001");
  });

  it("moves Apply/Save to the header and leaves only validation and Reset Draft below", () => {
    const state = mount();
    expect(header().getByRole("button", { name: "Apply" })).toBeDisabled();
    expect(header().getByRole("button", { name: "Save" })).toBeDisabled();
    fireEvent.change(screen.getByRole("spinbutton", { name: "TX1 Carrier" }), { target: { value: "90" } });
    fireEvent.click(header().getByRole("button", { name: "Apply" }));
    expect(state.device().configuration.running.transmitters.tx1.carrierScalePercent).toBe(90);
    expect(state.dispatch).toHaveBeenCalledWith({ type: "apply-draft" });
    fireEvent.click(header().getByRole("button", { name: "Save" }));
    expect(state.dispatch).toHaveBeenCalledWith({ type: "save-profile" });
    const footer = screen.getByRole("button", { name: "Reset Draft" }).closest("footer")!;
    expect(within(footer).getAllByRole("button").map((button) => button.textContent)).toEqual(["Reset Draft"]);
    expect(within(footer).getByRole("status")).toHaveTextContent("Delay exceeds the 10 second technical-specification hold-off range.");
    expect(screen.queryByRole("button", { name: "Profile Save" })).not.toBeInTheDocument();
  });

  it("copies edits from either TX only while the page checkbox is checked", () => {
    const state = mount();
    fireEvent.click(header().getByRole("checkbox", { name: "Same to TX1 and TX2" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "TX2 USB COS" }), { target: { value: "1.23" } });
    expect(state.device().configuration.draft.transmitters.tx1.sidebandPowerW.usbCos).toBe(1.23);
    expect(state.device().configuration.draft.transmitters.tx2.sidebandPowerW.usbCos).toBe(1.23);
    fireEvent.change(screen.getByRole("combobox", { name: "TX1 Setup Option IDENT" }), { target: { value: "individual" } });
    expect(state.device().configuration.draft.transmitters.tx2.useStationIdent).toBe(false);
    fireEvent.change(screen.getByRole("textbox", { name: "TX2 IDENT code" }), { target: { value: "abc" } });
    expect(state.device().configuration.draft.transmitters.tx1.identCode).toBe("ABC");
    fireEvent.click(header().getByRole("checkbox", { name: "Same to TX1 and TX2" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "TX1 USB COS" }), { target: { value: "1.45" } });
    expect(state.device().configuration.draft.transmitters.tx2.sidebandPowerW.usbCos).toBe(1.23);
  });

  it("wires inherited settings, azimuth and all RF/STB phase fields without losing precision", () => {
    const state = mount();
    fireEvent.change(screen.getByRole("combobox", { name: "TX1 Setup Option Modulation Depth" }), { target: { value: "station" } });
    expect(screen.getByRole("spinbutton", { name: "TX1 30Hz" })).toBeDisabled();
    expect(screen.getByRole("spinbutton", { name: "TX1 Voice" })).toBeDisabled();
    fireEvent.change(screen.getByRole("combobox", { name: "TX1 Setup Option Azimuth" }), { target: { value: "individual" } });
    const azimuth = screen.getByRole("spinbutton", { name: "TX1 Azimuth Offset Azimuth" });
    expect(azimuth).toHaveAttribute("step", "0.01");
    fireEvent.change(azimuth, { target: { value: "-2.15" } });
    expect(state.device().configuration.draft.transmitters.tx1.azimuthOffsetDeg).toBe(-2.15);
    for (const [section, key] of [["RF Phasing", "rfPhaseDeg"], ["STB RF Phasing", "standbyRfPhaseDeg"]] as const) {
      for (const [label, field] of [["USB Phasing COS to SIN", "usbCosToSin"], ["LSB Phasing COS to SIN", "lsbCosToSin"], ["Carrier to sideband", "carrierToSideband"]] as const) {
        fireEvent.change(screen.getByRole("spinbutton", { name: `TX2 ${section} ${label}` }), { target: { value: "95.5" } });
        expect(state.device().configuration.draft.transmitters.tx2[key][field]).toBe(95.5);
      }
    }
    expect(screen.getAllByRole("link", { name: "Helper" })).toHaveLength(5);
  });

  it("preserves validation gating and disables Save during scenarios", () => {
    const initial = createAuthorizedDvor220State();
    initial.configuration.flashDirty = true;
    initial.scenario.active = {} as NonNullable<typeof initial.scenario.active>;
    mount(initial);
    expect(header().getByRole("button", { name: "Save" })).toBeDisabled();
    fireEvent.change(screen.getByRole("spinbutton", { name: "TX1 USB COS" }), { target: { value: "6" } });
    expect(header().getByRole("button", { name: "Apply" })).toBeDisabled();
  });

  it("disables edits and Helper entry points without configuration permission", () => {
    mount(createAuthorizedDvor220State({ level: 1 }));
    expect(header().getByRole("checkbox")).toBeDisabled();
    expect(header().getByRole("button", { name: "Apply" })).toBeDisabled();
    expect(screen.getAllByRole("spinbutton").every((input) => input.hasAttribute("disabled"))).toBe(true);
    expect(screen.getAllByRole("combobox").every((input) => input.hasAttribute("disabled"))).toBe(true);
    const helper = screen.getAllByRole("link", { name: "Helper" })[0];
    expect(helper).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(helper);
    expect(screen.queryByRole("dialog", { name: "Output Power" })).not.toBeInTheDocument();
  });

  it("formats sidebands and degrees without rounding stored edits or altering input steps", () => {
    const initial = createAuthorizedDvor220State();
    initial.configuration.draft.transmitters.tx1.sidebandPowerW.usbCos = 1.609;
    const state = mount(initial);
    const sideband = screen.getByRole("spinbutton", { name: "TX1 USB COS" });
    expect(sideband).toHaveAttribute("value", "1.609");
    expect(sideband).toHaveAttribute("step", "0.01");
    const phase = screen.getByRole("spinbutton", { name: "TX1 RF Phasing USB Phasing COS to SIN" });
    expect(phase.getAttribute("value")).toMatch(/^\d+\.\d$/);
    fireEvent.focus(phase);
    fireEvent.change(phase, { target: { value: "95.55" } });
    expect(state.device().configuration.draft.transmitters.tx1.rfPhaseDeg.usbCosToSin).toBe(95.55);
    fireEvent.blur(phase);
    expect(phase).toHaveAttribute("value", "95.5");
  });

  it("keeps other Setup pages' footer actions unchanged", () => {
    mount(createAuthorizedDvor220State(), "setup-station");
    const footer = screen.getByRole("button", { name: "Reset Draft" }).closest("footer")!;
    expect(within(footer).getByRole("button", { name: "Apply" })).toBeInTheDocument();
    expect(within(footer).getByRole("button", { name: "Profile Save" })).toBeInTheDocument();
  });
});
