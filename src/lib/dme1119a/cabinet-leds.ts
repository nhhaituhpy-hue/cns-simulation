import type {
  DmeIndicatorColor,
  DmePmdtData,
  DmeTransmitterId,
} from "@/lib/dme-types";
import { dmeRowSeverity } from "./runtime-logs";

/**
 * Cabinet / faceplate LED state for the DME 1119A (Stage 3 of the fidelity
 * audit: G06). The cabinet artwork used to be fixed: every LED was a
 * hard-coded literal, so injected faults were invisible on the cabinet view
 * even though the HD-KTDA daily check is precisely an LED inspection.
 *
 * Everything here is a pure derivation from the engine's derived PMDT data —
 * the same monitor rows, classification table, transmitter/PA status and
 * power status the PMDT screens render — so the cabinet can never disagree
 * with the PMDT. Worst-state-wins per monitor: PRIMARY ALARM (a
 * primary-classified parameter in alarm) beats SECONDARY ALARM (any other
 * parameter in alarm), which beats PRE ALARM (any parameter in warning),
 * which beats NORMAL. The three alarm indications are therefore never lit
 * at the same time.
 */
export type DmeCabinetMonitorState =
  | "off"
  | "normal"
  | "pre-alarm"
  | "primary-alarm"
  | "secondary-alarm";

export type DmeCabinetLamp = "green" | "amber" | "red" | "off";

export interface DmeCabinetTxLedState {
  /** This transmitter is the one radiated on the antenna. */
  onAir: boolean;
  /** Transmitter is on (antenna or load). */
  on: boolean;
  /** LPA/HPA chain fault: injected PA/power fault or a red PA/TX alert. */
  paFault: boolean;
  /** RTC communication fault (RTC status, TX status or injected fault). */
  rtcCommFault: boolean;
  /** RTC overload indication (HD-KTDA daily check item). */
  rtcOverload: boolean;
  /** CPU/power indication for the RTC card is healthy. */
  rtcCpuOk: boolean;
  /** Any fault attributable to this transmitter chain. */
  chainFault: boolean;
  maintenanceAlert: boolean;
}

export interface DmeCabinetLedState {
  lcu: {
    powerOn: boolean;
    localControl: boolean;
    maintenanceAlert: boolean;
    remoteControlFault: boolean;
    batteryFault: boolean;
    onBattery: boolean;
    interlockedOff: boolean;
    /** Transmitter select buttons, coloured by the sidebar indicator model. */
    transmitters: Record<1 | 2, Record<"main" | "antenna" | "load" | "off", DmeCabinetLamp>>;
    /** Monitor status per path, exactly as the LCU MONITOR group shows it. */
    monitors: Record<"integral" | "standby", Record<1 | 2, DmeCabinetMonitorState>>;
    bypass: Record<"integral" | "standby", boolean>;
  };
  /** Physical monitor cards 1A11 / 1A15: worst state across both paths. */
  monitorCards: Record<1 | 2, { state: DmeCabinetMonitorState; power: boolean }>;
  transmitters: Record<1 | 2, DmeCabinetTxLedState>;
  rms: {
    power: boolean;
    alarm: boolean;
    maintenanceAlert: boolean;
    onBattery: boolean;
    localControl: boolean;
  };
  facilities: {
    power: boolean;
    interlocked: boolean;
    remoteControlFault: boolean;
    acFailure: boolean;
  };
}

function lampFromColor(color: DmeIndicatorColor): DmeCabinetLamp {
  if (color === "green") return "green";
  if (color === "yellow") return "amber";
  if (color === "red") return "red";
  return "off";
}

function monitorStateFor(
  data: DmePmdtData,
  path: "integral" | "standby",
  monitor: 1 | 2,
): DmeCabinetMonitorState {
  if (!data.connected) return "off";
  const enabled = monitor === 1
    ? data.monitorTransmitterStatus.enabledMonitors.monitor1
    : data.monitorTransmitterStatus.enabledMonitors.monitor2;
  if (!enabled) return "off";

  const rows = path === "integral" ? data.integralData : data.standbyData;
  let primaryAlarm = false;
  let anyAlarm = false;
  let anyWarning = false;
  for (const row of rows) {
    const severity = dmeRowSeverity(monitor === 1 ? row.mon1Status : row.mon2Status);
    if (severity === 2) {
      anyAlarm = true;
      const classification = data.monitorConfigGeneral.find((item) => item.parameter === row.label);
      if (classification?.primary) primaryAlarm = true;
    } else if (severity === 1) {
      anyWarning = true;
    }
  }
  if (primaryAlarm) return "primary-alarm";
  if (anyAlarm) return "secondary-alarm";
  if (anyWarning) return "pre-alarm";
  return "normal";
}

