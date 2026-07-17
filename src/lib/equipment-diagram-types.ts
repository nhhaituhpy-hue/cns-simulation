export type EquipmentLinkKind = "rf" | "modulation" | "control" | "monitor" | "power" | "data";

export interface EquipmentPoint {
  x: number;
  y: number;
}

export interface EquipmentComponent {
  id: string;
  diagramId: string;
  subsystem: string;
  name: string;
  shortName: string;
  functionDescription: string;
  position: EquipmentPoint;
  size?: { width: number; height: number };
}

export interface EquipmentGroup {
  id: string;
  label: string;
  bounds: EquipmentPoint & { width: number; height: number };
}

export interface EquipmentLink {
  id: string;
  fromComponentId: string;
  toComponentId: string;
  kind: EquipmentLinkKind;
  label?: string;
  labelPosition?: EquipmentPoint;
  route?: EquipmentPoint[];
  direction?: "forward" | "reverse" | "bidirectional" | "none";
}

export interface EquipmentDiagram {
  id: string;
  title: string;
  components: EquipmentComponent[];
  links: EquipmentLink[];
  groups?: EquipmentGroup[];
  canvas?: { widthRem: number; heightRem: number };
  description?: string;
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
  const linkIds = diagrams.flatMap((diagram) => diagram.links.map((link) => link.id));
  const validPoint = (point: EquipmentPoint) =>
    Number.isFinite(point.x) && Number.isFinite(point.y) &&
    point.x >= 0 && point.x <= 100 && point.y >= 0 && point.y <= 100;
  return (
    ids.size === allComponents.length &&
    new Set(linkIds).size === linkIds.length &&
    diagrams.every((diagram) => {
      const diagramComponentIds = new Set(diagram.components.map((component) => component.id));
      return (
        diagram.components.every((component) =>
          component.diagramId === diagram.id &&
          validPoint(component.position) &&
          (!component.size || (
            component.size.width > 0 && component.size.height > 0 &&
            component.size.width <= 100 && component.size.height <= 100
          )),
        ) &&
        diagram.links.every((link) =>
          diagramComponentIds.has(link.fromComponentId) &&
          diagramComponentIds.has(link.toComponentId) &&
          (!link.route || (link.route.length >= 2 && link.route.every(validPoint))) &&
          (!link.labelPosition || validPoint(link.labelPosition)),
        )
      );
    })
  );
}
