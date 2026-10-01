import { DVOR_BLOCKS, dvorHardwareOccurrenceKey } from "@/modules/devices/dvor-1150a/block-diagram-data";
import { DVOR_1150_BLOCKS, dvor1150HardwareOccurrenceKey } from "@/modules/devices/dvor-1150/block-diagram-data";
import { DME_1119A_BLOCKS, dme1119aHardwareOccurrenceKey } from "@/modules/devices/dme-1119a/block-diagram-data";
import type { Dvor1150aScenarioDefinition } from "@/lib/dvor1150a/scenario";
import type { Dvor1150ScenarioDefinition } from "@/lib/dvor1150/scenario";
import type { Dme1119aScenarioDefinition } from "@/lib/dme1119a/scenario";
import type { ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import type { ScenarioExamReviewSubject } from "./types";

export interface ExamHardwareItem { key: string; label: string; position: string; known: boolean; matchesReference?: boolean }
export interface ExamHardwareEvidence {
  selected: ExamHardwareItem[];
  inspected: ExamHardwareItem[];
  expected: ExamHardwareItem[];
  reasoning: string;
  softwareOnly: boolean;
  dispositionConfirmed: boolean;
  hasEvidence: boolean;
  hasReference: boolean;
  verified: boolean;
  passed: boolean;
  referenceCriterionIds: string[];
}

/** Resolve saved identities to card/slot names; never match a card by name alone. */
export function describeExamHardwareSelection(key: string, moduleId: ScenarioParametersModuleId): ExamHardwareItem {
  const unknown = { key, label: "Khối/card chưa nhận diện được", position: "Xem mã đã lưu trong Chi tiết kỹ thuật", known: false };
  const parts = key.split("::");
  if (parts.length !== 3) return unknown;
  const [blockId, occurrenceId, cabinetIds] = parts;
  if (moduleId === "dvor-1150a") {
    const block = DVOR_BLOCKS.find((entry) => entry.id === blockId);
    const occurrence = block?.diagramHotspots.find((entry) => entry.id === occurrenceId);
    const cabinet = block?.cabinetHotspots.find((entry) => entry.id === cabinetIds);
    if (!block || !occurrence || (cabinetIds !== "none" && !cabinet) || (occurrence.targetCabinetHotspotId ?? "none") !== cabinetIds) return unknown;
    return { key, label: occurrence.label || block.shortName, position: cabinet?.label ?? "Ngoài tủ thiết bị", known: true };
  }
  const blocks = moduleId === "dvor-1150" ? DVOR_1150_BLOCKS : moduleId === "dme-1119a" ? DME_1119A_BLOCKS : [];
  const block = blocks.find((entry) => entry.id === blockId);
  const occurrence = block?.diagramOccurrences.find((entry) => entry.id === occurrenceId);
  if (!block || !occurrence) return unknown;
  const ids = cabinetIds === "none" ? [] : cabinetIds.split(",");
  const cabinets = ids.map((id) => block.cabinetHotspots.find((entry) => entry.id === id));
  if (cabinets.some((entry) => !entry) || ids.length !== occurrence.targetCabinetHotspotIds.length || ids.some((id) => !occurrence.targetCabinetHotspotIds.includes(id))) return unknown;
  return { key, label: "label" in occurrence && typeof occurrence.label === "string" ? occurrence.label : block.shortName,
    position: cabinets.length ? cabinets.map((entry) => entry!.assemblyId).join(" · ") : "Ngoài tủ thiết bị", known: true };
}

function strings(value: unknown): string[] { return Array.isArray(value) ? [...new Set(value.filter((entry): entry is string => typeof entry === "string"))] : []; }

export function presentExamHardwareEvidence(subject: ScenarioExamReviewSubject): ExamHardwareEvidence | null {
  const { moduleId, definition } = subject;
  const payload = subject.result?.payload;
  if (!payload || !["dvor-1150", "dvor-1150a", "dme-1119a", "ads-b"].includes(moduleId)) return null;
  let expectedKeys: string[] = [];
  let softwareOnly = false;
  let hasReference = false;
  let referenceCriterionIds: string[] = [];
  if (moduleId === "dvor-1150a" && definition) {
    const diagnosis = (definition as Dvor1150aScenarioDefinition).diagnosis;
    if (diagnosis) { expectedKeys = diagnosis.expectedHardware.map(dvorHardwareOccurrenceKey); softwareOnly = diagnosis.disposition === "software-adjustment"; hasReference = true; }
  } else if (moduleId === "dvor-1150" && definition) {
    const diagnosis = (definition as Dvor1150ScenarioDefinition).diagnosis;
    if (diagnosis) { expectedKeys = diagnosis.expectedHardware.map(dvor1150HardwareOccurrenceKey); softwareOnly = diagnosis.disposition === "software-adjustment"; hasReference = true; }
  } else if (moduleId === "dme-1119a" && definition) {
    const scenario = definition as Dme1119aScenarioDefinition;
    if (scenario.diagnosis) {
      expectedKeys = scenario.diagnosis.expectedHardware.map(dme1119aHardwareOccurrenceKey);
      softwareOnly = scenario.diagnosis.disposition === "software-adjustment";
      hasReference = true;
      if (!softwareOnly) referenceCriterionIds = scenario.successCriteria.map((criterion) => criterion.id);
    }
  } else if (moduleId === "ads-b" && definition && "hardwareFault" in definition && definition.hardwareFault) {
    expectedKeys = [...definition.hardwareFault.faultyComponentIds];
    hasReference = true;
  }
  // Selex replacement workflows use the saved PMDT diagnosis and exact card
  // selection; operating alarms are reference readings until hardware is repaired.
  if (hasReference && !softwareOnly && moduleId.startsWith("dvor-1150")) referenceCriterionIds = ["integral-monitor", "active-transmitter", "sideband-vswr", "vswr-executive", "monitor-bypass"];

  const verified = Boolean(subject.technicalSummary && subject.technicalSummary.status !== "UNVERIFIED");
  function describe(key: string): ExamHardwareItem {
    if (moduleId === "ads-b" && definition && "hardwareFault" in definition) {
      const component = definition.hardwareFault?.hardwareLayout.find((entry) => entry.id === key);
      return { key, label: component?.name ?? "Khối/card chưa nhận diện được", position: component ? "Sơ đồ phần cứng ADS-B" : "Xem mã đã lưu trong Chi tiết kỹ thuật", known: Boolean(component) };
    }
    return describeExamHardwareSelection(key, moduleId);
  }
  const selectedKeys = strings(payload.scenarioHardwareSelection ?? payload.diagnosedComponentIds);
  const expectedSet = new Set(expectedKeys);
  const selected = selectedKeys.map((key) => ({ ...describe(key), ...(hasReference && verified ? { matchesReference: expectedSet.has(key) && !softwareOnly } : {}) }));
  const dispositionConfirmed = payload.scenarioHardwareDispositionConfirmed === true;
  const hasEvidence = selected.length > 0 || (softwareOnly && dispositionConfirmed);
  const hardwareCheck = subject.technicalSummary?.checks.find((check) => check.id === "hardware-selection" || check.id === "hardware");
  return { selected, inspected: strings(payload.scenarioHardwareInspected ?? payload.inspectedComponentIds).map(describe), expected: expectedKeys.map(describe),
    reasoning: typeof payload.scenarioHardwareReasoning === "string" ? payload.scenarioHardwareReasoning : "",
    softwareOnly, dispositionConfirmed, hasEvidence, hasReference, verified,
    passed: Boolean(verified && hasEvidence && hasReference && hardwareCheck?.passed), referenceCriterionIds };
}
