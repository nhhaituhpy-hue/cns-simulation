import { describe, expect, it } from "vitest";
import { createVorPmdtStore } from "@/stores/vor-pmdt-store";
import { advanceDvorMonitorTests, initialDvorMonitorTests } from "@/lib/dvor1150a/monitor-tests";
import { createDefaultDvor1150aConfig } from "@/lib/dvor1150a";

const start = "2026-11-21T10:00:00.000Z";
function station() {
  const store = createVorPmdtStore({ now: () => new Date(start) });
  const s = () => store.getState();
  s().login("SEC3", "THREE");
  s().setConfigValue("simulation.local", true);
  s().setConfigValue("simulation.integralMonitorBypass", true);
  return { store, s };
}
function rowStatuses(store: ReturnType<typeof createVorPmdtStore>, id: "mon1" | "mon2") {
  return store.getState().monitorTests.completed[id]?.rows.flatMap(row => row.cells.map(cell => cell.status));
}

describe("G11 timed native monitor tests", () => {
  it("starts empty, snapshots TG at 120s and completes initial integrity at 180s, then every 120s", () => {
    const { store, s } = station();
    expect(s().monitorTests.completed.mon1).toBeNull();
    expect(s().monitorTests.generator.mon1).toBeNull();
    s().advanceMonitorTime(119);
    expect(s().monitorTests.generator.mon1).toBeNull();
    expect(s().monitorTests.inProcess.mon1.rows.flatMap(row => row.cells).filter(cell => cell.value !== null)).toHaveLength(9);
    s().advanceMonitorTime(1);
    expect(s().monitorTests.generator.mon1?.timestamp).toBe("2026-11-21T10:02:00.000Z");
    expect(s().monitorTests.completed.mon1).toBeNull();
    s().advanceMonitorTime(59);
    expect(s().monitorTests.completed.mon1).toBeNull();
    s().advanceMonitorTime(1);
    expect(s().monitorTests.completed.mon1?.timestamp).toBe("2026-11-21T10:03:00.000Z");
    expect(rowStatuses(store, "mon1")).toEqual(Array(20).fill("green"));
    const first = s().monitorTests.completed.mon1;
    s().advanceMonitorTime(119);
    expect(s().monitorTests.completed.mon1).toEqual(first);
    s().advanceMonitorTime(1);
    expect(s().monitorTests.completed.mon1?.timestamp).toBe("2026-11-21T10:05:00.000Z");
  });

  it.each(["mon1", "mon2"] as const)("retains %s results/limits through draft and Apply, then takes new samples independently", id => {
    const { store, s } = station();
    s().advanceMonitorTime(180);
    const before = s().monitorTests.completed[id];
    const other = id === "mon1" ? "mon2" : "mon1";
    const onAir = s().derived.monitors;
    s().setConfigValue(`monitor.testGeneratorCalibration.${id}.hz30ModulationScale`, 80);
    expect(s().monitorTests.completed[id]).toEqual(before);
    s().applyConfigChanges();
    expect(s().monitorTests.completed[id]).toEqual(before);
    expect(s().derived.monitors).toEqual(onAir);
    s().advanceMonitorTime(120);
    expect(rowStatuses(store, id)).toContain("red");
    expect(rowStatuses(store, other)).toEqual(Array(20).fill("green"));
    expect(before?.rows.flatMap(row => row.cells.map(cell => cell.status))).toEqual(Array(20).fill("green"));
    const retained = s().monitorTests.completed[id];
    s().setConfigValue("monitor.alarmLimits.hz30Modulation.alarmLow", 22);
    s().applyConfigChanges();
    expect(s().monitorTests.completed[id]).toEqual(retained);
    expect(s().monitorTests.completed[id]?.rows[1].lowLimit).toBe(23);
  });

  it("excludes after three consecutive missed-alarm cycles, updates native alerts/voting and recovers after one good cycle", () => {
    const { s } = station();
    s().setConfigValue("monitor.testGeneratorCalibration.mon1.hz30ModulationScale", 80);
    s().applyConfigChanges();
    s().advanceMonitorTime(180 + 120);
    expect(s().monitorTests.failures.mon1.hz30Modulation).toBe(2);
    expect(s().monitorTests.excluded).toEqual([]);
    s().advanceMonitorTime(120);
    expect(s().monitorTests.excluded).toEqual(["mon1"]);
    expect(s().data.rmsMonitorTransmitterStatus.enabledMonitors).toEqual({ monitor1: false, monitor2: true });
    expect(s().data.monitorAgenAlerts.find(row => row.label === "Integrity Test Failed")).toMatchObject({ mon1: true, mon2: false });
    s().setConfigValue("monitor.votingLogic", "OR");
    s().setConfigValue("monitor.calibration.mon1.hz30ModulationScale", 50);
    s().applyConfigChanges();
    expect(s().derived.monitors.mon1.primaryAlarm).toBe(true);
    expect(s().derived.voting.systemHealthy).toBe(true);
    s().setConfigValue("monitor.testGeneratorCalibration.mon1.hz30ModulationScale", 100);
    s().applyConfigChanges();
    s().advanceMonitorTime(120);
    expect(s().monitorTests.excluded).toEqual([]);
    expect(s().derived.voting.systemHealthy).toBe(false);
    expect(s().data.monitorAgenAlerts.find(row => row.label === "Integrity Test Failed")?.mon1).toBe(false);
  });

  it("does not accumulate nonconsecutive per-parameter failures or disable for false-alarm/yellow alone", () => {
    const { store, s } = station();
    for (const scale of [80, 100, 80]) {
      s().setConfigValue("monitor.testGeneratorCalibration.mon1.hz30ModulationScale", scale);
      s().applyConfigChanges();
      s().advanceMonitorTime(scale === 80 && s().monitorTests.completed.mon1 === null ? 180 : 120);
    }
    expect(s().monitorTests.failures.mon1.hz30Modulation).toBe(1);
    s().setConfigValue("monitor.testGeneratorCalibration.mon1.hz30ModulationScale", 102);
    s().applyConfigChanges();
    s().advanceMonitorTime(360);
    expect(rowStatuses(store, "mon1")).toContain("yellow");
    expect(rowStatuses(store, "mon1")).not.toContain("red");
    expect(s().monitorTests.excluded).toEqual([]);
  });

  it("retains last TG sample until a fresh cycle and never feeds operator setup into automatic integrity targets", () => {
    const { s } = station();
    s().advanceMonitorTime(180);
    const first = s().monitorTests.generator.mon1;
    const completed = s().monitorTests.completed.mon1;
    s().setConfigValue("monitor.testGenerator.hz30Modulation", 35);
    s().applyConfigChanges();
    expect(s().monitorTests.generator.mon1).toEqual(first);
    s().advanceMonitorTime(59);
    expect(s().monitorTests.generator.mon1).toEqual(first);
    s().advanceMonitorTime(1);
    expect(s().monitorTests.generator.mon1?.values.hz30Modulation).toBe(35);
    expect(s().monitorTests.completed.mon1).toEqual(completed);
    s().advanceMonitorTime(60);
    expect(s().monitorTests.completed.mon1?.rows).toEqual(completed?.rows);
  });

  it("times out nonresponding installed monitors at 600s, keeps old data and recovers; absent MON2 never times out", () => {
    const { s } = station();
    s().advanceMonitorTime(180);
    const previous = s().monitorTests.completed.mon1;
    expect(s().setMonitorTestResponse("mon1", false)).toBe(true);
    s().advanceMonitorTime(599);
    expect(s().monitorTests.excluded).toEqual([]);
    s().advanceMonitorTime(1);
    expect(s().monitorTests.excluded).toEqual(["mon1"]);
    expect(s().monitorTests.completed.mon1).toEqual(previous);
    expect(s().data.monitorAgenAlerts.find(row => row.label === "RMS Comm Link Failed")?.mon1).toBe(true);
    s().setMonitorTestResponse("mon1", true);
    s().advanceMonitorTime(240);
    expect(s().monitorTests.excluded).toEqual([]);
    s().setConfigValue("station.monitorConfig", "Single Monitor");
    s().applyConfigChanges();
    s().setMonitorTestResponse("mon2", false);
    s().advanceMonitorTime(720);
    expect(s().monitorTests.excluded).toEqual([]);
  });

  it("stops integrity when disabled but continues TG; re-enabling starts a fresh initial check", () => {
    const { s } = station();
    s().setConfigValue("monitor.integrity.enabled", false);
    s().applyConfigChanges();
    s().advanceMonitorTime(720);
    expect(s().monitorTests.completed.mon1).toBeNull();
    expect(s().monitorTests.generator.mon1).not.toBeNull();
    expect(s().monitorTests.excluded).toEqual([]);
    s().setConfigValue("monitor.integrity.enabled", true);
    s().applyConfigChanges();
    s().advanceMonitorTime(179);
    expect(s().monitorTests.completed.mon1).toBeNull();
    s().advanceMonitorTime(1);
    expect(s().monitorTests.completed.mon1).not.toBeNull();
  });

  it("keeps clocks running across PMDT disconnect/logoff/screens; delayed ticks match small steps; reset clears RAM", () => {
    const a = station();
    const b = station();
    a.s().logout();
    a.s().setConfigValue("simulation.connected", false);
    a.s().openScreen("home", ["Home"], "Home");
    a.s().advanceMonitorTime(420);
    for (let i = 0; i < 420; i++) b.s().advanceMonitorTime(1);
    expect(a.s().monitorTests).toEqual(b.s().monitorTests);
    a.s().reset();
    expect(a.s().monitorTests.completed.mon1).toBeNull();
    expect(a.s().monitorTests.generator.mon1).toBeNull();
    expect(JSON.stringify(a.s().config)).not.toContain("monitorTests");
  });

  it("ignores invalid elapsed input and excludes both failed monitors fail-safe rather than granting empty-vote health", () => {
    const config = createDefaultDvor1150aConfig();
    const tests = initialDvorMonitorTests(config, start);
    for (const seconds of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) expect(advanceDvorMonitorTests(tests, config, seconds)).toBe(tests);
    const { s } = station();
    s().setMonitorTestResponse("mon1", false);
    s().setMonitorTestResponse("mon2", false);
    s().advanceMonitorTime(600);
    expect(s().monitorTests.excluded).toHaveLength(2);
    expect(s().derived.voting.systemHealthy).toBe(false);
    s().setConfigValue("simulation.integralMonitorBypass", false);
    s().advanceMonitorTime(5);
    expect(s().protectionState.phase).toBe("cold-transfer");
  });

  it("samples correctly with the native ticker's fractional 100ms intervals", () => {
    const config = createDefaultDvor1150aConfig();
    let tests = initialDvorMonitorTests(config, start);
    for (let tick = 0; tick < 1801; tick++) tests = advanceDvorMonitorTests(tests, config, 0.1);
    expect(tests.completed.mon1?.rows.flatMap(row => row.cells).filter(cell => cell.status === "green")).toHaveLength(20);
    expect(tests.generator.mon1).not.toBeNull();
    const { s } = station();
    expect(s().setMonitorTestResponse("invalid" as "mon1", false)).toBe(false);
  });

  it("retains the legacy training failure-count configuration without adding a manufacturer PMDT control", () => {
    const { s } = station();
    s().setConfigValue("monitor.integrity.maxConsecutiveFailures", 2);
    s().setConfigValue("monitor.testGeneratorCalibration.mon1.hz30ModulationScale", 80);
    s().applyConfigChanges();
    s().advanceMonitorTime(180);
    expect(s().monitorTests.excluded).toEqual([]);
    s().advanceMonitorTime(120);
    expect(s().monitorTests.excluded).toEqual(["mon1"]);
    s().reset();
    expect(s().config.monitor.integrity.maxConsecutiveFailures).toBe(3);
    expect(s().monitorTests.excluded).toEqual([]);
  });

  it("never retroactively recalibrates cells already acquired earlier in the current cycle", () => {
    const { store, s } = station();
    s().advanceMonitorTime(240);
    const sampled = structuredClone(s().monitorTests.inProcess.mon1.rows[1]);
    s().setConfigValue("monitor.testGeneratorCalibration.mon1.hz30ModulationScale", 80);
    s().applyConfigChanges();
    s().advanceMonitorTime(60);
    expect(s().monitorTests.completed.mon1?.rows[1]).toEqual(sampled);
    expect(rowStatuses(store, "mon1")).not.toContain("red");
    s().advanceMonitorTime(120);
    expect(rowStatuses(store, "mon1")).toContain("red");
  });
});
