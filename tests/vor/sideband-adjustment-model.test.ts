import { describe, expect, it } from "vitest";
import { readSidebandTrim, turnSidebandTrim, type SidebandAngles } from "@/modules/devices/dvor-1150a/sideband-adjustment-model";

// Characterization of the model already exercised RED→GREEN through the UI.
describe("detached sideband training model", () => {
  it.each(["R3", "R6"] as const)("%s has linear power mapping and saturates without windup", (id) => {
    let state: SidebandAngles = {};
    expect(readSidebandTrim(state, id).power).toBe(3);
    state = turnSidebandTrim(state, id, 9999);
    expect(readSidebandTrim(state, id)).toMatchObject({ angle: 180, power: 5 });
    state = turnSidebandTrim(state, id, -15);
    expect(readSidebandTrim(state, id).power).toBeCloseTo(5 - 1 / 6);
    state = turnSidebandTrim(state, id, -9999);
    expect(readSidebandTrim(state, id)).toMatchObject({ angle: -180, power: 1 });
  });
  it.each([["R2", "R3"], ["R5", "R6"]] as const)("%s calibrates the reading of %s without changing its power", (cal, power) => {
    const original = Object.freeze({ [power]: 90 });
    const calibrated = turnSidebandTrim(original, cal, 90);
    expect(readSidebandTrim(calibrated, cal)).toMatchObject({ power: 4, calibratedPower: 4.4 });
    expect(original).toEqual({ [power]: 90 });
    expect(readSidebandTrim(calibrated, power).power).toBe(4);
  });
  it.each(["R1", "R4"] as const)("%s controls only the illustrative mean-phase voltage", (id) => {
    const high = turnSidebandTrim({}, id, 9999);
    const low = turnSidebandTrim(high, id, -9999);
    expect(readSidebandTrim(high, id).controlVoltage).toBe(10);
    expect(readSidebandTrim(low, id).controlVoltage).toBe(2);
    expect(readSidebandTrim(high, "R3").power).toBe(3);
    expect(readSidebandTrim(high, "R6").power).toBe(3);
  });
});
