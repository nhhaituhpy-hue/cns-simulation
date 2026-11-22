import { describe, expect, it } from "vitest";
import { createDmePmdtStore, formatDmeTimestamp } from "@/stores/dme-pmdt-store";

// The seeded default data timestamp (src/lib/dme-pmdt-defaults.ts). It is a
// fixed fabrication and must never surface as a "Measured:" time.
const SEED_TIMESTAMP = "08/09/26 09:10:05";

describe("DME 1119A measured decoder timestamp (Stage 5 QA seed cleanup)", () => {
  it("stamps the initial snapshot with the session start, not the seeded data timestamp", () => {
    const current = new Date("2026-11-22T08:00:00Z");
    const store = createDmePmdtStore({ now: () => new Date(current) });
    const state = store.getState();

    // The fresh default data still carries the seed — that is exactly what
    // the old baseline copied into the Test Results footer.
    expect(state.data.timestamp).toBe(SEED_TIMESTAMP);

    const sessionStart = formatDmeTimestamp(current);
    expect(sessionStart).not.toBe(SEED_TIMESTAMP);
    expect(state.measuredDecoderResults.monitor1.measuredAt).toBe(sessionStart);
    expect(state.measuredDecoderResults.monitor2.measuredAt).toBe(sessionStart);
  });

  it("re-baselines the footer when a new session is initialized", () => {
    let current = new Date("2026-11-22T08:00:00Z");
    const store = createDmePmdtStore({ now: () => new Date(current) });
    store.getState().refreshClock();

    current = new Date(current.getTime() + 300_000);
    store.getState().initializeSession({ mode: "preview" });

    const state = store.getState();
    expect(state.data.timestamp).toBe(SEED_TIMESTAMP);
    expect(state.measuredDecoderResults.monitor1.measuredAt).toBe(formatDmeTimestamp(current));
    expect(state.measuredDecoderResults.monitor2.measuredAt).toBe(formatDmeTimestamp(current));
  });

  it("still stamps the real run time when a Special Test completes", () => {
    let current = new Date("2026-11-22T08:00:00Z");
    const store = createDmePmdtStore({ now: () => new Date(current) });
    store.getState().refreshClock();
    const tick = (seconds: number) => {
      current = new Date(current.getTime() + seconds * 1000);
      store.getState().refreshClock();
    };

    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    store.getState().setLocalMode(true);
    store.getState().setSpecialTestParameter(1, "decoderTestsEnabled", true);
    expect(store.getState().startSpecialTests()).toBe(true);
    tick(20);

    const state = store.getState();
    expect(state.specialTestRunning).toBe(false);
    // Monitor 1 was measured at the completion tick; Monitor 2 keeps the
    // session-start baseline.
    expect(state.measuredDecoderResults.monitor1.measuredAt).toBe(formatDmeTimestamp(current));
    expect(state.measuredDecoderResults.monitor1.measuredAt).not.toBe(SEED_TIMESTAMP);
    expect(state.measuredDecoderResults.monitor2.measuredAt).toBe(
      formatDmeTimestamp(new Date("2026-11-22T08:00:00Z")),
    );
  });
});
