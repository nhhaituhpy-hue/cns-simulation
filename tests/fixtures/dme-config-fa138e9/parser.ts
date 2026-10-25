// Frozen parser from fa138e9; original body unchanged.
import defaults from "./default.json";
import { hasSameJsonShape } from "./shape";
import type { Dme1119aPersistedConfig } from "@/lib/simulator-config/types";
export const getDefaultDme1119aConfig = () => structuredClone(defaults);
export function parseDme1119aConfig(value: unknown): Dme1119aPersistedConfig | null {
  if (!hasSameJsonShape(value, getDefaultDme1119aConfig())) return null;
  return structuredClone(value as Dme1119aPersistedConfig);
}
