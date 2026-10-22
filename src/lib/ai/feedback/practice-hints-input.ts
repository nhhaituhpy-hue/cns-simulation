import { isRecord, sanitizeScenarioExamPayload } from "@/lib/scenario-exams/results";
import { sensitiveText } from "../scenario-blueprint/validation";
/** Shared client/server sanitizer. Bounds are enforced before traversal by API. */
export function sanitizePracticeHintPayload(value: unknown): unknown {
  const cleaned = sanitizeScenarioExamPayload(value);
  const visit = (v: unknown, depth: number): unknown => {
    if (depth > 24) return null;
    if (typeof v === "string") return sensitiveText(v) ? "[Nội dung nhạy cảm đã loại]" : v;
    if (Array.isArray(v)) return v.slice(0, 2000).map(x => visit(x, depth + 1));
    if (!isRecord(v)) return v;
    return Object.fromEntries(Object.entries(v).filter(([key]) => !/accounts?|credential|login|source|rubric|definition|__proto__|constructor|prototype/i.test(key)).map(([key, x]) => [key, visit(x, depth + 1)]));
  };
  return visit(cleaned, 0);
}
