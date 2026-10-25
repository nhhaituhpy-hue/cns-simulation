import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, it } from "vitest";
import { Dme1119aScenarioParametersPanel } from "@/components/dme/dme-scenario-parameters";
import { createDefaultDme1119aScenarioDefinition, dme1119aScenarioFieldRole, parseDme1119aScenarioDefinition } from "@/lib/dme1119a/scenario";
import { dmeParameterFieldCatalog, getDmeParameterValue } from "@/lib/dme1119a/config";
import { hydrateDme1119aData } from "@/lib/simulator-config/dme-1119a";
import { dme1119aScenarioGroupPath } from "@/components/dme/dme-scenario-field-groups";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";

beforeEach(() => {
  useDmePmdtStore.getState().reset();
  useDmePmdtStore.getState().setScenarioAuthoringEnabled(true);
  useDmePmdtStore.getState().replaceScenarioDraft(createDefaultDme1119aScenarioDefinition());
});

it("organizes DME permissions by native Configuration tabs without cloning DVOR transmitter fields", () => {
  render(<Dme1119aScenarioParametersPanel />);
  const policy = screen.getByRole("region", { name: "Student recovery controls" });
  function group(name: string) {
    const details = within(policy).getByRole("group", { name, hidden: true });
    fireEvent.click(details.querySelector("summary")!);
    return details;
  }
  group("Transmitters");
  group("Transmitters → Configuration");
  group("Transmitters → Configuration → Nominal");
  const rtc = group("Transmitters → Configuration → Nominal → RTC Parameters");
  expect(within(rtc).getByRole("checkbox", { name: "Power output" })).toBeInTheDocument();
  group("Transmitters → Configuration → Offsets and Scale Factors");
  const tx1 = group("Transmitters → Configuration → Offsets and Scale Factors → Transmitter 1");
  expect(within(tx1).getByRole("checkbox", { name: "TX1 power output scale" })).toBeInTheDocument();
  expect(within(tx1).queryByRole("checkbox", { name: "TX2 power output scale" })).not.toBeInTheDocument();
});

it("uses the same menu tree for examiner initial configuration and stages changes only in the scenario draft", () => {
  render(<Dme1119aScenarioParametersPanel />);
  const initial = screen.getByRole("region", { name: "Starting policy" });
  fireEvent.click(within(initial).getByText("Cấu hình ban đầu / Scenario configuration"));
  for (const path of ["Transmitters", "Transmitters → Configuration", "Transmitters → Configuration → Nominal", "Transmitters → Configuration → Nominal → RTC Parameters"]) {
    const group = within(initial).getByRole("group", { name: path, hidden: true });
    fireEvent.click(group.querySelector("summary")!);
  }
  const before = useDmePmdtStore.getState();
  const power = within(initial).getByRole("spinbutton", { name: /^Power output/ });
  fireEvent.focus(power);
  fireEvent.change(power, { target: { value: "-1.25" } });
  fireEvent.blur(power);
  expect(getDmeParameterValue(hydrateDme1119aData(useDmePmdtStore.getState().scenarioDraft.configuration), "txConfigNominal.rtcParameters.powerOutput")).toBe(-1.25);
  expect(useDmePmdtStore.getState().data).toBe(before.data);
  expect(useDmePmdtStore.getState().configDraft).toBe(before.configDraft);
});

