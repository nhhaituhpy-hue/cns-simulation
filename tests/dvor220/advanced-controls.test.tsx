import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useStore } from "zustand";
import { Dvor220MaintenanceScreen } from "@/modules/operations/dvor-220/ui/maintenance-screens";
import { Dvor220Simulator } from "@/modules/operations/dvor-220/dvor220-simulator";
import { createDvor220Store } from "@/modules/operations/dvor-220/store/dvor220-store";
import { createAuthorizedDvor220State } from "./helpers";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
afterEach(cleanup);

function setup() {
  const store = createDvor220Store({ initialNowMs: 0 });
  store.setState({ device: createAuthorizedDvor220State() });
  store.getState().advanceTime(1000);
  function Harness() {
    const state = useStore(store);
    return <Dvor220MaintenanceScreen screenId="maintenance-advanced" {...state} navigate={() => {}} />;
  }
  render(<Harness />);
  return store;
}

describe("Cam Ranh Advanced Control", () => {
  it("renders the warning, tabs and five sections in screenshot order", () => {
    setup();
    expect(screen.getByText("Advanced Control", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("*** WARNING ***")).toBeInTheDocument();
    expect(screen.getByText("HAZARDOUSLY MISLEADING INFORMATION (HMI)")).toBeInTheDocument();
    expect(screen.getByText("particularly when supporting live aircraft traffic.")).toBeInTheDocument();
    expect(screen.getByText("must be")).toBeInTheDocument();
    expect(screen.getByText("Before closing this page, ensure that all controls are returned to their normal states.")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "TX1" })).toHaveAttribute("aria-selected", "true");
    for (const tx of ["TX1", "TX2"]) {
      fireEvent.click(screen.getByRole("tab", { name: tx }));
      expect(Array.from(document.querySelectorAll("summary")).map((node) => node.textContent)).toEqual([
        "IDENT Keying", "Sideband Blending", "Sideband Antenna Switching",
        "Automated Ground Error Curve Check", "Standby Transmitter Azimuth Emulation",
      ]);
    }
    expect(screen.queryByText("Monitor Certification")).not.toBeInTheDocument();
    expect(screen.queryByText("Fault Clear")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Inject High VSWR" })).not.toBeInTheDocument();
  });

  it("enables Apply only when changed and applies to only that TX", () => {
    const store = setup();
    const ident = within(screen.getByRole("group", { name: "IDENT Keying" }));
    expect(ident.getByRole("radio", { name: "Normal" })).toBeChecked();
    expect(ident.getByRole("button", { name: "Apply" })).toBeDisabled();
    fireEvent.click(ident.getByRole("radio", { name: "Off" }));
    expect(ident.getByRole("button", { name: "Apply" })).toBeEnabled();
    fireEvent.click(ident.getByRole("button", { name: "Apply" }));
    expect(ident.getByRole("button", { name: "Apply" })).toBeDisabled();
    expect(store.getState().device.transmitters.tx1.advancedControls.identKeying).toBe("off");
    expect(store.getState().device.transmitters.tx2.advancedControls.identKeying).toBe("normal");
    fireEvent.click(screen.getByRole("tab", { name: "TX2" }));
    expect(within(screen.getByRole("group", { name: "IDENT Keying" })).getByRole("radio", { name: "Normal" })).toBeChecked();
  });

  it("disables azimuth emulation on the main TX and applies standby changes", () => {
    const store = setup();
    expect(within(screen.getByRole("group", { name: "Standby Transmitter Azimuth Emulation" })).getByRole("radio", { name: "Off" })).toBeDisabled();
    fireEvent.click(screen.getByRole("tab", { name: "TX2" }));
    const azimuth = within(screen.getByRole("group", { name: "Standby Transmitter Azimuth Emulation" }));
    expect(azimuth.getByRole("radio", { name: "Off" })).toBeEnabled();
    fireEvent.click(azimuth.getByRole("radio", { name: "Off" }));
    fireEvent.click(azimuth.getByRole("button", { name: "Apply" }));
    expect(store.getState().device.transmitters.tx2.advancedControls.standbyAzimuthEmulation).toBe("off");
    act(() => { store.getState().dispatch({ type: "select-main", transmitterId: "tx2" }); });
    expect(azimuth.getByRole("radio", { name: "Off" })).toBeDisabled();
  });

  it("opens the 48-antenna manual selector and swaps positions", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Manual Control..." }));
    const dialog = within(screen.getByRole("dialog", { name: "Antenna Manual" }));
    expect(dialog.getAllByRole("button", { name: /^Antenna #/ })).toHaveLength(48);
    const antenna = dialog.getByRole("button", { name: "Antenna #2" });
    fireEvent.click(antenna);
    expect(dialog.getByRole("status")).toHaveTextContent("USB #2 · LSB #26");
    fireEvent.click(antenna);
    expect(dialog.getByRole("status")).toHaveTextContent("USB #26 · LSB #2");
    fireEvent.click(dialog.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog", { name: "Antenna Manual" })).not.toBeInTheDocument();
  });

  it("opens ground check gated by local MAINT and starts for the tab TX", () => {
    const store = setup();
    fireEvent.click(screen.getByRole("tab", { name: "TX2" }));
    fireEvent.click(screen.getByRole("button", { name: "Run..." }));
    const dialog = within(screen.getByRole("dialog", { name: "Automated Ground Error Curve Check" }));
    expect(store.getState().device.groundCheck.status).toBe("idle");
    expect(dialog.getByRole("button", { name: "Run" })).toBeDisabled();
    fireEvent.click(dialog.getByRole("button", { name: "MAINT" }));
    fireEvent.click(dialog.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Run..." }));
    expect(store.getState().device.groundCheck).toMatchObject({ status: "running", transmitterId: "tx2" });
    fireEvent.click(within(screen.getByRole("dialog", { name: "Automated Ground Error Curve Check" })).getByRole("button", { name: "Complete 5 s Test" }));
    expect(store.getState().device.groundCheck.status).toBe("completed");
  });

  it("keeps the classroom Antenna / VSWR Test working", () => {
    const store = createDvor220Store({ initialNowMs: 0 });
    render(<Dvor220Simulator store={store} />);
    fireEvent.click(screen.getByRole("button", { name: "Simulator Tools" }));
    fireEvent.click(screen.getByRole("button", { name: "Antenna / VSWR Test" }));
    fireEvent.click(screen.getByRole("button", { name: "Inject High VSWR" }));
    expect(store.getState().snapshot.pdc.antennas[0]).toMatchObject({ usbVswr: 3.1, lsbVswr: 2.8 });
  });
});
