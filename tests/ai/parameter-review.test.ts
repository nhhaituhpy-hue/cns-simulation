import { describe, expect, it } from "vitest";
import { readParameterReview } from "@/lib/ai/scenario-generation/parameter-review";

const parameters = () => ({
  version: 2,
  initial: [{ fieldId: "config.carrierPower", label: "Công suất sóng mang", value: 18, unit: "W", citation: 1, privatePath: "/private/manual" }],
  recovery: [{ fieldId: "config.carrierPower", value: 100, unit: "W", citation: 2 }],
  verification: {
    mode: "engine-recovery", initial: [{ id: "alarm", passed: true, detail: "Có cảnh báo ban đầu", raw: "secret" }],
    recovered: [{ id: "alarm", passed: true, detail: "Kiểm tra khôi phục đạt" }], recoveryVerified: true, notes: ["Chỉ kiểm tra trong simulator."], workerKey: "secret",
  },
  configuredFieldCount: 12, workerKey: "secret", citations: [{ path: "/private/manual" }],
});

describe("readParameterReview", () => {
  it("projects only the persisted examiner parameter summary without mutating it", () => {
    const input = parameters();
    const snapshot = structuredClone(input);
    expect(readParameterReview(input)).toEqual({
      version: 2,
      initial: [{ fieldId: "config.carrierPower", label: "Công suất sóng mang", value: 18, unit: "W" }],
      recovery: [{ fieldId: "config.carrierPower", value: 100, unit: "W" }],
      verification: { mode: "engine-recovery", initial: [{ id: "alarm", passed: true, detail: "Có cảnh báo ban đầu" }], recovered: [{ id: "alarm", passed: true, detail: "Kiểm tra khôi phục đạt" }], recoveryVerified: true, notes: ["Chỉ kiểm tra trong simulator."] },
    });
    expect(input).toEqual(snapshot);
    expect(JSON.stringify(readParameterReview(input))).not.toMatch(/configuredFieldCount|citation|privateStorageKey|providerSecret/);
  });
});

it.each([
  null, undefined, [], "legacy", {}, { ...parameters(), version: 1 },
  { ...parameters(), initial: [{ fieldId: "x", value: Infinity }] },
  { ...parameters(), initial: [{ fieldId: "x", value: NaN }] },
  { ...parameters(), initial: [{ fieldId: "x", value: { private: "secret" } }] },
  { ...parameters(), recovery: [{ fieldId: "", value: 1 }] },
  { ...parameters(), initial: [{ fieldId: "x".repeat(200), value: 1 }] },
  { ...parameters(), initial: [{ fieldId: "x", value: "x".repeat(200) }] },
  { ...parameters(), initial: [{ fieldId: "x", value: 1, label: "x".repeat(200) }] },
  { ...parameters(), initial: [{ fieldId: "x", value: 1, unit: 4 }] },
  { ...parameters(), initial: Array.from({ length: 25 }, () => ({ fieldId: "x", value: 1 })) },
  { ...parameters(), verification: { ...parameters().verification, mode: "certified-aircraft" } },
  { ...parameters(), verification: { ...parameters().verification, recoveryVerified: "true" } },
  { ...parameters(), verification: { ...parameters().verification, initial: [{ id: "x", passed: 1, detail: "x" }] } },
  { ...parameters(), verification: { ...parameters().verification, recovered: Array.from({ length: 33 }, () => ({ id: "x", passed: true, detail: "x" })) } },
  { ...parameters(), verification: { ...parameters().verification, notes: Array(10).fill("note") } },
  { ...parameters(), verification: { ...parameters().verification, notes: ["x".repeat(300)] } },
  { ...parameters(), verification: { ...parameters().verification, initial: [{ id: "x", passed: true, detail: "x".repeat(300) }] } },
  { ...parameters(), configuredFieldCount: -1 }, { ...parameters(), configuredFieldCount: 1.5 },
])("fails closed for malformed or unbounded persisted summaries (%#)", (input) => {
  expect(readParameterReview(input)).toBeNull();
});

it.each(["engine-recovery", "native-diagnosis", "native-action-replay"])("keeps honest %s verification flags without deriving a success claim", (mode) => {
  const input = { ...parameters(), initial: [{ fieldId: "enabled", value: false }, { fieldId: "policy", value: "locked" }, { fieldId: "optional", value: null }], verification: { ...parameters().verification, mode, recoveryVerified: false, recovered: [{ id: "remaining", passed: false, detail: "Còn cảnh báo" }] } };
  const review = readParameterReview(input);
  expect(review?.verification.mode).toBe(mode);
  expect(review?.verification.recoveryVerified).toBe(false);
  expect(review?.verification.recovered[0].passed).toBe(false);
  expect(review?.initial.map((row) => row.value)).toEqual([false, "locked", null]);
  expect(readParameterReview(review)).toEqual(review);
});

it("accepts the documented bounded summary limits without sharing mutable arrays", () => {
  const rows = Array.from({ length: 24 }, (_, index) => ({ fieldId: `field-${index}`, value: "v".repeat(199), label: "l".repeat(199), unit: "u".repeat(199) }));
  const checks = Array.from({ length: 32 }, (_, index) => ({ id: `check-${index}`, passed: false, detail: "d".repeat(299) }));
  const input = { ...parameters(), initial: rows, recovery: rows, verification: { ...parameters().verification, initial: checks, recovered: checks, notes: Array(9).fill("n".repeat(299)) } };
  const review = readParameterReview(input)!;
  expect(review.initial).toHaveLength(24);
  expect(review.recovery).toHaveLength(24);
  expect(review.verification.initial).toHaveLength(32);
  expect(review.verification.notes).toHaveLength(9);
  review.initial[0].value = "changed";
  review.verification.initial[0].passed = true;
  review.verification.notes.push("changed");
  expect(input.initial[0].value).toBe("v".repeat(199));
  expect(input.verification.initial[0].passed).toBe(false);
  expect(input.verification.notes).toHaveLength(9);
});

it("returns null instead of throwing for a hostile non-JSON object", () => {
  const input = Object.defineProperty({}, "version", { get() { throw new Error("private diagnostic"); } });
  expect(readParameterReview(input)).toBeNull();
});
