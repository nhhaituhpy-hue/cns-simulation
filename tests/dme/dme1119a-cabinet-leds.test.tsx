import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  applyDme1119aScenarioFaults,
  type Dme1119aScenarioFault,
} from "@/lib/dme1119a";
import { Dme1119aCabinet } from "@/modules/devices/dme-1119a/dme-1119a-cabinet";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";

/**
 * Stage 3 (G06): cabinet/faceplate LEDs are driven by the PMDT store's
 * derived state. The HD-KTDA daily check is an LED inspection, so the
 * cabinet must react to injected faults exactly like the PMDT screens do.
 */
function renderCabinet() {
  return render(
    <Dme1119aCabinet surface="front" selectedHotspotIds={new Set()} onSelect={() => {}} />,
  );
}

function led(container: HTMLElement, ledId: string): HTMLElement {
  const element = container.querySelector(`[data-led="${ledId}"]`);
  expect(element, `LED ${ledId} should exist`).not.toBeNull();
  return element as HTMLElement;
}

function expectLed(container: HTMLElement, ledId: string, on: boolean) {
  expect(led(container, ledId).getAttribute("data-on")).toBe(on ? "true" : "false");
}

function injectFaults(faults: Dme1119aScenarioFault[]) {
  const state = useDmePmdtStore.getState();
  act(() => {
    useDmePmdtStore.setState({ data: applyDme1119aScenarioFaults(state.data, faults) });
  });
}

describe("DME 1119A cabinet LEDs (Stage 3, G06)", () => {
  beforeEach(() => {
    useDmePmdtStore.getState().reset();
  });

  it("healthy state: no monitor alarm LED is lit anywhere on the cabinet", () => {
    const { container } = renderCabinet();

    for (const monitor of [1, 2] as const) {
      expectLed(container, `monitor-${monitor}-normal`, true);
      expectLed(container, `monitor-${monitor}-pre-alarm`, false);
      expectLed(container, `monitor-${monitor}-primary-alarm`, false);
      expectLed(container, `monitor-${monitor}-secondary-alarm`, false);
      expectLed(container, `monitor-${monitor}-power`, true);
      for (const path of ["integral", "standby"] as const) {
        expectLed(container, `lcu-monitor-${path}-${monitor}-normal`, true);
        expectLed(container, `lcu-monitor-${path}-${monitor}-primary`, false);
        expectLed(container, `lcu-monitor-${path}-${monitor}-secondary`, false);
      }
    }
    // TX1 is on the antenna, TX2 on the load; neither chain is faulted.
    expectLed(container, "hpa-1", true);
    expectLed(container, "status-tx1-on-air", true);
    expectLed(container, "status-tx1-fault", false);
    expectLed(container, "status-tx2-load", true);
    expectLed(container, "status-tx2-fault", false);
    expectLed(container, "lcu-tx1-antenna", true);
    expectLed(container, "lcu-tx2-load", true);
    // Power/facility indications healthy.
    expectLed(container, "lcu-system-lcu-power-on", true);
    expectLed(container, "lcu-system-on-battery", false);
    expectLed(container, "lcu-system-maintenance-alert", false);
    expectLed(container, "facilities-ac-fail", false);
    expectLed(container, "rtc-1-cpu", true);
    expectLed(container, "rtc-1-overload", false);
  });

  it("TX power fault: monitor shows exactly the PRIMARY alarm class and the TX1 chain shows its fault", () => {
    const { container } = renderCabinet();
    injectFaults([{ id: "fault-power-loss", kind: "tx-power-loss", transmitter: "tx1", lossDb: 30 }]);

    // Worst-state-wins: exactly one alarm indication on the monitor card.
    expectLed(container, "monitor-1-primary-alarm", true);
    expectLed(container, "monitor-1-secondary-alarm", false);
    expectLed(container, "monitor-1-pre-alarm", false);
    expectLed(container, "monitor-1-normal", false);
    expectLed(container, "lcu-monitor-integral-1-primary", true);
    expectLed(container, "lcu-monitor-integral-1-normal", false);
    // The faulted chain lights its fault indications (red), the healthy one does not.
    expectLed(container, "hpa-1", true);
    expect(led(container, "hpa-1").getAttribute("class")).toContain("cabinetLedAlarm");
    expectLed(container, "status-tx1-fault", true);
    expectLed(container, "status-tx2-fault", false);
    expectLed(container, "lpa-1", true);
    expect(led(container, "lpa-1").getAttribute("class")).toContain("cabinetLedAlarm");
  });

  it("secondary-classified alarm lights SECONDARY only, never PRIMARY at the same time", () => {
    const { container } = renderCabinet();
    injectFaults([{ id: "fault-freq", kind: "tx-frequency-error", transmitter: "tx1", ppm: 500 }]);

    const primary = led(container, "monitor-1-primary-alarm").getAttribute("data-on");
    const secondary = led(container, "monitor-1-secondary-alarm").getAttribute("data-on");
    const pre = led(container, "monitor-1-pre-alarm").getAttribute("data-on");
    // Exactly one of the three alarm classes may be lit.
    expect([primary, secondary, pre].filter((value) => value === "true")).toHaveLength(1);
    expect(secondary).toBe("true");
    expectLed(container, "monitor-1-normal", false);
  });

  it("AC failure: BCPS/facility indications light (AC FAIL, ON BATTERY, maintenance alert)", () => {
    const { container } = renderCabinet();
    injectFaults([{ id: "fault-ac", kind: "ac-power", failed: true }]);

    expectLed(container, "facilities-ac-fail", true);
    expectLed(container, "lcu-system-on-battery", true);
    expectLed(container, "lcu-system-maintenance-alert", true);
    expectLed(container, "rms-on-battery", true);
    // The station is on battery, not dead: power indications stay on.
    expectLed(container, "lcu-system-lcu-power-on", true);
    expectLed(container, "monitor-1-power", true);
  });
});
