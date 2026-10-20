// @vitest-environment node
import { describe, expect, it } from "vitest";
import * as capabilitiesModule from "@/lib/ai/scenario-generation/capabilities";
import * as validationModule from "@/lib/ai/scenario-generation/validation";
import { SCENARIO_PARAMETERS_MODULES, parseScenarioParameters } from "@/lib/scenario-parameters";

describe("native AI capability boundary", () => {
  it.each(SCENARIO_PARAMETERS_MODULES)("materializes a native supported fault for $moduleId", ({ moduleId }) => {
    expect(capabilitiesModule?.getScenarioCapabilities).toBeTypeOf("function");
    expect(validationModule?.validateSelection).toBeTypeOf("function");
    const { getScenarioCapabilities, createTemplateDefinition } = capabilitiesModule!;
    const { validateSelection } = validationModule!;
    const capabilities = getScenarioCapabilities(moduleId);
    expect(capabilities.length).toBeGreaterThan(0);
    expect(capabilities.some((item) => item.templateId === "default")).toBe(false);
    const template = capabilities[0];
    const input = { moduleId, name: "Bài thực hành", description: template.description, difficulty: "advanced" as const };
    const result = validateSelection(input, [], { status: "supported", moduleId, templateId: template.templateId, explanation: "Uses the approved native fault template, without modifying its simulator behavior.", citations: [{ documentId: "request", segmentLabel: "request", quote: input.description }] });
    const original = createTemplateDefinition(moduleId, template.templateId);
    expect(parseScenarioParameters(moduleId, result.definition)).not.toBeNull();
    expect(result.definition.name).toBe(input.name);
    expect(result.definition.description).toBe(input.description);
    expect(result.definition.difficulty).toBe("advanced");
    expect(result.definition.id).not.toBe(original.id);
    const nativeBehavior = (definition: typeof original) => Object.fromEntries(Object.entries(definition).filter(([key]) => !["id", "name", "description", "difficulty"].includes(key)));
    expect(nativeBehavior(result.definition)).toEqual(nativeBehavior(original));
    expect(result.provenance.templateId).toBe(template.templateId);
  });
});

describe("untrusted selection validation", () => {
  const input = { moduleId: "dme-320" as const, name: "HPA", description: "TX1 HPA Low Output Fault", difficulty: "basic" as const };
  const citation = { documentId: "request", segmentLabel: "request", quote: input.description };
  const output = { status: "supported", moduleId: "dme-320", templateId: "hpa-fault", explanation: "Select the existing HPA fault.", citations: [citation] };
  it.each([
    ["wrong module", { ...output, moduleId: "dvor-220" }],
    ["default is not a fault", { ...output, templateId: "default" }],
    ["unknown template", { ...output, templateId: "rf-magic" }],
    ["unsupported request", { status: "unsupported", reason: "No supported fault" }],
    ["arbitrary RF injection", { ...output, configuration: { rfPower: 999 } }],
    ["scalar patch not approved", { ...output, patches: [{ path: "configuration.power", value: 999 }] }],
    ["invented evidence", { ...output, citations: [{ ...citation, quote: "manufacturer says fire the laser" }] }],
    ["wrong evidence source", { ...output, citations: [{ ...citation, documentId: "manual" }] }],
    ["missing evidence", { ...output, citations: [] }],
  ])("rejects %s", (_name, value) => {
    expect(() => validationModule!.validateSelection(input, [], value)).toThrow();
  });
  it("requires exact document substrings and preserves source identity", () => {
    const documents = [{ id: "doc-1", name: "guide.txt", sha256: "a".repeat(64), segments: [{ label: "text", text: "Existing HPA fault is simulated." }] }];
    const cited = { ...output, citations: [{ documentId: "doc-1", segmentLabel: "text", quote: "HPA fault is simulated" }] };
    const result = validationModule!.validateSelection(input, documents, cited);
    expect(result.provenance.citations).toEqual(cited.citations);
    expect(result.provenance.documents).toEqual([{ id: "doc-1", name: "guide.txt", sha256: "a".repeat(64) }]);
    expect(() => validationModule!.validateSelection(input, documents, { ...cited, citations: [{ ...cited.citations[0], segmentLabel: "page 999" }] })).toThrow();
  });
  it("rejects invalid authoring metadata", () => {
    expect(() => validationModule!.validateSelection({ ...input, name: "", description: "" }, [], output)).toThrow();
    expect(() => validationModule!.validateSelection({ ...input, difficulty: "easy" as never }, [], output)).toThrow();
  });
});

it("every advertised native fault passes schema and detached semantic preview", () => {
  for (const { moduleId } of SCENARIO_PARAMETERS_MODULES) {
    for (const template of capabilitiesModule!.getScenarioCapabilities(moduleId)) {
      const input = { moduleId, name: template.label, description: template.description, difficulty: "intermediate" as const };
      const result = validationModule!.validateSelection(input, [], { status: "supported", moduleId, templateId: template.templateId, explanation: "The native built-in fault behavior exactly matches this request.", citations: [{ documentId: "request", segmentLabel: "request", quote: input.description }] });
      expect(parseScenarioParameters(moduleId, result.definition), `${moduleId}:${template.templateId}`).not.toBeNull();
    }
  }
});
