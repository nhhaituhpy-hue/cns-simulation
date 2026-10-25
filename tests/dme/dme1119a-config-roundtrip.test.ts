import { describe, expect, it } from "vitest";
import { dmeParameterFieldCatalog, getDmeParameterValue, setDmeParameterValue, validateDmeParameterField } from "@/lib/dme1119a/config";
import { extractDme1119aConfig, getDefaultDme1119aConfig, hydrateDme1119aData } from "@/lib/simulator-config/dme-1119a";
import { createDefaultDme1119aScenarioDefinition, parseDme1119aScenarioDefinition } from "@/lib/dme1119a/scenario";
import { createDmePmdtStore } from "@/stores/dme-pmdt-store";

const editable = dmeParameterFieldCatalog.filter(field => !field.readOnly && !field.id.startsWith("simulation.") && !field.id.startsWith("securityAccounts.") && !["connected", "local", "alert", "timestamp"].includes(field.id));

describe("DME authoring configuration roundtrip", () => {
  it("keeps coverage of all 209 editable configuration fields", () => {
    expect(editable).toHaveLength(209);
    expect(new Set(editable.map(field => field.id)).size).toBe(209);
  });

  it.each(editable.map(field => [field.id, field] as const))("retains %s through the exact baseline edit boundary", (_id, field) => {
    const original = hydrateDme1119aData(getDefaultDme1119aConfig());
    const before = getDmeParameterValue(original, field.id);
    const candidates = field.type === "boolean" ? [!before]
      : field.type === "select" ? field.options!.filter(value => value !== before)
      : field.type === "text" ? [field.id.endsWith("IdentCode") ? "QA" : "Review"]
      : [Number(before ?? 0) + (field.step ?? 1), Number(before ?? 0) - (field.step ?? 1), field.min, field.max].filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value !== before);
    const requested = candidates.find(value => !validateDmeParameterField(field, value));
    expect(requested).toBeDefined();
    const stored = extractDme1119aConfig(setDmeParameterValue(original, field.id, requested!));
    expect(getDmeParameterValue(hydrateDme1119aData(JSON.parse(JSON.stringify(stored))), field.id)).toEqual(requested);
    expect(getDmeParameterValue(original, field.id)).toEqual(before);
  });

  it("preserves new settings through scenario export/import, Apply, native edits and Restore", () => {
    const definition = createDefaultDme1119aScenarioDefinition();
    let data = hydrateDme1119aData(definition.configuration);
    data = setDmeParameterValue(data, "monitorOffsets.monitor1.0.integral", 2.5);
    data = setDmeParameterValue(data, "rmsVoltageData.0.enabled", true);
    definition.configuration = extractDme1119aConfig(data);
    definition.successCriteria = [{ id: "recover", kind: "configuration-values", targets: [{ fieldId: "monitorOffsets.monitor1.0.integral", value: 0 }] }];
    const imported = parseDme1119aScenarioDefinition(JSON.parse(JSON.stringify(definition)));
    expect(imported).toEqual(definition);
    const store = createDmePmdtStore();
    const account = store.getState().data.securityAccounts.find(item => item.securityLevel === 3)!;
    expect(store.getState().login(account.userId, account.password)).toBe(true);
    store.getState().setLocalMode(true); store.getState().setScenarioAuthoringEnabled(true);
    store.getState().replaceScenarioDraft(imported!); expect(store.getState().applyScenario()).toBe(true);
    expect(getDmeParameterValue(store.getState().data, "monitorOffsets.monitor1.0.integral")).toBe(2.5);
    expect(store.getState().data.rmsVoltageData[0].enabled).toBe(true);
    store.getState().setParameterValue("monitorOffsets.monitor1.0.integral", 0);
    expect(store.getState().applyConfigChanges()).toBe(true);
    expect(getDmeParameterValue(store.getState().data, "monitorOffsets.monitor1.0.integral")).toBe(0);
    expect(store.getState().restoreScenario()).toBe(true);
    expect(getDmeParameterValue(store.getState().data, "monitorOffsets.monitor1.0.integral")).toBe(2.5);
    expect(store.getState().data.rmsVoltageData[0].enabled).toBe(true);
  });
});
