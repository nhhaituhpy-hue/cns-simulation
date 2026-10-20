import type { ScenarioParametersDefinition, ScenarioParametersModuleId } from "@/lib/scenario-parameters";

export type ParameterValue = string | number | boolean | null;
export interface ScenarioParameterField {
  /** An exact server-owned identifier; never accept arbitrary model paths. */
  id: string;
  label: string;
  group: "configuration" | "startup" | "fault" | "success" | "policy" | "sensor";
  type: "number" | "boolean" | "enum" | "text";
  value: ParameterValue;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: readonly string[];
  recovery: boolean;
}
export interface ParameterAssignment { fieldId: string; value: ParameterValue }
export interface ParameterCheck { id: string; passed: boolean; detail: string }
export interface ParameterVerification {
  mode: "engine-recovery" | "native-diagnosis" | "native-action-replay";
  initial: ParameterCheck[];
  recovered: ParameterCheck[];
  recoveryVerified: boolean;
  notes: string[];
}
export interface ScenarioParameterAdapter {
  fields(moduleId: ScenarioParametersModuleId, definition: ScenarioParametersDefinition): ScenarioParameterField[];
  apply(moduleId: ScenarioParametersModuleId, definition: ScenarioParametersDefinition, changes: readonly ParameterAssignment[]): ScenarioParametersDefinition;
  verify(moduleId: ScenarioParametersModuleId, definition: ScenarioParametersDefinition, recovery: readonly ParameterAssignment[]): ParameterVerification;
}
