import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, it } from "vitest";
import { Dvor1150aScenarioParametersPanel } from "@/components/vor/dvor1150a-scenario-parameters";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import { createDefaultDvor1150aScenarioDefinition, dvor1150aScenarioFieldRole } from "@/lib/dvor1150a/scenario";
import { dvorConfigFieldCatalog } from "@/lib/dvor1150a/config-utils";
import { dvor1150aScenarioPolicyGroupPath } from "@/components/vor/dvor1150a-scenario-policy-groups";

beforeEach(() => {
  useVorPmdtStore.getState().reset();
  useVorPmdtStore.getState().setScenarioAuthoringEnabled(true);
  useVorPmdtStore.getState().replaceScenarioDraft(createDefaultDvor1150aScenarioDefinition());
});

it("organizes transmitter permissions by native Configuration tabs and keeps TX identities", () => {
  render(<Dvor1150aScenarioParametersPanel />);
  const policy = screen.getByRole("region", { name: "Student recovery controls" });
  function group(name: string) {
    const details = within(policy).getByRole("group", { name, hidden: true });
    fireEvent.click(details.querySelector("summary")!);
    return details;
  }
  group("Transmitters");
  group("Transmitters → Configuration");
  group("Transmitters → Configuration → Nominal");
  const nominal = group("Transmitters → Configuration → Nominal → Transmitter 1");
  expect(within(nominal).getByRole("checkbox", { name: "Output power" })).toBeInTheDocument();
  expect(within(nominal).queryByRole("checkbox", { name: "Output power scale" })).not.toBeInTheDocument();
  group("Transmitters → Configuration → Offsets and Scale Factors");
  const offsets = group("Transmitters → Configuration → Offsets and Scale Factors → Transmitter 1");
  expect(within(offsets).getByRole("checkbox", { name: "Output power scale" })).toBeInTheDocument();
  expect(within(offsets).queryByRole("checkbox", { name: "Output power" })).not.toBeInTheDocument();
});

it("keeps every catalog permission once and preserves selected IDs, guards and running state", () => {
  const draft = createDefaultDvor1150aScenarioDefinition();
  const selected = ["transmitters.tx1.offsets.outputPowerScale", "transmitters.tx2.nominal.outputPower"];
  draft.editPolicy = { mode: "restricted", allowedFieldIds: [...selected] };
  draft.studentEditableFieldIds = [...selected];
  useVorPmdtStore.getState().replaceScenarioDraft(draft);
  const before = useVorPmdtStore.getState();
  render(<Dvor1150aScenarioParametersPanel />);
  const policy = screen.getByRole("region", { name: "Student recovery controls" });
  policy.querySelectorAll("details").forEach((details) => { details.open = true; });
  const inputs = Array.from(policy.querySelectorAll<HTMLInputElement>("[data-scenario-policy-field-id]"));
  const expected = dvorConfigFieldCatalog.filter((field) => !field.id.startsWith("simulation."));
  expect(inputs.map((input) => input.dataset.scenarioPolicyFieldId).sort()).toEqual(expected.map((field) => field.id).sort());
  for (const input of inputs) {
    const id = input.dataset.scenarioPolicyFieldId!;
    expect(input.checked, id).toBe(selected.includes(id));
    expect(input.disabled, id).toBe(dvor1150aScenarioFieldRole(id) !== "student-operable");
  }
  const offset = policy.querySelector<HTMLInputElement>('[data-scenario-policy-field-id="transmitters.tx1.offsets.outputPowerScale"]')!;
  fireEvent.click(offset);
  function explicitIds() {
    const policy = useVorPmdtStore.getState().scenarioDraft.editPolicy;
    return policy?.mode === "restricted" ? policy.allowedFieldIds : [];
  }
  expect(explicitIds()).toEqual([selected[1]]);
  fireEvent.click(offset);
  const explicit = explicitIds();
  const mode = within(policy).getByRole("combobox", { name: "Chế độ / Edit policy" });
  fireEvent.change(mode, { target: { value: "open" } });
  for (const input of inputs) expect(input).toBeDisabled();
  fireEvent.change(mode, { target: { value: "restricted" } });
  expect(explicitIds()).toEqual(explicit);
  expect(useVorPmdtStore.getState().config).toBe(before.config);
  expect(useVorPmdtStore.getState().scenarioDraft.configuration).toEqual(draft.configuration);
  expect(useVorPmdtStore.getState().scenarioDraft.successCriteria).toEqual(draft.successCriteria);
});

it("maps monitor and station permissions to actual menus without presenting simulation stimuli as native controls", () => {
  const groups: Record<string, readonly string[]> = {
    "station.frequencyMHz": ["RMS", "Configuration", "Station"],
    "monitor.votingLogic": ["RMS", "Configuration", "General"],
    "monitor.routing.rfLevel.primary": ["Monitors", "Configuration", "General"],
    "monitor.timers.shutdown": ["Monitors", "Configuration", "Alarm Limits"],
    "monitor.calibration.mon1.azimuthOffset": ["Monitor 1", "Offsets & Scale Factors", "Integral"],
    "monitor.standbyCalibration.mon2.txPowerScale": ["Monitor 2", "Offsets & Scale Factors", "Standby"],
    "monitor.testGeneratorCalibration.mon2.azimuthOffset": ["Monitor 2", "Offsets & Scale Factors", "Test Generator / Certification"],
    "monitor.testGenerator.audioFrequency": ["Monitor 1 / Monitor 2", "Test Results", "Test Generator Setup"],
  };
  for (const [id, expected] of Object.entries(groups)) {
    expect(dvor1150aScenarioPolicyGroupPath(dvorConfigFieldCatalog.find((field) => field.id === id)!)).toEqual(expected);
  }
  for (const field of dvorConfigFieldCatalog.filter((item) => item.id.includes(".faults.") || item.id.startsWith("monitor.rawMeasurements."))) {
    expect(dvor1150aScenarioPolicyGroupPath(field)[0]).toBe("Tham số mô phỏng");
  }
});
