import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { useState } from "react";
import { Dvor1150aScenarioParametersPanel } from "@/components/vor/dvor1150a-scenario-parameters";
import { Dvor1150aTrainingHud } from "@/components/vor/dvor1150a-training-hud";
import { AiAuthoringField } from "@/components/scenario/ai-authoring-field";
import { authoringAdapterFor } from "@/lib/ai/scenario-authoring/forms/registry";
import { createDefaultDvor1150aScenarioDefinition, dvor1150aScenarioFieldRole, parseDvor1150aScenarioDefinition } from "@/lib/dvor1150a/scenario";
import { dvorConfigFieldCatalog } from "@/lib/dvor1150a/config-utils";
import { readPath, validateFieldValue } from "@/lib/ai/scenario-authoring/forms/helpers";
import { createAuthoringState, mutateAuthoringState } from "@/lib/ai/scenario-authoring/state";
import type { JsonValue } from "@/lib/ai/scenario-authoring/types";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

const id = "successCriteria.configurationValues";
afterEach(cleanup);

it("offers typed exact requirements for every native learner configuration field, not free JSON paths", () => {
  const adapter = authoringAdapterFor("dvor-1150a"), source = adapter.createDefault();
  const form = adapter.form(source), criterion = form.fields.find(f => f.id === id);
  expect(criterion).toBeDefined();
  expect(criterion).toMatchObject({ sectionId: "criteria", value: [], baselineEligible: false });
  const operable = dvorConfigFieldCatalog.filter(f => dvor1150aScenarioFieldRole(f.id) === "student-operable");
  expect(criterion!.schema.discriminator).toBe("fieldId");
  expect(criterion!.schema.variants!.map(v => v.value)).toEqual(operable.map(f => f.id));
  for (const field of operable) {
    const variant = criterion!.schema.variants!.find(v => v.value === field.id)!;
    expect(variant.label).toContain(field.section);
    expect(variant.schema.properties!.value).toMatchObject({ type: field.type, unit: field.unit });
    expect(validateFieldValue(criterion!.schema, [variant.initial]), field.id).toEqual([]);
    expect(form.fields.find(f => f.id === `configuration.${field.id}`), field.id).toBeDefined();
  }
  expect(criterion!.schema.variants!.some(v => /rawMeasurements|faults|simulation|security/.test(v.value))).toBe(false);
});

it("round-trips numeric, boolean and enum targets through state/server validation without changing the initial settings", () => {
  const initial = createAuthoringState("dvor-1150a", "exact-values");
  const values = [
    { fieldId: "monitor.timers.shutdown", value: 2 },
    { fieldId: "monitor.routing.rfLevel.secondary", value: true },
    { fieldId: "monitor.votingLogic", value: "OR" },
    { fieldId: "transmitters.tx2.nominal.mainIdentCode", value: "AB" },
  ];
  const changed = mutateAuthoringState(initial, { action: "edit", changes: [{ fieldId: id, value: values }] });
  expect(readPath(changed.definition, id)).toEqual(values);
  expect(readPath(changed.definition, "configuration")).toEqual(readPath(initial.definition, "configuration"));
  expect(parseDvor1150aScenarioDefinition(changed.definition)).toEqual(changed.definition);
  expect(changed.sources[id]).toMatchObject({ kind: "user" });
  for (const value of [ [{ fieldId: "monitor.unknown", value: 2 }], [{ fieldId: "monitor.timers.shutdown", value: "2" }], [{ fieldId: "monitor.timers.shutdown", value: 2, arbitrary: true }] ]) {
    expect(() => mutateAuthoringState(initial, { action: "edit", changes: [{ fieldId: id, value }] })).toThrow();
  }
  expect(readPath(initial.definition, id)).toBeUndefined();
});

