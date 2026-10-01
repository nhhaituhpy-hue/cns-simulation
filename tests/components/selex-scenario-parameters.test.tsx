import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { Dvor1150ScenarioParametersPanel } from "@/components/dvor1150/pmdt-scenario-parameters";
import { Dvor1150aScenarioParametersPanel } from "@/components/vor/dvor1150a-scenario-parameters";
import { Dme1119aScenarioParametersPanel } from "@/components/dme/dme-scenario-parameters";
import { createLowCarrierAnd9960Scenario } from "@/lib/dvor1150/scenario";
import { createSynthesizerTx2FrequencyScenario } from "@/lib/dvor1150a/scenario";
import { createLowOutputDme1119aScenario } from "@/lib/dme1119a/scenario";
import { useDvor1150PmdtStore } from "@/stores/dvor1150-pmdt-store";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";

const cases = [
  { label: "DVOR 1150", Panel: Dvor1150ScenarioParametersPanel, setup: () => {
    const definition = createLowCarrierAnd9960Scenario();
    definition.editPolicy = { mode: "restricted", allowedFieldIds: ["station.frequencyMHz"] };
    useDvor1150PmdtStore.getState().replaceScenarioDraft(definition);
    return { original: definition, selected: "station.frequencyMHz", read: () => useDvor1150PmdtStore.getState().scenarioDraft };
  } },
  { label: "DVOR 1150A", Panel: Dvor1150aScenarioParametersPanel, setup: () => {
    const definition = createSynthesizerTx2FrequencyScenario();
    definition.editPolicy = { mode: "restricted", allowedFieldIds: ["station.frequencyMHz"] };
    useVorPmdtStore.getState().replaceScenarioDraft(definition);
    return { original: definition, selected: "station.frequencyMHz", read: () => useVorPmdtStore.getState().scenarioDraft };
  } },
  { label: "DME 1119A", Panel: Dme1119aScenarioParametersPanel, setup: () => {
    const definition = createLowOutputDme1119aScenario();
    definition.editPolicy = { mode: "restricted", allowedFieldIds: ["rmsConfigStation.channelNumber"] };
    useDmePmdtStore.getState().replaceScenarioDraft(definition);
    return { original: definition, selected: "rmsConfigStation.channelNumber", read: () => useDmePmdtStore.getState().scenarioDraft };
  } },
];

describe("SELEX Scenario Parameters organization", () => {
  beforeEach(() => {
    useDvor1150PmdtStore.getState().reset();
    useVorPmdtStore.getState().reset();
    useDmePmdtStore.getState().reset();
    useDvor1150PmdtStore.getState().setScenarioAuthoringEnabled(true);
    useVorPmdtStore.getState().setScenarioAuthoringEnabled(true);
    useDmePmdtStore.getState().setScenarioAuthoringEnabled(true);
  });

  it.each(cases)("preserves $label native data and explicit field selection during an Open/Restricted round trip", ({ Panel, setup }) => {
    let fixture: ReturnType<typeof setup>;
    act(() => { fixture = setup(); });
    const { container } = render(<Panel />);
    expect([...container.querySelectorAll("[data-scenario-section]")].map((node) => node.getAttribute("data-scenario-section"))).toEqual(["1", "2", "3", "4", "5"]);
    expect(screen.getByText("Kết luận PMDT mong đợi:")).toBeInTheDocument();
    const policy = screen.getByRole("region", { name: "Student recovery controls" });
    const mode = within(policy).getByRole("combobox", { name: "Chế độ / Edit policy" });
    fireEvent.change(mode, { target: { value: "open" } });
    fireEvent.change(mode, { target: { value: "restricted" } });
    expect(fixture!.read()).toEqual({
      ...fixture!.original,
      studentEditableFieldIds: [fixture!.selected],
      editPolicy: { mode: "restricted", allowedFieldIds: [fixture!.selected] },
    });
  });
});
