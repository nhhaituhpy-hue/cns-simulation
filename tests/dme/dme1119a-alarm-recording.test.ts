import { describe, expect, it } from "vitest";
import { DME1119A_BUILT_IN_SCENARIOS } from "@/lib/dme1119a/scenario";
import { createDmePmdtStore } from "@/stores/dme-pmdt-store";

/**
 * Regression coverage for the Stage 5 QA failures found on labs.cnsvn.com
 * (22/11/2026):
 *
 * 1. Setting Tx Power Alarm Low to 1200 and Applying caused a real alarm
 *    and an automatic monitor shutdown, yet RMS Logs > Alarms, Maintenance
 *    Alerts and Monitor Fault History all stayed empty.  The commit only
 *    published the post-shutdown state, whose rows read 0/"gray", so the
 *    runtime log engine diffed normal -> gray and recorded nothing.
 * 2. Apply Scenario silently did nothing for a loaded preset while the
 *    station was in Remote mode.
 */
describe("DME 1119A alarm recording for protection shutdowns (Stage 5 QA)", () => {
  it("records the alarm, the shutdown and a fault snapshot when an Apply ends in automatic shutdown, then records the recovery", () => {
    const store = createDmePmdtStore();
    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    expect(store.getState().setLocalMode(true)).toBe(true);
    expect(store.getState().data.alarmLogs).toEqual([]);
    expect(store.getState().data.maintenanceLogs).toEqual([]);
    expect(store.getState().faultHistory).toEqual([]);

    // The production repro: raise the Tx Power alarm-low limit above the
    // measured output and Apply.  The standby path alarms too, so the
    // automatic protection response shuts both transmitters off.
    store.getState().setParameterValue("alarmLimits.2.alarmLow", 1200);
    expect(store.getState().applyConfigChanges()).toBe(true);
    expect(store.getState().data.monitorTransmitterStatus.transmitterOn).toEqual({ tx1: false, tx2: false });

    const state = store.getState();
    expect(state.data.alarmLogs).toContainEqual(expect.objectContaining({
      type: "Monitor 1",
      alarm: "Integral Tx Power",
      state: "Alarm",
    }));
    expect(state.data.alarmLogs[0].timeTag).toBe(state.data.timestamp);
    // The alarm must not be "cleared" by the gray rows of the shutdown.
    expect(state.data.alarmLogs.some((entry) => entry.alarm === "Integral Tx Power" && entry.state === "Normal")).toBe(false);

    expect(state.data.maintenanceLogs).toContainEqual(expect.objectContaining({
      type: "General",
      alert: "Automatic Monitor Shutdown",
      state: "Alert",
    }));

    const snapshot = state.faultHistory.find(
      (fault) => fault.monitor === 1 && fault.path === "integral" && fault.parameters.includes("Tx Power"),
    );
    expect(snapshot).toBeDefined();
    const alarmRow = snapshot!.alarmRows.find((row) => row.label === "Tx Power");
    const preRow = snapshot!.preAlarmRows.find((row) => row.label === "Tx Power");
    expect(alarmRow?.mon1Status).toBe("alarm");
    expect(alarmRow?.mon1Value).toBe("1011");
    expect(preRow?.mon1Status).toBe("normal");

    // Recovery, mirroring the QA session: restore the limit, Apply, then
    // put TX1 back on the antenna.  The latched alarm must close with a
    // Normal entry once the row measures live again.
    store.getState().setParameterValue("alarmLimits.2.alarmLow", 500);
    expect(store.getState().applyConfigChanges()).toBe(true);
    expect(store.getState().setTransmitterMode("tx1", "antenna")).toBe(true);
    expect(store.getState().data.integralData.find((row) => row.label === "Tx Power")?.mon1Status).toBe("normal");
    expect(store.getState().data.alarmLogs).toContainEqual(expect.objectContaining({
      alarm: "Integral Tx Power",
      state: "Normal",
    }));
    // A recovery is not a new fault snapshot.
    expect(store.getState().faultHistory.filter(
      (fault) => fault.monitor === 1 && fault.path === "integral" && fault.parameters.includes("Tx Power"),
    )).toHaveLength(1);
  });
});

describe("DME 1119A Apply Scenario (Stage 5 QA)", () => {
  it("applies a loaded preset while the station is in Remote mode and reflects it in the monitor values", () => {
    const store = createDmePmdtStore();
    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    expect(store.getState().data.local).toBe(false);
    store.getState().setScenarioAuthoringEnabled(true);

    const preset = DME1119A_BUILT_IN_SCENARIOS.find((item) => item.id === "tx1-low-output");
    expect(preset).toBeDefined();
    store.getState().replaceScenarioDraft(preset!.create());

    const baselinePower = Number(
      store.getState().data.integralData.find((row) => row.label === "Tx Power")?.mon1Value,
    );
    expect(store.getState().applyScenario()).toBe(true);
    expect(store.getState().scenario.active).toBe(true);
    expect(store.getState().scenario.definition?.id).toBe("tx1-low-output");

    const appliedRow = store.getState().data.integralData.find((row) => row.label === "Tx Power");
    expect(Number(appliedRow?.mon1Value)).toBeLessThan(baselinePower);
    expect(appliedRow?.mon1Status).toBe("alarm");
  });

  it("names the reason in lastCommand when Apply Scenario is refused", () => {
    const store = createDmePmdtStore();
    store.getState().setScenarioAuthoringEnabled(true);
    // Login dialog still open / not authenticated.
    expect(store.getState().applyScenario()).toBe(false);
    expect(store.getState().scenario.active).toBe(false);
    expect(store.getState().lastCommand).toContain("Scenario Apply refused");

    const authoringOff = createDmePmdtStore();
    expect(authoringOff.getState().login("SEC3", "THREE")).toBe(true);
    expect(authoringOff.getState().applyScenario()).toBe(false);
    expect(authoringOff.getState().lastCommand).toContain("authoring is not enabled");
  });
});
