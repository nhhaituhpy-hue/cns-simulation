import type { VorFieldOverride } from "./vor-types";

export const VOR_INTERACTIVE_SIDEBAR_FIELDS = {
  local: { label: "Local", defaultStatus: "yellow" },
  "monitorIntegral.bypass": { label: "Bypass", defaultStatus: "yellow" },
} as const;

export type VorInteractiveSidebarFieldId =
  keyof typeof VOR_INTERACTIVE_SIDEBAR_FIELDS;

export function isInteractiveSidebarField(
  fieldId: string,
): fieldId is VorInteractiveSidebarFieldId {
  return Object.hasOwn(VOR_INTERACTIVE_SIDEBAR_FIELDS, fieldId);
}

export function getSidebarInteractionTargets(
  overrides: readonly VorFieldOverride[],
) {
  return overrides
    .filter((override) => isInteractiveSidebarField(override.fieldId))
    .map((override) => ({
      ...override,
      label:
        VOR_INTERACTIVE_SIDEBAR_FIELDS[
          override.fieldId as VorInteractiveSidebarFieldId
        ].label,
    }));
}
