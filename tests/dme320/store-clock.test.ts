import { describe, expect, it } from "vitest";
import { createDme320Store } from "@/modules/operations/dme-320/store/dme320-store";

describe("DME 320 injected simulation clock", () => {
  it("initializes and synchronizes deterministically from the injected clock", () => {
    let clockNow = 10_000;
    const store = createDme320Store({
      clock: { now: () => clockNow },
    });

    expect(store.getState().simulation.nowMs).toBe(10_000);

    clockNow = 12_500;
    const result = store.getState().syncToClock();
    expect(result.accepted).toBe(true);
    expect(store.getState().simulation.nowMs).toBe(12_500);

    clockNow = 12_000;
    const backwards = store.getState().syncToClock();
    expect(backwards.accepted).toBe(false);
    expect(backwards.message).toContain("finite future timestamp");
    expect(store.getState().simulation.nowMs).toBe(12_500);
  });

  it("rejects invalid elapsed time without mutating simulation state", () => {
    const store = createDme320Store({ initialNowMs: 1_000 });
    const initial = store.getState().simulation;

    const negative = store.getState().advanceBy(-1);
    const infinite = store.getState().advanceBy(Number.POSITIVE_INFINITY);

    expect(negative.accepted).toBe(false);
    expect(infinite.accepted).toBe(false);
    expect(store.getState().simulation).toBe(initial);
    expect(store.getState().simulation.nowMs).toBe(1_000);
  });

  it("reports a missing clock and uses the injected clock when reset", () => {
    const withoutClock = createDme320Store({ initialNowMs: 500 });
    const missing = withoutClock.getState().syncToClock();
    expect(missing.accepted).toBe(false);
    expect(missing.message).toBe("No simulation clock was injected.");
    expect(withoutClock.getState().simulation.nowMs).toBe(500);

    let clockNow = 2_000;
    const withClock = createDme320Store({ clock: { now: () => clockNow } });
    clockNow = 9_000;
    withClock.getState().reset();
    expect(withClock.getState().simulation.nowMs).toBe(9_000);
    expect(withClock.getState().lastCommandResult).toBeNull();
  });
});
