function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
/**
 * Config payloads are JSONB, so validate their structure before casting them
 * back to a simulator-specific TypeScript type. The reference value is the
 * current code default and also provides a lightweight schema for version 1.
 */
export function hasSameJsonShape(value: unknown, reference: unknown): boolean {
  if (Array.isArray(reference)) {
    return (
      Array.isArray(value) &&
      value.length === reference.length &&
      value.every((item, index) => hasSameJsonShape(item, reference[index]))
    );
  }

  if (isRecord(reference)) {
    if (!isRecord(value)) return false;
    const referenceKeys = Object.keys(reference);
    const valueKeys = Object.keys(value);
    return (
      referenceKeys.length === valueKeys.length &&
      referenceKeys.every(
        (key) => Object.hasOwn(value, key) && hasSameJsonShape(value[key], reference[key]),
      )
    );
  }

  if (reference === null) return value === null;
  if (typeof reference === "number") return typeof value === "number" && Number.isFinite(value);
  return typeof value === typeof reference;
}
