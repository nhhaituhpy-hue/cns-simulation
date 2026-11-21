import type { VorIntegralDataRow } from "@/lib/vor-types";
import type { Dvor1150aConfig, Dvor1150aSnapshot, DvorTransmitterId } from "./config-types";

export type DvorFaultSample = {
  timestamp: string;
  rows: VorIntegralDataRow[];
  sidebandFaults: Record<"mon1" | "mon2", number[] | null>;
};
export type DvorFaultEvent = {
  alarm: DvorFaultSample;
  prior: Record<"mon1" | "mon2", DvorFaultSample | null>;
  lcu: {
    logic: "AND" | "OR";
    enabled: Record<"mon1" | "mon2", boolean>;
    primaryAlarm: boolean;
    secondaryAlarm: boolean;
    bypass: boolean;
    main: DvorTransmitterId | null;
    antenna: DvorTransmitterId | null;
    on: Record<DvorTransmitterId, boolean>;
  };
};
export type DvorFaultHistory = { events: DvorFaultEvent[]; good: Record<"mon1" | "mon2", DvorFaultSample | null> };

export function initialDvorFaultHistory(): DvorFaultHistory {
  return { events: [], good: { mon1: null, mon2: null } };
}

function faultSample(config: Dvor1150aConfig, snapshot: Dvor1150aSnapshot, timestamp: string): DvorFaultSample {
  const faults = (id: "mon1" | "mon2") => snapshot.monitors[id].enabled
    ? snapshot.monitors[id].sidebandVswr.flatMap((value, index) => value > config.monitor.sidebandVswr.alarm ? [index + 1] : []) : null;
  const rows = snapshot.data.integralData.map(row => ({ ...row,
    ...(!snapshot.monitors.mon1.enabled ? { mon1Value: "—", mon1Status: "gray" as const } : {}),
    ...(!snapshot.monitors.mon2.enabled ? { mon2Value: "—", mon2Status: "gray" as const } : {}),
  }));
  return { timestamp, rows, sidebandFaults: { mon1: faults("mon1"), mon2: faults("mon2") } };
}

export function sampleDvorFaultHistory(history: DvorFaultHistory, config: Dvor1150aConfig, snapshot: Dvor1150aSnapshot, timestamp: string): DvorFaultHistory {
  if (!snapshot.voting.activeTransmitter) return history;
  const good = { ...history.good };
  const sample = faultSample(config, snapshot, timestamp);
  for (const id of ["mon1", "mon2"] as const) {
    if (snapshot.data.rmsMonitorTransmitterStatus.enabledMonitors[id === "mon1" ? "monitor1" : "monitor2"] && !snapshot.monitors[id].primaryAlarm && !snapshot.monitors[id].secondaryAlarm) {
      good[id] = sample;
    }
  }
  return { ...history, good };
}

export function appendDvorFault(history: DvorFaultHistory, config: Dvor1150aConfig, snapshot: Dvor1150aSnapshot, timestamp: string): DvorFaultHistory {
  const installed = config.station.monitorConfig === "Dual Monitors" ? ["mon1", "mon2"] as const : ["mon1"] as const;
  const enabled = snapshot.data.rmsMonitorTransmitterStatus.enabledMonitors;
  const voting = installed.filter(id => !snapshot.monitors[id].enabled || enabled[id === "mon1" ? "monitor1" : "monitor2"]);
  const voted = (severity: "primary" | "secondary") => voting.length === 0 ? severity === "primary" : Object.entries(config.monitor.routing).some(([parameter, route]) => {
    if (!route[severity] || (severity === "secondary" && route.primary)) return false;
    const votes = voting.map(id => !snapshot.monitors[id].enabled || snapshot.monitors[id].parameters[parameter as keyof typeof snapshot.monitors.mon1.parameters].executiveAlarm === true);
    return config.monitor.votingLogic === "AND" ? votes.every(Boolean) : votes.some(Boolean);
  });
  const event: DvorFaultEvent = {
    alarm: faultSample(config, snapshot, timestamp),
    prior: structuredClone(history.good),
    lcu: {
      logic: config.monitor.votingLogic,
      enabled: { mon1: enabled.monitor1, mon2: enabled.monitor2 },
      primaryAlarm: voted("primary"), secondaryAlarm: voted("secondary"),
      bypass: config.simulation.integralMonitorBypass,
      main: snapshot.mainTransmitter, antenna: snapshot.voting.activeTransmitter,
      on: { tx1: snapshot.effectiveTransmitters.tx1.onAir || snapshot.effectiveTransmitters.tx1.load,
        tx2: snapshot.effectiveTransmitters.tx2.onAir || snapshot.effectiveTransmitters.tx2.load },
    },
  };
  return { ...history, events: [event, ...history.events].slice(0, 3) };
}
