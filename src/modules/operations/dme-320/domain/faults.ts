import type {
  Dme320Fault,
  Dme320FaultKind,
  Dme320SimulationState,
  Dme320TransponderId,
} from "./types";

export interface Dme320FaultDefinition {
  component: string;
  symptoms: readonly string[];
  calibrationSteps: readonly number[];
}

export const DME320_FAULT_CATALOG: Record<Dme320FaultKind, Dme320FaultDefinition> = {
  "hpa-low-output": {
    component: "HPA",
    symptoms: ["Peak power low", "Reply efficiency low", "ERP alarm"],
    calibrationSteps: [1, 2, 4, 9],
  },
  "txu-failure": {
    component: "TXU",
    symptoms: ["No RF output", "Pulse parameters alarm", "IDENT alarm"],
    calibrationSteps: [1, 2, 3, 4, 9],
  },
  "rxu-sensitivity": {
    component: "RXU",
    symptoms: ["Receiver sensitivity degraded", "Reply efficiency alarm", "Time delay alarm"],
    calibrationSteps: [5, 6, 10],
  },
  "tcu-failure": {
    component: "TCU",
    symptoms: ["No reply", "All executive parameters alarm", "No transponder status"],
    calibrationSteps: [1, 2, 3, 4, 5, 6, 9, 10],
  },
  "dcdc-failure": {
    component: "DC/DC",
    symptoms: ["Transponder rack unpowered", "DC rail alarms"],
    calibrationSteps: [1, 2, 3, 4, 5, 6, 9, 10],
  },
  "fan-failure": {
    component: "FAN",
    symptoms: ["Fan alarm", "TXU temperature rises", "Thermal shutdown possible"],
    calibrationSteps: [],
  },
  "rfg-failure": {
    component: "RFG",
    symptoms: ["No test interrogation", "Monitor pulse and system parameter alarms"],
    calibrationSteps: [5, 6, 9, 10],
  },
  "monitor-failure": {
    component: "MON",
    symptoms: ["Monitor values unavailable", "Self-test failure", "Failsafe alarm vote"],
    calibrationSteps: [5, 6, 7, 8, 9, 10],
  },
  "antenna-vswr": {
    component: "Antenna / feeder",
    symptoms: ["VSWR alarm", "ERP alarm"],
    calibrationSteps: [7, 8],
  },
  "rf-detector-failure": {
    component: "RF Detector",
    symptoms: ["Incorrect ERP reading", "False ERP alarm"],
    calibrationSteps: [7],
  },
  "vswr-monitor-failure": {
    component: "VSWR Monitor",
    symptoms: ["Incorrect VSWR reading", "False antenna alarm"],
    calibrationSteps: [8],
  },
  "coax-relay-failure": {
    component: "Coaxial Relay",
    symptoms: ["Changeover does not move RF path", "Indicated and actual route differ"],
    calibrationSteps: [],
  },
  "dummy-load-failure": {
    component: "Dummy Load",
    symptoms: ["Standby reverse-power protection", "HPA fault on load"],
    calibrationSteps: [],
  },
  "ac-mains-failure": {
    component: "AC mains / AC-DC",
    symptoms: ["AC fail", "Operation on battery"],
    calibrationSteps: [],
  },
  "battery-low": {
    component: "Backup Battery",
    symptoms: ["Battery voltage warning/alarm", "Cutoff possible"],
    calibrationSteps: [],
  },
  "battery-overtemperature": {
    component: "Backup Battery",
    symptoms: ["Battery temperature warning/alarm"],
    calibrationSteps: [],
  },
  "rcu-link-failure": {
    component: "RCU data link",
    symptoms: ["Remote communication fault"],
    calibrationSteps: [],
  },
  "lmi-link-failure": {
    component: "LMI / IFB data link",
    symptoms: ["LMI communication fault"],
    calibrationSteps: [],
  },
  "csp-link-failure": {
    component: "CSP / SCU data link",
    symptoms: ["CSP communication fault"],
    calibrationSteps: [],
  },
  "emu-smoke": {
    component: "EMU smoke input",
    symptoms: ["Environmental smoke alarm"],
    calibrationSteps: [],
  },
  "emu-intrusion": {
    component: "EMU intrusion input",
    symptoms: ["Environmental intrusion alarm"],
    calibrationSteps: [],
  },
};

export function activeDme320Faults(
  state: Dme320SimulationState,
  kind?: Dme320FaultKind,
): Dme320Fault[] {
  return state.faults.filter((fault) => fault.active && (!kind || fault.kind === kind));
}

export function dme320FaultBlocksCalibrationStep(
  state: Dme320SimulationState,
  transponderId: Dme320TransponderId,
  step: number,
): Dme320Fault | null {
  return (
    state.faults.find((fault) => {
      if (!fault.active || !DME320_FAULT_CATALOG[fault.kind].calibrationSteps.includes(step)) {
        return false;
      }
      return (
        fault.target === transponderId ||
        fault.target === "antenna" ||
        fault.target === "system" ||
        fault.target === "mon1" ||
        fault.target === "mon2"
      );
    }) ?? null
  );
}
