import type { Dvor1150aConfig, Dvor1150aSnapshot, DvorTransmitterId } from "./config-types";
import type { VorFieldOverride, VorPmdtData } from "../vor-types";

export interface DvorLcuState {
  lampTest: boolean;
  volume: number;
  silencedAlarms: string[];
  relayRoutes: Record<DvorTransmitterId, "antenna" | "load">;
  interlockedOff: boolean;
  alarmElapsed: Record<string, number>;
}

export const initialDvorLcuState = (): DvorLcuState => ({
  lampTest: false, volume: 45, silencedAlarms: [], relayRoutes: { tx1: "antenna", tx2: "load" }, interlockedOff: false, alarmElapsed: {},
});

export interface DvorHardwareSource {
  config: Dvor1150aConfig;
  derived: Dvor1150aSnapshot;
  data: VorPmdtData;
  overrides: VorFieldOverride[];
  monitorElapsed: number;
  lcu: DvorLcuState;
}

export function hardwareReading<T>(state: DvorHardwareSource, path: string, fallback: T): T {
  const override = state.overrides.find(item => item.fieldId === path);
  return override && typeof override.value === typeof fallback ? override.value as T : fallback;
}

export function projectDvorHardware(state: DvorHardwareSource) {
  const { data, config } = state;
  const read = <T>(path: string, fallback: T) => hardwareReading(state, path, fallback);
  const voltage = (name: string) => {
    const index = data.rmsVoltageData.findIndex(row => row.parameter === name);
    const row = data.rmsVoltageData[index];
    const value = row ? read(`rmsVoltageData.${index}.volts`, row.volts) : NaN;
    return { value, ok: Boolean(row && Number.isFinite(value) && value >= row.low && value <= row.high) };
  };
  const logicPower = ["+3.3 VDC", "+5 VDC", "+12 VDC Digital", "-12 VDC Digital"].every(name => voltage(name).ok);
  const lcuPowerIndex = data.systemPowerStatus.findIndex(row => row.name === "LCU");
  const lcuPower = logicPower && (lcuPowerIndex < 0
    || read(`systemPowerStatus.${lcuPowerIndex}.tx1`, data.systemPowerStatus[lcuPowerIndex].tx1) === "green");
  const ac = voltage("AC Input").value > 0 && !read("rmsStatus.acFailure", data.rmsStatus.acFailure);
  const supplies = ([1, 2] as const).map(n => {
    const installed = n === 1 || config.station.transmitterConfig === "Dual Transmitters";
    const dc = installed && [1, 2].some(p => voltage(`Tx ${n} 48 V PS ${p}`).ok);
    const battery = voltage(`Battery ${n}`);
    const currentIndex = data.rmsCurrentData.findIndex(row => row.parameter === `Battery ${n}`);
    const current = currentIndex < 0 ? NaN : read(`rmsCurrentData.${currentIndex}.amps`, data.rmsCurrentData[currentIndex].amps);
    const batteryFault = installed && (!battery.ok || read(`systemPowerStatus.0.tx${n}`, data.systemPowerStatus[0]?.[`tx${n}`] ?? "gray") === "red");
    const onBattery = dc && (!ac || read("rmsStatus.onBattery", data.rmsStatus.onBattery));
    const chargerIndex = data.digitalOutputs.findIndex(row => row.name === "Battery Charger");
    const chargerKey = n === 1 ? "status" : "altStatus";
    const chargerStatus = read(`digitalOutputs.${chargerIndex}.${chargerKey}`, data.digitalOutputs[chargerIndex]?.[chargerKey] ?? "Off");
    const charging = dc && ac && !onBattery && !batteryFault && Number.isFinite(current)
      && current >= 0 && (current > 0 || chargerStatus !== "Off");
    const powered = installed && (ac || battery.value > 0);
    return { installed, powered, dc, ac: ac && installed, batteryFault, onBattery,
      fastCharge: charging && current > 1.5, trickleCharge: charging && current <= 1.5,
      cpu: powered };
  });
  const detectors = (["mon1", "mon2"] as const).flatMap(id => {
    const monitor = state.derived.monitors[id];
    return !logicPower || !monitor.enabled ? [] : Object.entries(monitor.parameters).flatMap(([parameter, result]) => {
      const route = config.monitor.routing[parameter as keyof typeof config.monitor.routing];
      if (!result.executiveAlarm || (!route.primary && !route.secondary)) return [];
      const delay = parameter !== "identStatus" ? 0 : result.value === "No Ident" ? config.monitor.timers.noIdent
        : result.value === "Continuous Ident" ? config.monitor.timers.continuousIdent : 0;
      return [{ id, key: `${id}:${parameter}`, primary: route.primary, secondary: route.secondary,
        qualified: (state.lcu.alarmElapsed[`${id}:${parameter}`] ?? 0) + 1e-9 >= config.monitor.timers.shutdown + delay }];
    });
  });
  const monitors = (["mon1", "mon2"] as const).map(id => {
    const monitor = state.derived.monitors[id];
    return { enabled: monitor.enabled && logicPower, primary: logicPower && monitor.enabled && monitor.primaryAlarm,
      secondary: logicPower && monitor.enabled && monitor.secondaryAlarm,
      preAlarm: logicPower && monitor.enabled && Object.entries(monitor.parameters).some(([parameter, result]) =>
        config.monitor.routing[parameter as keyof typeof config.monitor.routing].primary && result.status === "warning"),
      qualifiedPrimary: detectors.some(detector => detector.id === id && detector.primary && detector.qualified),
      qualifiedSecondary: detectors.some(detector => detector.id === id && detector.secondary && detector.qualified) };
  });
  const alarms = [
    ...(read("rmsStatus.maintenanceAlert", data.rmsStatus.maintenanceAlert) ? ["maintenance"] : []),
    ...(read("rmsStatus.rcsuCommunicationError", data.rmsStatus.rcsuCommunicationError) ? ["remote-control"] : []),
    ...(state.lcu.interlockedOff ? ["interlocked-off"] : []),
    ...supplies.flatMap((s, i) => [ ...(s.batteryFault ? [`battery-${i}`] : []), ...(s.onBattery ? [`on-battery-${i}`] : []) ]),
    ...detectors.filter(detector => detector.qualified).map(detector => detector.key),
  ];
  return { logicPower, lcuPower, supplies, monitors, detectors, alarms,
    audible: lcuPower && alarms.some(alarm => !state.lcu.silencedAlarms.includes(alarm)),
    remoteFault: alarms.includes("remote-control"), maintenance: alarms.includes("maintenance") };
}

