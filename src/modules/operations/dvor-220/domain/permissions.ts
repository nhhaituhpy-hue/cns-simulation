import type {
  Dvor220DeviceState,
  Dvor220Permission,
} from "./types";

export interface Dvor220PermissionDecision {
  allowed: boolean;
  reason?: string;
}

export function isDvor220LocalConnection(state: Dvor220DeviceState): boolean {
  return state.connection.profile?.location === "local";
}

export function hasDvor220ControlOwnership(state: Dvor220DeviceState): boolean {
  if (!state.connection.connected || !state.connection.profile) return false;
  const local = state.connection.profile.location === "local";
  if (state.keylock === "MAINT") return local;
  if (state.keylock === "LOCAL") return local;
  return !local;
}

export function isDvor220MonitorEffectivelyBypassed(state: Dvor220DeviceState): boolean {
  if (state.keylock === "MAINT") return true;
  return Object.values(state.monitors).every((monitor) => monitor.bypassRequested);
}

function hasReadableSession(state: Dvor220DeviceState): boolean {
  if (!state.connection.connected) return false;
  return state.session.username !== null || state.configuration.running.system.allowGuestAccess;
}

export function getDvor220PermissionDecision(
  state: Dvor220DeviceState,
  permission: Dvor220Permission,
): Dvor220PermissionDecision {
  if (!hasReadableSession(state)) {
    return { allowed: false, reason: "A connected and authenticated PMDT session is required." };
  }

  if (permission === "read") return { allowed: true };

  if (state.session.level < 2) {
    return { allowed: false, reason: "Security level 2 or 3 is required." };
  }

  if (!hasDvor220ControlOwnership(state)) {
    return { allowed: false, reason: "The PMDT does not own control in the current keylock mode." };
  }

  if (permission === "control") return { allowed: true };

  if (permission === "manage-users") {
    return state.session.level >= 3
      ? { allowed: true }
      : { allowed: false, reason: "Security level 3 is required for user management." };
  }

  if (permission === "firmware-update") {
    const isLocalRs232 = isDvor220LocalConnection(state) && state.connection.profile?.kind === "rs232";
    if (state.session.level < 3) {
      return { allowed: false, reason: "Security level 3 is required for firmware update." };
    }
    return isLocalRs232
      ? { allowed: true }
      : { allowed: false, reason: "Firmware update is available only over the local RS-232 port." };
  }

  if (permission === "calibrate") {
    return { allowed: true };
  }

  const system = state.configuration.running.system;
  if (system.settingsOnlyAtLocal && !isDvor220LocalConnection(state)) {
    return { allowed: false, reason: "System settings are restricted to a local PMDT." };
  }
  if (system.settingsOnlyWhenMonitorBypassed && !isDvor220MonitorEffectivelyBypassed(state)) {
    return { allowed: false, reason: "The monitors must be bypassed before changing system settings." };
  }
  return { allowed: true };
}

export function canDvor220(
  state: Dvor220DeviceState,
  permission: Dvor220Permission,
): boolean {
  return getDvor220PermissionDecision(state, permission).allowed;
}
