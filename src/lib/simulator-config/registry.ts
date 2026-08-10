import { adsbConfigAdapter } from "./ads-b";
import { dme1119aConfigAdapter } from "./dme-1119a";
import { dme320ConfigAdapter } from "./dme-320";
import { dvor1150ConfigAdapter } from "./dvor-1150";
import { dvor1150aConfigAdapter } from "./dvor-1150a";
import { dvor220ConfigAdapter } from "./dvor-220";
import type {
  SimulatorConfigAdapter,
  SupportedSimulatorConfigId,
} from "./types";

const simulatorConfigAdapters = {
  "dvor-1150a": dvor1150aConfigAdapter,
  "dme-1119a": dme1119aConfigAdapter,
  "dvor-1150": dvor1150ConfigAdapter,
  "dvor-220": dvor220ConfigAdapter,
  "dme-320": dme320ConfigAdapter,
  "ads-b": adsbConfigAdapter,
} as const satisfies Record<SupportedSimulatorConfigId, SimulatorConfigAdapter<unknown>>;

export function isSupportedSimulatorConfigId(
  value: string,
): value is SupportedSimulatorConfigId {
  return Object.hasOwn(simulatorConfigAdapters, value);
}

export function getSimulatorConfigAdapter(
  simulatorId: string,
): SimulatorConfigAdapter<unknown> | null {
  return isSupportedSimulatorConfigId(simulatorId)
    ? simulatorConfigAdapters[simulatorId]
    : null;
}
