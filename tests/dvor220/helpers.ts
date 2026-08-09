import { reduceDvor220Command } from "@/modules/operations/dvor-220/domain/commands";
import {
  cloneDvor220,
  createDefaultDvor220Configuration,
  createInitialDvor220State,
} from "@/modules/operations/dvor-220/domain/defaults";
import type {
  Dvor220Configuration,
  Dvor220ConnectionKind,
  Dvor220ConnectionLocation,
  Dvor220ConnectionProfile,
  Dvor220DeviceState,
  Dvor220KeylockMode,
  Dvor220SecurityLevel,
} from "@/modules/operations/dvor-220/domain/types";

export const localEthernetProfile: Dvor220ConnectionProfile = {
  id: "local-ethernet",
  name: "Local Ethernet",
  description: "Local PMDT training connection",
  kind: "ethernet",
  location: "local",
  timeoutMs: 5_000,
  ipAddress: "172.16.1.10",
  port: 4_000,
};

export function profileAt(
  location: Dvor220ConnectionLocation,
  kind: Dvor220ConnectionKind = "ethernet",
): Dvor220ConnectionProfile {
  return {
    ...localEthernetProfile,
    id: `${location}-${kind}`,
    name: `${location} ${kind}`,
    location,
    kind,
  };
}
interface AuthorizedStateOptions {
  nowMs?: number;
  level?: Exclude<Dvor220SecurityLevel, 0>;
  location?: Dvor220ConnectionLocation;
  kind?: Dvor220ConnectionKind;
  keylock?: Dvor220KeylockMode;
  configuration?: Dvor220Configuration;
  preservePowerOnHoldoff?: boolean;
}

export function createAuthorizedDvor220State(
  options: AuthorizedStateOptions = {},
): Dvor220DeviceState {
  const level = options.level ?? 3;
  const configuration = cloneDvor220(
    options.configuration ?? createDefaultDvor220Configuration(),
  );
  if (!options.preservePowerOnHoldoff) configuration.monitor.powerOnHoldoffMs = 0;
  let state = createInitialDvor220State({
    nowMs: options.nowMs ?? 0,
    configuration,
  });
  const username = `Level${level}`;
  const password = `pass${level}`;
  state.accounts.push({ username, password, level });
  state = reduceDvor220Command(state, {
    type: "connect",
    profile: profileAt(options.location ?? "local", options.kind),
  }).state;
  state = reduceDvor220Command(state, { type: "login", username, password }).state;
  if (options.keylock && options.keylock !== state.keylock) {
    state = reduceDvor220Command(state, { type: "set-keylock", mode: options.keylock }).state;
  }
  return state;
}
