import { describe, expect, it } from "vitest";
import {
  advanceDvor220Time,
  synchronizeDvor220Clock,
} from "@/modules/operations/dvor-220/domain/engine";
import {
  formatDvor220DateTime,
  formatDvor220Time,
  parseDvor220TimeInput,
  toDvor220TimeInput,
} from "@/modules/operations/dvor-220/domain/time";
import { createDvor220Store } from "@/modules/operations/dvor-220/store/dvor220-store";
import { MOPIENS_ADMIN_TRAINING_ACCOUNT } from "@/lib/simulator-training-accounts";
import { createAuthorizedDvor220State, localEthernetProfile } from "./helpers";

const trainingStartMs = Date.UTC(2026, 7, 10, 1, 0, 0);
const vietnamNowMs = Date.UTC(2026, 10, 19, 17, 30, 0);

describe("DVOR 220 PMDT Time Sync", () => {
  it("sets the clock to Vietnam time without replaying automatic logout", () => {
    let nowMs = trainingStartMs;
    const store = createDvor220Store({ clock: { now: () => nowMs } });
    store.getState().dispatch({ type: "connect", profile: localEthernetProfile });
    const login = store.getState().dispatch({
      type: "login",
      username: MOPIENS_ADMIN_TRAINING_ACCOUNT.userId,
      password: MOPIENS_ADMIN_TRAINING_ACCOUNT.password,
    });
    expect(login.ok).toBe(true);
    const username = MOPIENS_ADMIN_TRAINING_ACCOUNT.userId;
    expect(store.getState().device.session.username).toBe(username);
    const logCount = store.getState().device.history.pmdt.length;

    nowMs = vietnamNowMs;
    store.getState().syncClock();

    const { device } = store.getState();
    expect(device.nowMs).toBe(vietnamNowMs);
    expect(device.session.username).toBe(username);
    expect(device.history.pmdt.slice(logCount).map((row) => row.message))
      .not.toContainEqual(expect.stringMatching(/Automatic logout/));
    expect(formatDvor220DateTime(device.nowMs)).toBe("20/11/2026, 00:30:00");
  });

  it("keeps the remaining time on pending timers across the jump", () => {
    const state = createAuthorizedDvor220State({ nowMs: trainingStartMs, preservePowerOnHoldoff: true });
    const offsetMs = vietnamNowMs - trainingStartMs;
    const synced = synchronizeDvor220Clock(state, vietnamNowMs);

    expect(synced.session.username).toBe(state.session.username);
    expect(synced.session.lastActivityAtMs).toBe(state.session.lastActivityAtMs! + offsetMs);
    expect(synced.session.loggedInAtMs).toBe(state.session.loggedInAtMs! + offsetMs);
    expect(synced.monitorAveraging.nextSampleAtMs).toBe(state.monitorAveraging.nextSampleAtMs + offsetMs);
    expect(synced.executive.powerOnHoldoffUntilMs)
      .toBe(state.executive.powerOnHoldoffUntilMs === null ? null : state.executive.powerOnHoldoffUntilMs + offsetMs);
    expect(synced.history.pmdt).toEqual(state.history.pmdt);

    const logoutMs = synced.configuration.running.system.automaticLogoutMinutes * 60_000;
    expect(advanceDvor220Time(synced, logoutMs - 1).session.username).toBe(state.session.username);
    expect(advanceDvor220Time(synced, logoutMs).session.username).toBeNull();
  });

  it("can move the clock backwards and rejects invalid targets", () => {
    const state = createAuthorizedDvor220State({ nowMs: vietnamNowMs });
    expect(synchronizeDvor220Clock(state, trainingStartMs).nowMs).toBe(trainingStartMs);
    expect(() => synchronizeDvor220Clock(state, Number.NaN)).toThrow(/finite/);
  });

  it("formats and parses PMDT times in Vietnam time (UTC+7)", () => {
    expect(formatDvor220DateTime(trainingStartMs)).toBe("10/08/2026, 08:00:00");
    expect(formatDvor220Time(trainingStartMs)).toBe("08:00:00");
    expect(toDvor220TimeInput(trainingStartMs)).toBe("2026-08-10T08:00:00.000");
    expect(parseDvor220TimeInput("2026-08-10T08:00:00.000")).toBe(trainingStartMs);
    expect(parseDvor220TimeInput("2026-08-10T08:00")).toBe(trainingStartMs);
    expect(parseDvor220TimeInput("")).toBeNaN();
  });
});