function worstMonitorState(a: DmeCabinetMonitorState, b: DmeCabinetMonitorState): DmeCabinetMonitorState {
  const rank: Record<DmeCabinetMonitorState, number> = {
    off: 0,
    normal: 1,
    "pre-alarm": 2,
    "secondary-alarm": 3,
    "primary-alarm": 4,
  };
  return rank[a] >= rank[b] ? a : b;
}

function paRowFault(data: DmePmdtData, name: string): boolean {
  const row = data.paStatus.find((item) => item.name === name);
  if (!row) return false;
  return [row.vswr, row.longPulseFault, row.powerSupply, row.outputPower, row.rmsTemperature, row.userEnabled, row.rmsRtcEnabled]
    .some((color) => color === "red");
}

function txLedState(data: DmePmdtData, tx: 1 | 2): DmeCabinetTxLedState {
  const id: DmeTransmitterId = tx === 1 ? "tx1" : "tx2";
  const faults = data.simulationFaults?.transmitters[id];
  const on = data.monitorTransmitterStatus.transmitterOn[id];
  const onAir = on && data.monitorTransmitterStatus.antennaSelect === tx;
  const paFault = Boolean(
    (faults && (faults.hpaFault || faults.powerLossDb > 0))
    || paRowFault(data, `LPA #${tx}`)
    || paRowFault(data, `HPA #${tx}`)
    || data.txAlerts.some((row) => row[id] === "red"),
  );
  const rtcCommFault = Boolean(
    data.rtcStatus.commFault[id] || data.txStatus.commFault[id] || faults?.rtcCommFault,
  );
  const chainFault = Boolean(
    paFault
    || rtcCommFault
    || (faults && faults.antennaVswr !== null),
  );
  return {
    onAir,
    on,
    paFault,
    rtcCommFault,
    rtcOverload: data.rtcStatus.overload[id],
    rtcCpuOk: data.connected && data.rtcStatus.cpuShutdown[id] === "Normal",
    chainFault,
    maintenanceAlert: data.txStatus.maintenanceAlert[id],
  };
}

export function deriveDmeCabinetLedState(data: DmePmdtData): DmeCabinetLedState {
  const integral1 = monitorStateFor(data, "integral", 1);
  const integral2 = monitorStateFor(data, "integral", 2);
  const standby1 = monitorStateFor(data, "standby", 1);
  const standby2 = monitorStateFor(data, "standby", 2);
  const anyMonitorAlarm = [integral1, integral2, standby1, standby2]
    .some((state) => state === "primary-alarm" || state === "secondary-alarm");

  const tx1 = txLedState(data, 1);
  const tx2 = txLedState(data, 2);
  const batteryRow = data.systemPowerStatus.find((row) => row.name === "Battery Fault");
  const maintenanceAlert = Boolean(
    data.rmsStatus.maintenanceAlert
    || data.rmsStatus.acFailure
    || data.txStatus.maintenanceAlert.tx1
    || data.txStatus.maintenanceAlert.tx2,
  );

  const transmitterLamps = (id: DmeTransmitterId) => ({
    main: lampFromColor(data.transmitters[id].main),
    antenna: lampFromColor(data.transmitters[id].antenna),
    load: lampFromColor(data.transmitters[id].load),
    off: lampFromColor(data.transmitters[id].off),
  });

  return {
    lcu: {
      powerOn: data.connected,
      localControl: data.local,
      maintenanceAlert,
      remoteControlFault: data.rmsStatus.rcsuCommunicationError,
      batteryFault: Boolean(
        data.bcpsCommFaults.bcps1 || data.bcpsCommFaults.bcps2 || batteryRow?.tx1 === "red" || batteryRow?.tx2 === "red",
      ),
      onBattery: data.rmsStatus.onBattery,
      interlockedOff: data.rmsStatus.interlocked,
      transmitters: { 1: transmitterLamps("tx1"), 2: transmitterLamps("tx2") },
      monitors: {
        integral: { 1: integral1, 2: integral2 },
        standby: { 1: standby1, 2: standby2 },
      },
      bypass: {
        integral: data.monitors.integral.bypass,
        standby: data.monitors.standby.bypass,
      },
    },
    monitorCards: {
      1: {
        state: worstMonitorState(integral1, standby1),
        power: data.connected && data.monitorTransmitterStatus.enabledMonitors.monitor1,
      },
      2: {
        state: worstMonitorState(integral2, standby2),
        power: data.connected && data.monitorTransmitterStatus.enabledMonitors.monitor2,
      },
    },
    transmitters: { 1: tx1, 2: tx2 },
    rms: {
      power: data.connected,
      alarm: data.alert || anyMonitorAlarm,
      maintenanceAlert,
      onBattery: data.rmsStatus.onBattery,
      localControl: data.local,
    },
    facilities: {
      power: data.connected,
      interlocked: data.rmsStatus.interlocked,
      remoteControlFault: data.rmsStatus.rcsuCommunicationError,
      acFailure: data.rmsStatus.acFailure,
    },
  };
}
