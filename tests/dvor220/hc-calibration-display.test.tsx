import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CalibrationScreen } from "@/modules/operations/dvor-220/ui/calibration-screen";
import { Dvor220MainScreen } from "@/modules/operations/dvor-220/ui/main-screens";
import { deriveDvor220Snapshot } from "@/modules/operations/dvor-220/domain/engine";
import { createAuthorizedDvor220State } from "./helpers";

afterEach(cleanup);

function fixture() {
  const device = createAuthorizedDvor220State();
  device.configuration.running.station.carrierPowerW = 80;
  device.configuration.running.transmitters.tx1.carrierScalePercent = 100;
  for (const output of ["usbCos", "usbSin", "lsbCos", "lsbSin"] as const) {
    device.configuration.running.transmitters.tx1.sidebandPowerW[output] = 1.609;
    device.transmitters.tx1.rfOutputs[output] = true;
  }
  const snapshot = deriveDvor220Snapshot(device);
  snapshot.activeTransmitterId = "tx1";
  snapshot.transmitters.tx1.powerOn = true;
  snapshot.transmitters.tx1.rfOutputs.carrier = true;
  snapshot.transmitters.tx1.forwardPowerW.carrier = 80;
  for (const output of ["usbCos", "usbSin", "lsbCos", "lsbSin"] as const) {
    snapshot.transmitters.tx1.rfOutputs[output] = true;
    snapshot.transmitters.tx1.forwardPowerW[output] = 1.61;
    snapshot.pdc.forwardPowerW[output] = 1.66;
  }
  snapshot.pdc.forwardPowerW.carrier = 79.59;
  for (const monitor of ["mon1", "mon2"] as const) {
    for (const reading of Object.values(snapshot.monitors[monitor].channels.cha.readings)) {
      reading.status = "normal";
    }
  }
  return { device, snapshot, dispatch: vi.fn(() => ({ ok: true, state: device })) };
}

function value(dialog: ReturnType<typeof within>, name: string) {
  return dialog.getByText(name, { selector: "dt" }).nextElementSibling;
}

const outputs = [
  ["carrier", "Carrier", "CSB Power", "CSB Power"],
  ["usbCos", "USB COS", "USB COS Power", "USBCOS Power"],
  ["usbSin", "USB SIN", "USB SIN Power", "USBSIN Power"],
  ["lsbCos", "LSB COS", "LSB COS Power", "LSBCOS Power"],
  ["lsbSin", "LSB SIN", "LSB SIN Power", "LSBSIN Power"],
] as const;

describe.each(["maintenance-tx-setpoint", "maintenance-tx-reading", "maintenance-pdc-cal"] as const)("HC %s", (screenId) => {
  it.each(outputs)("formats the %s table and dialog independently", (output, name, tableName, inputName) => {
    const props = fixture();
    const setpoint = screenId === "maintenance-tx-setpoint";
    const pdc = screenId === "maintenance-pdc-cal";
    const carrier = output === "carrier";
    render(<CalibrationScreen {...props} screenId={screenId} />);
    const button = screen.getByRole("button", { name: `Calibrate ${setpoint ? tableName : name} (TX1)` });
    const cells = within(button.closest("tr")!).getAllByRole("cell");
    const unit = setpoint ? "" : " W";
    expect(cells[2]).toHaveTextContent(`${carrier ? "80.00" : "1.609"}${unit}`);
    expect(cells[3].textContent).toBe(`${carrier ? (pdc ? "79.59" : "80") : (pdc ? "1.66" : "1.61")}${unit}`);
    fireEvent.click(button);
    const dialog = within(screen.getByRole("dialog", { name: "Calibration" }));
    expect(dialog.getByText("Current Setting (TX1)")).toBeInTheDocument();
    expect(dialog.getByText(setpoint ? `${inputName} (TX1)` : `${name} Power (Reading, TX1)`)).toBeInTheDocument();
    expect(value(dialog, "Current Setpoint")?.textContent).toBe(`${carrier ? "80.00" : "1.61"} W`);
    expect(value(dialog, "Current Reading")?.textContent).toBe(carrier ? (pdc ? "79.59" : "80.00") : setpoint ? "1.61" : pdc ? "1.6600" : "1.6100");
    const input = dialog.getByRole("spinbutton", { name: "Reference value" });
    expect(input).toHaveAttribute("value", carrier ? "80.0" : "1.6090");
    expect(input).toHaveAttribute("step", "any");
    fireEvent.change(input, { target: { value: "1.60912345" } });
    expect(input).toHaveValue(1.60912345);
    fireEvent.click(dialog.getByRole("button", { name: "Calibrate" }));
    expect(props.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "calibrate", calibration: expect.objectContaining({ referenceValue: 1.60912345 }) }));
  });
});