export function advanceDvorLcuTime(state: DvorHardwareSource, seconds: number): DvorLcuState {
  if (!Number.isFinite(seconds) || seconds <= 0) return state.lcu;
  const detectors = projectDvorHardware(state).detectors;
  if (!detectors.length && !Object.keys(state.lcu.alarmElapsed).length) return state.lcu;
  return { ...state.lcu, alarmElapsed: Object.fromEntries(detectors.map(detector =>
    [detector.key, (state.lcu.alarmElapsed[detector.key] ?? 0) + seconds])) };
}

export function dvorLcuScreens(state: DvorHardwareSource) {
  const read = <T>(path: string, value: T) => hardwareReading(state, path, value);
  const format = (value: number | string, digits = 1) => typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "—";
  const table = (kind: "rmsVoltageData" | "rmsCurrentData" | "rmsTemperatureData", name: string) => {
    const index = state.data[kind].findIndex(row => row.parameter === name);
    const row = state.data[kind][index];
    if (!row) return "—";
    const key = "volts" in row ? "volts" : "amps" in row ? "amps" : "value";
    const value = "volts" in row ? row.volts : "amps" in row ? row.amps : row.value;
    return format(read(`${kind}.${index}.${key}`, value), kind === "rmsTemperatureData" ? 0 : kind === "rmsVoltageData" && name === "AC Input" ? 2 : 1);
  };
  return [
    ...(["mon1", "mon2"] as const).map((id, index) => ({ title: `Integral Monitor ${index + 1}`, rows:
      ([ ["Az Angle", "azimuth"], ["30 Hz Mod", "hz30Modulation"], ["9960Hz Mod", "hz9960Modulation"], ["Deviation", "deviation"], ["RF Level", "rfLevel"] ] as const)
        .map(([label, parameter]) => `${label} ${state.derived.monitors[id].enabled ? format(state.derived.monitors[id].parameters[parameter].value, parameter === "azimuth" ? 2 : 1) : "—"}`) })),
    { title: "RMS/Facilities Power", rows: [
      `AC Power ${table("rmsVoltageData", "AC Input")}`, `AC Current ${table("rmsCurrentData", "AC Input")}`,
      ...([1, 2] as const).flatMap(n => [`TX ${n} 48V ${table("rmsVoltageData", `Tx ${n} 48 V PS 1`)}`, `TX ${n} Current ${table("rmsCurrentData", `Tx ${n} 48 V PS 1`)}`]),
    ] },
    { title: "VOR Temps", rows: [["Interior", "Cabinet Interface"], ["Exterior", "External Sensor"], ["RF Monitor", "RF Monitor"], ["BCPS 1", "BCPS #1"], ["BCPS 2", "BCPS #2"]].map(([label, name]) => `${label} ${table("rmsTemperatureData", name)}`) },
    { title: "VOR PA Temps", rows: [1, 2].flatMap(n => [[`Carrier Amp ${n}`, `Carrier PA #${n}`], [`Side Band ${n} 1/2`, `Sideband 1/2 PA #${n}`], [`Side Band ${n} 3/4`, `Sideband 3/4 PA #${n}`]].map(([label, name]) => `${label} ${table("rmsTemperatureData", name)}`)) },
  ];
}
