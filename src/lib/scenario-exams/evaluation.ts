import { parseScenarioParameters, type ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import { buildDvor1150aSnapshot, evaluateDvor1150aScenario, validateDvorConfig, type Dvor1150aConfig } from "@/lib/dvor1150a";
import { buildDvor1150Snapshot, evaluateDvor1150Scenario, validateDvor1150Config, type Dvor1150Config } from "@/lib/dvor1150";
import { evaluateDme1119aScenario } from "@/lib/dme1119a/scenario";
import { recomputeDmeDerivedData } from "@/lib/dme1119a/derived-data";
import { extractDme1119aConfig, parseDme1119aConfig } from "@/lib/simulator-config/dme-1119a";
import type { DmePmdtData } from "@/lib/dme-types";
import { evaluateDvor220Scenario } from "@/modules/operations/dvor-220/domain/scenario";
import type { Dvor220DeviceState } from "@/modules/operations/dvor-220/domain/types";
import { evaluateDme320Scenario } from "@/modules/operations/dme-320/domain/scenario";
import type { Dme320SimulationState } from "@/modules/operations/dme-320/domain/types";
import { gradeActions, gradeHardwareSelection } from "@/lib/grading";
import type { RecordedAction } from "@/lib/types";
import { isRecord } from "./results";
import type { ScenarioExamTechnicalSummary } from "./types";

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}
function evidence(payload: Record<string, unknown>) {
  const events = Array.isArray(payload.attemptEvents) ? payload.attemptEvents.filter(isRecord) : [];
  const actions = Array.isArray(payload.actionHistory) ? payload.actionHistory.filter(isRecord) : [];
  return { visitedViewIds: [...strings(payload.visitedViewIds), ...events.flatMap((event) => typeof event.viewId === "string" ? [event.viewId] : [])],
    acceptedActionControlIds: [...strings(payload.acceptedActionControlIds), ...actions.flatMap((event) => event.accepted === true && typeof event.controlId === "string" ? [event.controlId] : [])],
    selectedHardwareOccurrenceKeys: strings(payload.scenarioHardwareSelection), hardwareDispositionConfirmed: payload.scenarioHardwareDispositionConfirmed === true };
}
function summary(evaluation: { solved: boolean; checks: ScenarioExamTechnicalSummary["checks"]; blockers: string[]; pmdtComplete?: boolean; hardwareComplete?: boolean }): ScenarioExamTechnicalSummary {
  return { status: evaluation.solved ? "SOLVED" : "IN_PROGRESS", solved: evaluation.solved, checks: evaluation.checks,
    blockers: evaluation.blockers, ...(evaluation.pmdtComplete !== undefined ? { pmdtComplete: evaluation.pmdtComplete } : {}),
    ...(evaluation.hardwareComplete !== undefined ? { hardwareComplete: evaluation.hardwareComplete } : {}) };
}

/** Recompute from the assigned definition and saved state; ignore client SOLVED/score claims. */
export function evaluateScenarioExamResult(moduleId: ScenarioParametersModuleId, definitionValue: unknown, payload: Record<string, unknown> | null): ScenarioExamTechnicalSummary {
  const unverified: ScenarioExamTechnicalSummary = { status: "UNVERIFIED", solved: null, checks: [], blockers: ["Chưa đủ dữ liệu hợp lệ để đánh giá trạng thái kỹ thuật."] };
  if (!payload) return unverified;
  try {
    const checkpoint = isRecord(payload.checkpoint) ? payload.checkpoint : {};
    const observed = evidence(payload);
    if (moduleId === "dvor-1150a") {
      const definition = parseScenarioParameters(moduleId, definitionValue);
      if (!definition || !isRecord(checkpoint.config)) return unverified;
      const config = checkpoint.config as unknown as Dvor1150aConfig;
      if (validateDvorConfig(config).length) return unverified;
      return summary(evaluateDvor1150aScenario({ active: true, definition, startedAt: null }, buildDvor1150aSnapshot(config), config, observed));
    }
    if (moduleId === "dvor-1150") {
      const definition = parseScenarioParameters(moduleId, definitionValue);
      if (!definition || !isRecord(checkpoint.config)) return unverified;
      const config = checkpoint.config as unknown as Dvor1150Config;
      if (validateDvor1150Config(config).length) return unverified;
      return summary(evaluateDvor1150Scenario({ active: true, definition, startedAt: null }, buildDvor1150Snapshot(config), config, observed));
    }
    if (moduleId === "dme-1119a") {
      const definition = parseScenarioParameters(moduleId, definitionValue);
      if (!definition || !isRecord(checkpoint.data)) return unverified;
      const data = checkpoint.data as unknown as DmePmdtData;
      if (!parseDme1119aConfig(extractDme1119aConfig(data))) return unverified;
      return summary(evaluateDme1119aScenario({ active: true, definition, startedAt: null }, recomputeDmeDerivedData(data), observed));
    }
    if (moduleId === "dvor-220") {
      const definition = parseScenarioParameters(moduleId, definitionValue);
      if (!definition || !isRecord(payload.device) || !isRecord(payload.device.configuration)) return unverified;
      const device = { ...payload.device, scenario: { active: true, definition } } as unknown as Dvor220DeviceState;
      return summary(evaluateDvor220Scenario(device));
    }
    if (moduleId === "dme-320") {
      const definition = parseScenarioParameters(moduleId, definitionValue);
      if (!definition || !isRecord(payload.simulation) || !isRecord(payload.simulation.config)) return unverified;
      const state = { ...payload.simulation, scenario: { active: true, definition } } as unknown as Dme320SimulationState;
      return summary(evaluateDme320Scenario(state));
    }
    const definition = parseScenarioParameters("ads-b", definitionValue);
    if (!definition || !Array.isArray(payload.selectedActions)) return unverified;
    const actions = payload.selectedActions.filter((entry): entry is RecordedAction => isRecord(entry) && typeof entry.kind === "string" && typeof entry.menuId === "string" && typeof entry.input === "string");
    const terminal = gradeActions(definition.expectedActions, actions);
    const hardware = gradeHardwareSelection(definition.hardwareFault?.faultyComponentIds ?? [], strings(payload.scenarioHardwareSelection ?? payload.diagnosedComponentIds));
    const checks = [
      { id: "authentication", label: "Đăng nhập đúng", passed: payload.authenticatedCorrectly === true, detail: payload.authenticatedCorrectly === true ? "Đạt" : "Chưa xác nhận" },
      { id: "terminal", label: "Thao tác Terminal", passed: terminal.passed, detail: `${terminal.score}/100` },
      { id: "qcms", label: "Kiểm tra QCMS", passed: payload.qcmsMonitoringOpened === true, detail: payload.qcmsMonitoringOpened === true ? "Đã kiểm tra" : "Chưa kiểm tra" },
      ...(definition.hardwareFault ? [{ id: "hardware", label: "Lựa chọn phần cứng", passed: hardware.exactMatch, detail: hardware.exactMatch ? "Đúng khối/card" : "Chưa khớp" }] : []),
    ];
    return summary({ solved: checks.every((check) => check.passed), checks, blockers: [] });
  } catch {
    return unverified;
  }
}
