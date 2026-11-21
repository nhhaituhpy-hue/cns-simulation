import type { Dvor1150aConfig, Dvor1150aSnapshot, DvorTransmitterId } from "./config-types";
import { DVOR_MONITOR_IDS, DVOR_TRANSMITTER_IDS } from "./config-types";
import { buildDvor1150aSnapshot } from "./engine";

export interface DvorProtectionState {
  phase: "monitoring" | "cold-transfer" | "restart-wait" | "lockout";
  remaining: number;
  alarmElapsed: number;
  restartAttempts: number;
  target: DvorTransmitterId | null;
}

export function initialDvorProtectionState(): DvorProtectionState {
  return { phase: "monitoring", remaining: 0, alarmElapsed: 0, restartAttempts: 0, target: null };
}

function protectionDelay(config: Dvor1150aConfig, snapshot: Dvor1150aSnapshot): number {
  const installed = config.station.monitorConfig === "Dual Monitors" ? DVOR_MONITOR_IDS : ["mon1"] as const;
  let earliest = Number.POSITIVE_INFINITY;
  for (const [parameter, route] of Object.entries(config.monitor.routing)) {
    if (!route.primary && !(config.monitor.transfer === "on Any Alarm" && route.secondary)) continue;
    const votes = installed.map(id => {
      const monitor = snapshot.monitors[id];
      const result = monitor.parameters[parameter as keyof typeof monitor.parameters];
      const alarm = !monitor.enabled || result.executiveAlarm === true;
      const delay = parameter === "identStatus" && monitor.enabled
        ? result.value === "No Ident" ? config.monitor.timers.noIdent
          : result.value === "Continuous Ident" ? config.monitor.timers.continuousIdent : 0
        : 0;
      return { alarm, delay };
    });
    const qualified = config.monitor.votingLogic === "AND"
      ? votes.every(vote => vote.alarm) : votes.some(vote => vote.alarm);
    if (!qualified) continue;
    const delays = votes.filter(vote => vote.alarm).map(vote => vote.delay);
    earliest = Math.min(earliest, config.monitor.votingLogic === "AND" ? Math.max(...delays) : Math.min(...delays));
  }
  return earliest + config.monitor.timers.shutdown;
}

export function advanceDvorProtection(
  original: Dvor1150aConfig,
  previous: DvorProtectionState,
  seconds: number,
  mainTransmitter: DvorTransmitterId | null,
) {
  let config = original;
  let state = { ...previous };
  let snapshot = buildDvor1150aSnapshot(config, undefined, mainTransmitter ?? undefined);
  const events: string[] = [];
  const result = () => ({ config, state, snapshot, events });
  if (!Number.isFinite(seconds) || seconds <= 0) return result();
  if (config.simulation.integralMonitorBypass) {
    state = state.phase === "monitoring" ? initialDvorProtectionState()
      : { ...state, phase: "lockout", target: null, alarmElapsed: 0, remaining: Math.max(0, Math.min(20, state.remaining) - seconds) };
    return result();
  }
  let budget = seconds;
  const available = (id: DvorTransmitterId) => config.transmitters[id].enabled
    && !config.transmitters[id].faults.disabled
    && !(id === "tx2" && config.station.transmitterConfig === "Single Transmitter");
  const route = (target: DvorTransmitterId | null, restoreStandby = false) => {
    config = structuredClone(config);
    for (const id of DVOR_TRANSMITTER_IDS) {
      config.transmitters[id].onAir = id === target;
      config.transmitters[id].load = restoreStandby && target !== null && id !== target
        && config.station.standbyMode === "Hot Standby" && available(id);
    }
    snapshot = buildDvor1150aSnapshot(config, undefined, mainTransmitter ?? undefined);
    state.alarmElapsed = 0;
  };
  const shutdown = () => {
    route(null);
    const restart = config.station.automaticRestartsEnabled && state.restartAttempts < 2;
    state.phase = restart ? "restart-wait" : "lockout";
    // TM 2-45 inhibits RF for at least 20 s; Table 3-3 fixes restart #2 at 5 min.
    state.remaining = restart ? state.restartAttempts === 0
      ? Math.max(20, config.station.firstRestartDelay ?? 50) : 300 : 20;
    state.target = null;
    events.push("Automatic monitor shutdown");
  };
  // Consume elapsed time across boundaries, including background-throttled ticks.
  for (let transitions = 0; transitions < 32; transitions++) {
    if (state.phase === "lockout") { state.remaining = Math.max(0, state.remaining - budget); break; }
    if (state.phase === "cold-transfer" || state.phase === "restart-wait") {
      if (state.phase === "restart-wait" && !config.station.automaticRestartsEnabled) {
        state.phase = "lockout";
        state.remaining = Math.max(0, Math.min(20, state.remaining) - budget);
        break;
      }
      if (budget + 1e-9 < state.remaining) {
        state.remaining -= budget;
        break;
      }
      budget = Math.max(0, budget - state.remaining);
      state.remaining = 0;
      if (state.phase === "cold-transfer") {
        const target = state.target;
        if (!target || !available(target)) { shutdown(); continue; }
        route(target);
        state.phase = "monitoring";
        state.target = null;
        events.push(`Automatic monitor transfer to ${target.toUpperCase()}`);
      } else {
        const target = mainTransmitter && available(mainTransmitter) ? mainTransmitter
          : DVOR_TRANSMITTER_IDS.find(available);
        if (!target) { state.phase = "lockout"; break; }
        state.restartAttempts++;
        route(target, true);
        state.phase = "monitoring";
        events.push(`Automatic restart ${state.restartAttempts} to ${target.toUpperCase()}`);
      }
      continue;
    }
    const active = snapshot.voting.activeTransmitter;
    if (!active || !snapshot.voting.transferRequested) { state.alarmElapsed = 0; break; }
    const required = Math.max(0, protectionDelay(config, snapshot) - state.alarmElapsed);
    if (budget + 1e-9 < required) { state.alarmElapsed += budget; break; }
    budget = Math.max(0, budget - required);
    const target = active === "tx1" ? "tx2" : "tx1";
    if (config.station.transmitterConfig === "Dual Transmitters"
      && active === (mainTransmitter ?? active) && available(target)) {
      if (config.station.standbyMode === "Hot Standby" && config.transmitters[target].load) {
        route(target);
        events.push(`Automatic monitor transfer to ${target.toUpperCase()}`);
      } else {
        route(null);
        state.phase = "cold-transfer";
        state.remaining = 20;
        state.target = target;
        events.push(`Cold standby transfer pending to ${target.toUpperCase()}`);
      }
    } else shutdown();
  }
  return result();
}
