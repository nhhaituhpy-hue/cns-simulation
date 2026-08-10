function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function collectChangedConfigFields(
  previous: unknown,
  next: unknown,
): string[] {
  const changed: string[] = [];

  function visit(left: unknown, right: unknown, path: string): void {
    if (Object.is(left, right)) return;

    if (Array.isArray(left) && Array.isArray(right)) {
      const length = Math.max(left.length, right.length);
      for (let index = 0; index < length; index += 1) {
        visit(left[index], right[index], path ? `${path}.${index}` : String(index));
      }
      return;
    }

    if (isRecord(left) && isRecord(right)) {
      const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
      for (const key of keys) {
        visit(left[key], right[key], path ? `${path}.${key}` : key);
      }
      return;
    }

    changed.push(path || "config");
  }

  visit(previous, next, "");
  return changed;
}
