import type {
  Dme320ControlOrigin,
  Dme320KeylockMode,
  Dme320SecurityLevel,
  Dme320SimulationState,
} from "./types";

export type Dme320Permission =
  | "view"
  | "basic-control"
  | "setup"
  | "profile"
  | "maintenance"
  | "user-administration";

const minimumLevel: Record<Dme320Permission, Dme320SecurityLevel> = {
  view: 0,
  "basic-control": 2,
  setup: 2,
  profile: 2,
  maintenance: 3,
  "user-administration": 3,
};

export function isDme320ControlOriginEnabled(
  keylock: Dme320KeylockMode,
  origin: Dme320ControlOrigin,
): boolean {
  if (origin === "local") return keylock === "LOCAL" || keylock === "MAINT";
  return keylock === "REM";
}

export function getDme320PermissionDenial(
  state: Dme320SimulationState,
  permission: Dme320Permission,
): string | null {
  const { level, origin } = state.session;
  const systemConfig = state.config.running.system;

  if (permission === "view") {
    if (level === 0 && !systemConfig.allowGuestAccess) {
      return "Guest access is disabled.";
    }
    return null;
  }

  if (level < minimumLevel[permission]) {
    return `Security level ${minimumLevel[permission]} is required.`;
  }
  if (!isDme320ControlOriginEnabled(state.keylock, origin)) {
    return `The ${origin} PMDT does not have control while keylock is ${state.keylock}.`;
  }

  if (permission === "setup" || permission === "profile") {
    if (systemConfig.modifyOnlyAtLocal && origin !== "local") {
      return "Configuration changes are restricted to a local PMDT.";
    }
    if (
      systemConfig.modifyOnlyWhenBypassed &&
      (state.monitors.mon1.mode !== "bypass" || state.monitors.mon2.mode !== "bypass")
    ) {
      return "Both monitors must be bypassed before configuration is changed.";
    }
  }

  if (permission === "maintenance") {
    if (origin !== "local" || state.keylock !== "MAINT") {
      return "Maintenance functions require a local level-3 session and MAINT keylock.";
    }
    if (state.monitors.mon1.mode !== "bypass" || state.monitors.mon2.mode !== "bypass") {
      return "Both monitors must be bypassed for maintenance.";
    }
  }

  return null;
}

export function canDme320(
  state: Dme320SimulationState,
  permission: Dme320Permission,
): boolean {
  return getDme320PermissionDenial(state, permission) === null;
}
