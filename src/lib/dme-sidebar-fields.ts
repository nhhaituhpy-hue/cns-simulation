import type { DmeFieldOverride } from "./dme-types";

export const DME_INTERACTIVE_SIDEBAR_FIELDS = {
  local: { label: "Local", defaultStatus: "yellow" },
  "monitors.integral.bypass": { label: "Integral Bypass", defaultStatus: "yellow" },
  "monitors.standby.bypass": { label: "Standby Bypass", defaultStatus: "yellow" },
} as const;

export type DmeInteractiveSidebarFieldId = keyof typeof DME_INTERACTIVE_SIDEBAR_FIELDS;

export function isInteractiveSidebarField(
  fieldId: string,
): fieldId is DmeInteractiveSidebarFieldId {
  return Object.hasOwn(DME_INTERACTIVE_SIDEBAR_FIELDS, fieldId);
}

export function getSidebarInteractionTargets(
  overrides: readonly DmeFieldOverride[],
) {
  return overrides
    .filter((override) => isInteractiveSidebarField(override.fieldId))
    .map((override) => ({
      ...override,
      label:
        DME_INTERACTIVE_SIDEBAR_FIELDS[
          override.fieldId as DmeInteractiveSidebarFieldId
        ].label,
    }));
}
