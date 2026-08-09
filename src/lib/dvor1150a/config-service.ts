import type {
  Dvor1150aConfig,
  Dvor1150aSnapshot,
  DvorConfigValue,
} from "./config-types";
import {
  dvorConfigFieldCatalog,
  setDvorConfigValue,
  validateDvorConfigField,
} from "./config-utils";
import { cloneDvor1150aConfig, createDefaultDvor1150aConfig } from "./defaults";
import { buildDvor1150aSnapshot } from "./engine";

const transmitterRoutePattern = /^transmitters\.(tx1|tx2)\.(onAir|load)$/;

function normalizeTransmitterRoute(
  config: Dvor1150aConfig,
  fieldId: string,
  value: DvorConfigPatch["value"],
): Dvor1150aConfig {
  if (value !== true) return config;

  const match = transmitterRoutePattern.exec(fieldId);
  if (!match) return config;

  const transmitterId = match[1] as "tx1" | "tx2";
  const route = match[2] as "onAir" | "load";
  let next = setDvorConfigValue(
    config,
    `transmitters.${transmitterId}.${route === "onAir" ? "load" : "onAir"}`,
    false,
  );

  // Main is a station-wide selection: moving it to one transmitter leaves
  // the other transmitter in the explicit Off state, never in Load.
  if (route === "onAir") {
    const otherTransmitterId = transmitterId === "tx1" ? "tx2" : "tx1";
    next = setDvorConfigValue(next, `transmitters.${otherTransmitterId}.onAir`, false);
    next = setDvorConfigValue(next, `transmitters.${otherTransmitterId}.load`, false);
  }

  return next;
}

export interface DvorConfigPatch {
  fieldId: string;
  value: DvorConfigValue;
}

export type DvorConfigPatchResult =
  | {
      ok: true;
      config: Dvor1150aConfig;
      snapshot: Dvor1150aSnapshot;
    }
  | {
      ok: false;
      error: string;
      fieldId?: string;
    };

/**
 * Applies a patch sequence atomically at the simulator boundary.
 * The same validation and snapshot calculation is used by the store and API
 * so a value changed in the UI cannot follow a different rule on the server.
 */
export function applyDvorConfigPatches(
  baseConfig: Dvor1150aConfig,
  patches: readonly DvorConfigPatch[] = [],
): DvorConfigPatchResult {
  let config = cloneDvor1150aConfig(baseConfig);

  for (const patch of patches) {
    const field = dvorConfigFieldCatalog.find((item) => item.id === patch.fieldId);
    if (!field) {
      return {
        ok: false,
        error: `Field không được hỗ trợ: ${patch.fieldId}`,
        fieldId: patch.fieldId,
      };
    }

    const validationMessage = validateDvorConfigField(field, patch.value);
    if (validationMessage) {
      return {
        ok: false,
        error: `${field.label}: ${validationMessage}`,
        fieldId: patch.fieldId,
      };
    }

    config = setDvorConfigValue(config, patch.fieldId, patch.value);
    config = normalizeTransmitterRoute(config, patch.fieldId, patch.value);
  }

  if (config.simulation.integralMonitorBypass && !config.simulation.local) {
    return {
      ok: false,
      error: "Phải bật Local trước khi bật Integral monitor bypass.",
      fieldId: "simulation.integralMonitorBypass",
    };
  }

  for (const transmitterId of ["tx1", "tx2"] as const) {
    const transmitter = config.transmitters[transmitterId];
    if (transmitter.onAir && transmitter.load) {
      return {
        ok: false,
        error: "Một transmitter không thể đồng thời ở On-air và Load.",
        fieldId: `transmitters.${transmitterId}`,
      };
    }
  }

  return {
    ok: true,
    config,
    snapshot: buildDvor1150aSnapshot(config),
  };
}

export function simulateDvorConfigPatches(
  patches: readonly DvorConfigPatch[] = [],
): DvorConfigPatchResult {
  return applyDvorConfigPatches(createDefaultDvor1150aConfig(), patches);
}
