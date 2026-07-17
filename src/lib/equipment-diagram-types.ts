export type EquipmentLinkKind = "rf" | "control" | "monitor" | "power" | "data";

export interface EquipmentComponent {
  id: string;
  diagramId: string;
  subsystem: string;
  name: string;
  shortName: string;
  functionDescription: string;
  position: { x: number; y: number };
}
export interface EquipmentLink {
  id: string;
  fromComponentId: string;
  toComponentId: string;
  kind: EquipmentLinkKind;
  label?: string;
}

export interface EquipmentDiagram {
  id: string;
  title: string;
  components: EquipmentComponent[];
  links: EquipmentLink[];
}

export interface HardwareDiagnosisTask {
  expectedComponentIds: string[];
  faultType: string;
  adminNote: string;
}

export interface HardwareDiagnosisAnswer {
  selectedComponentIds: string[];
  reasoning: string;
  inspectedComponentIds: string[];
  completedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isHardwareDiagnosisTask(value: unknown): value is HardwareDiagnosisTask {
  return (
    isRecord(value) &&
    Array.isArray(value.expectedComponentIds) &&
    value.expectedComponentIds.length > 0 &&
    value.expectedComponentIds.every((item) => typeof item === "string" && item.length > 0) &&
    typeof value.faultType === "string" &&
    typeof value.adminNote === "string"
  );
}

export function isHardwareDiagnosisAnswer(value: unknown): value is HardwareDiagnosisAnswer {
  return (
    isRecord(value) &&
    Array.isArray(value.selectedComponentIds) &&
    value.selectedComponentIds.length > 0 &&
    value.selectedComponentIds.every((item) => typeof item === "string" && item.length > 0) &&
    typeof value.reasoning === "string" &&
    Array.isArray(value.inspectedComponentIds) &&
    value.inspectedComponentIds.every((item) => typeof item === "string") &&
    typeof value.completedAt === "string"
  );
}

export function validateEquipmentDiagrams(diagrams: readonly EquipmentDiagram[]): boolean {
  const allComponents = diagrams.flatMap((diagram) => diagram.components);
  const ids = new Set(allComponents.map((component) => component.id));
  return (
    ids.size === allComponents.length &&
    diagrams.every((diagram) =>
      diagram.components.every((component) => component.diagramId === diagram.id) &&
      diagram.links.every((link) => ids.has(link.fromComponentId) && ids.has(link.toComponentId)),
    )
  );
}
