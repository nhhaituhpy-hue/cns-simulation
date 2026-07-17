import type {
  HardwareDiagnosisAnswer,
  HardwareDiagnosisTask,
} from "./equipment-diagram-types";

export type EquipmentModule = "vor" | "dme";

const legacyComponentMap: Record<EquipmentModule, Record<string, readonly string[]>> = {
  vor: {
    "vor-sideband-amp-1": [
      "vor-tx1-sideband-1",
      "vor-tx1-sideband-2",
      "vor-tx1-sideband-3",
      "vor-tx1-sideband-4",
    ],
    "vor-sideband-amp-2": [
      "vor-tx2-sideband-1",
      "vor-tx2-sideband-2",
      "vor-tx2-sideband-3",
      "vor-tx2-sideband-4",
    ],
    "vor-sideband-switch": [
      "vor-sideband-switch-1",
      "vor-sideband-switch-2",
      "vor-sideband-switch-3",
      "vor-sideband-switch-4",
    ],
  },
  dme: {
    "dme-bcps": ["dme-bcps-1", "dme-bcps-2"],
  },
};

export function normalizeEquipmentComponentIds(
  module: EquipmentModule,
  componentIds: readonly string[],
): string[] {
  return [...new Set(
    componentIds.flatMap((id) => legacyComponentMap[module][id] ?? [id]),
  )];
}

export function normalizeHardwareDiagnosisTask(
  module: EquipmentModule,
  task: HardwareDiagnosisTask,
): HardwareDiagnosisTask {
  return {
    ...structuredClone(task),
    expectedComponentIds: normalizeEquipmentComponentIds(module, task.expectedComponentIds),
  };
}

export function normalizeHardwareDiagnosisAnswer(
  module: EquipmentModule,
  answer: HardwareDiagnosisAnswer,
): HardwareDiagnosisAnswer {
  return {
    ...structuredClone(answer),
    selectedComponentIds: normalizeEquipmentComponentIds(module, answer.selectedComponentIds),
    inspectedComponentIds: normalizeEquipmentComponentIds(module, answer.inspectedComponentIds),
  };
}