it("renders the real recursive criterion controls and changes target types without a raw JSON editor", () => {
  const adapter = authoringAdapterFor("dvor-1150a"), source = adapter.createDefault();
  const field = adapter.form(source).fields.find(f => f.id === id);
  expect(field).toBeDefined();
  function Controls() {
    const [value, setValue] = useState<JsonValue>([]);
    return <><AiAuthoringField schema={field!.schema} value={value} onChange={setValue} /><output>{JSON.stringify(value)}</output></>;
  }
  const view = render(<Controls />);
  fireEvent.click(screen.getByRole("button", { name: "Thêm Giá trị cấu hình bắt buộc" }));
  const selector = screen.getByLabelText("Loại Giá trị cấu hình bắt buộc 1");
  fireEvent.change(selector, { target: { value: "monitor.timers.shutdown" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: "Giá trị đích" }), { target: { value: "2" } });
  expect(view.container.querySelector("output")).toHaveTextContent('"monitor.timers.shutdown","value":2');
  fireEvent.change(selector, { target: { value: "monitor.votingLogic" } });
  expect(screen.getByLabelText("Giá trị đích").tagName).toBe("SELECT");
  fireEvent.change(screen.getByLabelText("Giá trị đích"), { target: { value: "OR" } });
  expect(view.container.querySelector("output")).toHaveTextContent('"monitor.votingLogic","value":"OR"');
  fireEvent.change(selector, { target: { value: "monitor.routing.rfLevel.secondary" } });
  expect(screen.getByLabelText("Giá trị đích")).toHaveAttribute("type", "checkbox");
  expect(view.container.querySelector("textarea")).toBeNull();
});

it("selects and exports an exact timer requirement in the native Scenario Parameters panel", () => {
  act(() => {
    useVorPmdtStore.getState().reset();
    useVorPmdtStore.getState().setScenarioAuthoringEnabled(true);
    useVorPmdtStore.getState().replaceScenarioDraft(createDefaultDvor1150aScenarioDefinition());
  });
  render(<Dvor1150aScenarioParametersPanel />);
  const section = within(screen.getByRole("region", { name: "Success criteria editor" }));
  fireEvent.click(section.getByRole("button", { name: "Thêm Giá trị cấu hình bắt buộc" }));
  fireEvent.change(section.getByLabelText("Loại Giá trị cấu hình bắt buộc 1"), { target: { value: "monitor.timers.shutdown" } });
  fireEvent.change(section.getByRole("spinbutton", { name: "Giá trị đích" }), { target: { value: "2" } });
  const definition = useVorPmdtStore.getState().scenarioDraft;
  expect(readPath(definition, id)).toEqual([{ fieldId: "monitor.timers.shutdown", value: 2 }]);
  expect(parseDvor1150aScenarioDefinition(JSON.parse(JSON.stringify(definition)))).toEqual(definition);
  expect(definition.configuration.monitor.timers.shutdown).toBe(5);
});

it("updates the real training HUD only after native Apply proves the required field change", () => {
  act(() => {
    useVorPmdtStore.getState().reset();
    const d=createDefaultDvor1150aScenarioDefinition();
    d.startPolicy.startLocal=true;
    d.successCriteria.configurationValues=[{fieldId:"monitor.timers.shutdown",value:2}];
    d.taskTargets=[{fieldId:"monitor.timers.shutdown",requirement:"change-applied"}];
    expect(useVorPmdtStore.getState().startReviewScenario(d)).toBe(true);
    expect(useVorPmdtStore.getState().login("SEC3","THREE")).toBe(true);
  });
  render(<Dvor1150aTrainingHud />);
  expect(screen.getByRole("status")).toHaveTextContent("IN PROGRESS");
  act(()=>useVorPmdtStore.getState().setConfigValue("monitor.timers.shutdown",2));
  expect(screen.getByRole("status")).toHaveTextContent("IN PROGRESS");
  act(()=>{expect(useVorPmdtStore.getState().applyConfigChanges()).toBe(true);});
  expect(screen.getByRole("status")).toHaveTextContent("SOLVED");
});
