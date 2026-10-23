import { describe, expect, it } from "vitest";
import { readSidebandTransmitter, readSidebandTrim, turnSidebandTrim, type SidebandAngles } from "@/modules/devices/dvor-1150a/sideband-adjustment-model";

// User-approved detached training conventions; no manufacturer transfer function.
describe("detached sideband training model", () => {
  it.each(["R3", "R6"] as const)("%s spans ten full turns from 0–5 W without windup", (id) => {
    let state: SidebandAngles = {};
    expect(readSidebandTrim(state, id).power).toBe(2.5);
    state = turnSidebandTrim(state, id, 360);
    expect(readSidebandTrim(state, id)).toMatchObject({ angle: 360, power: 3 });
    state = turnSidebandTrim(state, id, 9999);
    expect(readSidebandTrim(state, id)).toMatchObject({ angle: 1800, power: 5 });
    state = turnSidebandTrim(state, id, -15);
    expect(readSidebandTrim(state, id).power).toBeCloseTo(5 - 15 / 720);
    state = turnSidebandTrim(state, id, -9999);
    expect(readSidebandTrim(state, id)).toMatchObject({ angle: -1800, power: 0 });
    state = turnSidebandTrim(state, id, 15);
    expect(readSidebandTrim(state, id).power).toBeCloseTo(15 / 720);
    expect(readSidebandTrim({ [id]: 9999 }, id)).toMatchObject({ angle: 1800, power: 5 });
    expect(readSidebandTrim({ [id]: -9999 }, id)).toMatchObject({ angle: -1800, power: 0 });
  });
  it.each([["R2", "R3"], ["R5", "R6"]] as const)("%s calibrates the reading of %s without changing its power", (cal, power) => {
    const original = Object.freeze({ [power]: 360 });
    const calibrated = turnSidebandTrim(original, cal, 90);
    expect(readSidebandTrim(calibrated, cal).power).toBe(3);
    expect(readSidebandTrim(calibrated, cal).calibratedPower).toBeCloseTo(3.3);
    expect(original).toEqual({ [power]: 360 });
    expect(readSidebandTrim(calibrated, power).power).toBe(3);
    const adjusted = turnSidebandTrim(calibrated, power, 360);
    expect(adjusted[cal]).toBe(90);
    expect(readSidebandTrim(adjusted, cal).calibratedPower).toBeCloseTo(3.85);
    const high = turnSidebandTrim(adjusted, cal, 9999);
    expect(readSidebandTrim(high, cal).angle).toBe(180);
    expect(readSidebandTrim(high, cal).calibratedPower).toBeCloseTo(4.2);
    const low = turnSidebandTrim(high, cal, -9999);
    expect(readSidebandTrim(low, cal).angle).toBe(-180);
    expect(readSidebandTrim(low, cal).calibratedPower).toBeCloseTo(2.8);
    expect(readSidebandTrim(low, power).power).toBe(3.5);
  });
  it("does not map an unknown occurrence to a real transmitter", () => {
    expect(readSidebandTransmitter({}, "unknown")).toBeNull();
  });
  it.each(["R1", "R4"] as const)("%s controls only the illustrative mean-phase voltage", (id) => {
    const high = turnSidebandTrim({}, id, 9999);
    const low = turnSidebandTrim(high, id, -9999);
    expect(readSidebandTrim(high, id).controlVoltage).toBe(10);
    expect(readSidebandTrim(low, id).controlVoltage).toBe(2);
    expect(readSidebandTrim(high, "R3").power).toBe(2.5);
    expect(readSidebandTrim(high, "R6").power).toBe(2.5);
  });
});