describe("HC monitor dialogs", () => {
  it.each([
    ["Bearing Error", "Bearing Error", "Current Cal. Offset"],
    ["30Hz Mod.", "AM30", "Current Cal. Factor"],
    ["1020Hz Mod.", "AM1020", "Current Cal. Factor"],
    ["9960Hz Mod.", "AM9960", "Current Cal. Factor"],
    ["RF Level", "RF Level", "Current Cal. Factor"],
    ["FM Index", "FM Index", "Current Cal. Factor"],
  ])("matches %s naming, units and initial precision", (name, inputName, factor) => {
    const props = fixture();
    render(<CalibrationScreen {...props} screenId="maintenance-monitor-cal" />);
    fireEvent.click(screen.getByRole("button", { name: `Calibrate ${name} (MON1 · CH.A)` }));
    const dialog = within(screen.getByRole("dialog", { name: "Calibration" }));
    expect(dialog.getByText("Current Setting (MON1)")).toBeInTheDocument();
    expect(dialog.getByText(`${inputName} (MON1:CH.A Channel on TX1)`)).toBeInTheDocument();
    expect(dialog.getByText(factor)).toBeInTheDocument();
    expect(value(dialog, "Nominal")?.textContent).toMatch(/^-?\d+\.\d{2}$/);
    expect(value(dialog, "Current Reading")?.textContent).toMatch(/^-?\d+\.\d{2}$/);
    expect(dialog.getByRole("spinbutton")).toHaveAttribute("value", value(dialog, "Nominal")?.textContent);
  });

  it("uses the actual monitor, channel and active transmitter", () => {
    const props = fixture();
    props.snapshot.activeTransmitterId = "tx2";
    props.snapshot.monitors.mon2.channels.chb1.enabled = true;
    props.snapshot.monitors.mon2.channels.chb1.readings.bearingError.status = "normal";
    render(<CalibrationScreen {...props} screenId="maintenance-monitor-cal" />);
    fireEvent.click(screen.getByRole("tab", { name: "MON2" }));
    fireEvent.click(screen.getByRole("button", { name: "Calibrate Bearing Error (MON2 · CH.B.1)" }));
    expect(screen.getByText("Current Setting (MON2)")).toBeInTheDocument();
    expect(screen.getByText("Bearing Error (MON2:CH.B.1 Channel on TX2)")).toBeInTheDocument();
  });

  it("does not invent a transmitter or enable unavailable readings", () => {
    const props = fixture();
    props.snapshot.activeTransmitterId = null;
    props.snapshot.monitors.mon1.channels.cha.readings.rfLevel.status = "stabilizing";
    render(<CalibrationScreen {...props} screenId="maintenance-monitor-cal" />);
    expect(screen.getByRole("button", { name: "Calibrate RF Level (MON1 · CH.A)" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Calibrate Bearing Error (MON1 · CH.A)" }));
    expect(screen.getByText("Bearing Error (MON1:CH.A Channel on —)")).toBeInTheDocument();
    const dialog = within(screen.getByRole("dialog", { name: "Calibration" }));
    fireEvent.change(dialog.getByRole("spinbutton"), { target: { value: "" } });
    expect(dialog.getByRole("button", { name: "Calibrate" })).toBeDisabled();
  });

  it("retains command error feedback without replacing the typed reference", () => {
    const props = fixture();
    const dispatch = vi.fn(() => ({ ok: false, state: props.device, error: "Calibration rejected" }));
    render(<CalibrationScreen {...props} dispatch={dispatch} screenId="maintenance-monitor-cal" />);
    fireEvent.click(screen.getByRole("button", { name: "Calibrate Bearing Error (MON1 · CH.A)" }));
    const dialog = within(screen.getByRole("dialog", { name: "Calibration" }));
    const input = dialog.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "-0.12345" } });
    fireEvent.click(dialog.getByRole("button", { name: "Calibrate" }));
    expect(dialog.getByRole("alert")).toHaveTextContent("Calibration rejected");
    expect(input).toHaveValue(-0.12345);
  });
});

describe("HC status gauges", () => {
  it.each(["cma-sma", "pdc", "monitor-cha"] as const)("formats documented %s gauges", (screenId) => {
    const props = fixture();
    render(<Dvor220MainScreen {...props} screenId={screenId} openDialog={vi.fn()} navigate={vi.fn()} />);
    const labels = screenId === "monitor-cha" ? ["Bearing Error", "RF Level", "1020Hz AM", "FM Index", "30Hz AM", "9960Hz AM", "9960Hz Distortion"] : screenId === "pdc" ? ["USB COS", "USB SIN", "LSB COS", "LSB SIN"] : ["SMA USB COS", "SMA USB SIN", "SMA LSB COS", "SMA LSB SIN"];
    for (const label of labels) {
      const card = screen.getByLabelText(`${screenId === "monitor-cha" ? "MON1" : "TX1"} ${label}`);
      expect(card.querySelector("output")?.textContent).toMatch(/^-?\d+\.\d{2}( |$)/);
    }
    if (screenId === "cma-sma") {
      const power = within(screen.getByText("CMA/SMA Power Output").closest("details")!);
      expect(power.getByLabelText("TX1 CMA").querySelector("output")?.textContent).toMatch(/^80 W$/);
      const thermal = within(screen.getByText("Thermal Status").closest("details")!);
      expect(thermal.getByLabelText("TX1 CMA").querySelector("output")?.textContent).toMatch(/^\d+\.\d °C$/);
      expect(thermal.getByLabelText("TX1 SMA USB").querySelector("output")?.textContent).toMatch(/^\d+\.\d{2} °C$/);
    }
    if (screenId === "pdc") {
      expect(screen.getByLabelText("TX1 Carrier").querySelector("output")?.textContent).toBe("79.59 W");
      expect(screen.getByLabelText("Antenna VSWR").querySelector("output")?.textContent).toMatch(/^\d+\.\d{2} :1$/);
    }
  });

  it("leaves SYN frequency precision unchanged", () => {
    const props = fixture();
    render(<Dvor220MainScreen {...props} screenId="syn" openDialog={vi.fn()} navigate={vi.fn()} />);
    expect(screen.getByLabelText("TX1 Carrier").querySelector("output")?.textContent).toMatch(/^\d+\.\d{5} MHz$/);
  });
});