it("retains every baseline field and permission once, selected IDs and protected runtime guards", () => {
  const draft = createDefaultDme1119aScenarioDefinition();
  const ids = ["txOffsets.0.tx1", "monitorOffsets.monitor2.0.standby", "rmsConfigStation.channelNumber"];
  draft.editPolicy = { mode: "restricted", allowedFieldIds: [...ids] };
  draft.studentEditableFieldIds = [...ids];
  useDmePmdtStore.getState().replaceScenarioDraft(draft);
  const before = useDmePmdtStore.getState();
  render(<Dme1119aScenarioParametersPanel />);
  const expected = dmeParameterFieldCatalog.filter((field) => !field.readOnly && !field.id.startsWith("simulation.") && !field.id.startsWith("securityAccounts.") && !["connected", "local", "alert", "timestamp"].includes(field.id));
  const policy = screen.getByRole("region", { name: "Student recovery controls" });
  const inputs = Array.from(policy.querySelectorAll<HTMLInputElement>("[data-scenario-policy-field-id]"));
  expect(inputs.map((input) => input.dataset.scenarioPolicyFieldId).sort()).toEqual(expected.map((field) => field.id).sort());
  for (const input of inputs) {
    const id = input.dataset.scenarioPolicyFieldId!;
    expect(input.checked, id).toBe(ids.includes(id));
    expect(input.disabled, id).toBe(dme1119aScenarioFieldRole(id) !== "student-operable");
  }
  const baseline = screen.getByRole("region", { name: "Starting policy" }).querySelectorAll(".pmdt-config-field");
  expect(Array.from(baseline).map((field) => field.getAttribute("for")).sort()).toEqual(expected.map((field) => `dme-scenario-${field.id.replace(/[^A-Za-z0-9_-]/g, "-")}`).sort());
  const selected = policy.querySelector<HTMLInputElement>('[data-scenario-policy-field-id="txOffsets.0.tx1"]')!;
  fireEvent.click(selected);
  const explicit = useDmePmdtStore.getState().scenarioDraft.studentEditableFieldIds;
  expect(explicit).not.toContain("txOffsets.0.tx1");
  const mode = within(policy).getByRole("combobox", { name: "Chế độ / Edit policy" });
  fireEvent.change(mode, { target: { value: "open" } });
  for (const input of inputs) expect(input).toBeDisabled();
  fireEvent.change(mode, { target: { value: "restricted" } });
  const after = useDmePmdtStore.getState();
  expect(after.scenarioDraft.editPolicy).toEqual({ mode: "restricted", allowedFieldIds: explicit });
  expect(after.scenarioDraft.configuration).toEqual(draft.configuration);
  expect(after.scenarioDraft.faultInjections).toEqual(draft.faultInjections);
  expect(after.scenarioDraft.successCriteria).toEqual(draft.successCriteria);
  expect(after.data).toBe(before.data);
  expect(parseDme1119aScenarioDefinition(JSON.parse(JSON.stringify(after.scenarioDraft)))).toEqual(after.scenarioDraft);
});

it("uses DME-specific menu locations and separates fields without native editing controls", () => {
  const groups: Record<string, readonly string[]> = {
    "rmsConfigStation.channelNumber": ["RMS", "Configuration", "Station"],
    "rmsConfigGeneral.votingLogic": ["RMS", "Configuration", "General", "Monitor/LCU Configuration"],
    "rmsVoltageData.0.enabled": ["RMS", "Configuration", "Power Supply Limits", "Volts"],
    "rmsTemperatureData.4.enabled": ["RMS", "Configuration", "A/D Limits", "Temperature"],
    "monitorTimers.noIdent": ["Monitors", "Configuration", "Alarm Limits", "Timers"],
    "monitorSystemSettings.directionalCouplerLoss": ["Monitors", "Configuration", "Alarm Limits", "System-Level Settings"],
    "monitorOffsets.monitor2.0.standby": ["Monitor 2", "Offsets and Scale Factors", "Standby"],
  };
  for (const [id, expected] of Object.entries(groups)) expect(dme1119aScenarioGroupPath(dmeParameterFieldCatalog.find((field) => field.id === id)!)).toEqual(expected);
  for (const id of ["rmsTemperatureData.3.enabled", "rmsConfigGeneral.spiFilterType", "alarmLimits.0.alarmLow", "monitorConfigGeneral.0.primary", "txConfigNominal.ident.selfKeyOnLoss", "monitorTransmitterStatus.mainSelect"]) {
    expect(dme1119aScenarioGroupPath(dmeParameterFieldCatalog.find((field) => field.id === id)!)[0]).toBe("Tham số mô phỏng");
  }
});
