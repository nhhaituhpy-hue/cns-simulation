import { describe, expect, it } from "vitest";
import { dvorConfigFieldCatalog } from "@/lib/dvor1150a/config-utils";
import { createDefaultDvor1150aScenarioDefinition } from "@/lib/dvor1150a/scenario";
import { selexParameterAdapter } from "@/lib/ai/scenario-generation/parameter-selex";
import { selexAuthoringAdapters } from "@/lib/ai/scenario-authoring/forms/selex";
import { buildParameterPrompt } from "@/lib/ai/scenario-generation/parameter-prompt";

const unsupportedKeys = ["identStatus", "audioModulation", "audioFrequency"] as const;

describe("1150A Test Generator AI capability honesty", () => {
  it("carries stored-only metadata into the actual scenario-generation prompt", () => {
    const messages = buildParameterPrompt({ moduleId: "dvor-1150a", name: "TG setup", description: "Inspect Test Generator settings", difficulty: "basic" }, [], createDefaultDvor1150aScenarioDefinition(), "carrier-9960");
    const payload = JSON.parse(messages[1].content);
    for (const key of unsupportedKeys) {
      const field = payload.parameterCatalog.find((item: { id: string }) => item.id === `configuration.monitor.testGenerator.${key}`);
      expect(field).toMatchObject({ effect: "stored-only", recovery: false });
      expect(field.effectNotice).toMatch(/không phải số đo/);
    }
  });

  it.each(unsupportedKeys)("discloses %s as stored-only in both capability and authoring help", (key) => {
    const id = `monitor.testGenerator.${key}`;
    const native = dvorConfigFieldCatalog.find(field => field.id === id)!;
    expect(native.effect).toBe("stored-only");
    expect(native.effectNotice).toMatch(/Chỉ lưu cấu hình/);
    expect(native.effectNotice).toMatch(/không phải số đo/);
    const definition = createDefaultDvor1150aScenarioDefinition();
    const capability = selexParameterAdapter.fields("dvor-1150a", definition).find(field => field.id === `configuration.${id}`)!;
    expect(capability).toMatchObject({ effect: "stored-only", effectNotice: native.effectNotice, recovery: false });
    const authoring = selexAuthoringAdapters.find(adapter => adapter.moduleId === "dvor-1150a")!;
    const field = authoring.form(definition).fields.find(field => field.id === `configuration.${id}`)!;
    expect(field.schema.help).toContain(native.effectNotice);
    // Explicit setting exercises remain authorable, but not RF/detector recovery.
    definition.successCriteria.configurationValues = [{ fieldId: id, value: key === "identStatus" ? "Normal" : key === "audioFrequency" ? 300 : 10 }];
    definition.editPolicy = { mode: "open" };
    definition.studentEditableFieldIds = [];
    const setting = selexParameterAdapter.fields("dvor-1150a", definition).find(field => field.id === `configuration.${id}`)!;
    expect(setting.effect).toBe("stored-only");
    expect(setting.effectNotice).toBe(native.effectNotice);
  });

  it("does not relabel five implemented numeric results or add detector fields", () => {
    expect(dvorConfigFieldCatalog.filter(field => field.id.startsWith("monitor.testGenerator.") && field.effect === "stored-only").map(field => field.id).sort()).toEqual(unsupportedKeys.map(key => `monitor.testGenerator.${key}`).sort());
    expect(dvorConfigFieldCatalog.filter(field => field.id.startsWith("monitor.testGenerator."))).toHaveLength(8);
    expect(dvorConfigFieldCatalog.filter(field => field.id.startsWith("monitor.testGeneratorCalibration."))).toHaveLength(10);
  });
});
