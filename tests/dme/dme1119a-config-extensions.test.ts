import { describe, expect, it } from "vitest";
import { cloneDefaultDmePmdtData } from "@/lib/dme-pmdt-defaults";
import {
  extractDme1119aConfig, getDefaultDme1119aConfig, hydrateDme1119aData, parseDme1119aConfig,
} from "@/lib/simulator-config/dme-1119a";
import { legacyDme1119aConfig, preserveMissingDme1119aExtensions } from "@/lib/simulator-config/wire";
import { getDefaultDme1119aConfig as legacyDefault, parseDme1119aConfig as legacyParse } from "../fixtures/dme-config-fa138e9/parser";

const groups = ["rmsVoltageData", "rmsCurrentData", "rmsTemperatureData", "rmsAdData"] as const;
const extensions = ["monitorOffsets", ...groups] as const;
const monitors = ["monitor1", "monitor2"] as const;
const columns = ["integral", "standby"] as const;
// Explicit contract, not a catalog-derived oracle: N/A and row identity must not drift.
const rows = [
  { parameter: "Delay Offset", unit: "us", integral: 0, standby: 0, min: -100, max: 100 },
  { parameter: "Spacing Offset", unit: "us", integral: 0, standby: 0, min: -100, max: 100 },
  { parameter: "Tx Power Scale", unit: "%", integral: null, standby: 175, min: 0, max: 300 },
  { parameter: "Tx Power Offset", unit: "Watts", integral: null, standby: 0, min: -5000, max: 5000 },
  { parameter: "Efficiency Offset", unit: "%", integral: 0, standby: 0, min: -100, max: 100 },
  { parameter: "PRF Offset", unit: "ppps", integral: 0, standby: 0, min: -6000, max: 6000 },
  { parameter: "Tx Frequency Offset", unit: "ppm", integral: 0, standby: 0, min: -1000, max: 1000 },
  { parameter: "Rx Frequency Offset", unit: "ppm", integral: 10, standby: 10, min: -1000, max: 1000 },
  { parameter: "ERP Offset", unit: "dB", integral: 0.3, standby: null, min: -100, max: 100 },
  { parameter: "Return Loss Offset", unit: "dB", integral: -0.4, standby: null, min: -100, max: 100 },
];

describe("DME 1119A optional configuration extensions", () => {
  it("keeps the exact frozen legacy shape and adds only five optional keys without changing schema", () => {
    const defaults = getDefaultDme1119aConfig();
    expect(legacyParse(legacyDefault())).toEqual(legacyDefault());
    expect(legacyParse(defaults)).toBeNull();
    expect(legacyDme1119aConfig(defaults)).toEqual(legacyDefault());
    expect(Object.keys(defaults).sort()).toEqual([...Object.keys(legacyDefault()), ...extensions].sort());
    expect(parseDme1119aConfig(legacyDefault())).toEqual(defaults);
    expect(parseDme1119aConfig(defaults)).toEqual(defaults);
    for (const monitor of monitors) {
      expect(defaults.monitorOffsets![monitor]).toEqual(rows.map(({ parameter, unit, integral, standby }) => ({ parameter, unit, integral, standby })));
    }
    expect(groups.map(key => defaults[key]!.length)).toEqual([15, 6, 6, 10]);
    for (const key of groups) expect(defaults[key]).toEqual(defaults[key]!.map(() => ({ enabled: false })));
  });

  it.each(extensions)("fills only missing legacy %s without mutating the input", key => {
    const source = getDefaultDme1119aConfig();
    source.monitorOffsets!.monitor2[0].standby = 4.5;
    source.rmsAdData![0].enabled = true;
    delete source[key];
    const before = structuredClone(source);
    const parsed = parseDme1119aConfig(source)!;
    expect(parsed).toEqual({ ...source, [key]: getDefaultDme1119aConfig()[key] });
    expect(source).toEqual(before);
    expect(Object.hasOwn(source, key)).toBe(false);
  });

  it("round-trips both complete monitor tables and every RMS enable bit, not runtime readings", () => {
    const runtime = cloneDefaultDmePmdtData();
    for (const [m, monitor] of monitors.entries()) {
      for (const row of runtime.monitorOffsets[monitor]) for (const column of columns) {
        if (row[column] !== null) row[column] = row[column]! + m + 0.25;
      }
    }
    for (const group of groups) runtime[group].forEach((row, index) => { row.enabled = index % 2 === 0; });
    runtime.rmsVoltageData[0].volts = 999;
    runtime.rmsCurrentData[0].amps = 999;
    runtime.rmsTemperatureData[0].value = 999;
    runtime.rmsAdData[0].volts = 999;
    const config = extractDme1119aConfig(runtime);
    for (const group of groups) expect(config[group]).toEqual(runtime[group].map(({ enabled }) => ({ enabled })));
    expect(config.monitorOffsets).toEqual(runtime.monitorOffsets);
    const parsed = parseDme1119aConfig(config)!;
    expect(parsed).toEqual(config);
    const hydrated = hydrateDme1119aData(parsed);
    // Existing calibration readings are recomputed during hydration; the new
    // persisted extension values themselves must survive exactly.
    const roundTrip = extractDme1119aConfig(hydrated);
    for (const key of extensions) expect(roundTrip[key]).toEqual(config[key]);
    const clean = cloneDefaultDmePmdtData();
    for (const group of groups) expect(hydrated[group]).toEqual(clean[group].map((row, index) => ({ ...row, enabled: config[group]![index].enabled })));
    hydrated.monitorOffsets.monitor1[0].integral = 99;
    hydrated.rmsVoltageData[0].enabled = false;
    expect(parsed).toEqual(config);
    expect(config.monitorOffsets!.monitor1[0].integral).toBe(0.25);
    expect(config.rmsVoltageData![0].enabled).toBe(true);
  });

  it.each(extensions)("rejects null, explicit undefined and wrong container types for %s", key => {
    for (const value of [null, undefined, true, 0, "", {}]) {
      expect(parseDme1119aConfig({ ...getDefaultDme1119aConfig(), [key]: value }), `${key}: ${String(value)}`).toBeNull();
    }
  });

  it.each(groups)("accepts only exact-length boolean-only rows for %s", key => {
    const source = getDefaultDme1119aConfig();
    const valid = source[key]!;
    for (const invalid of [[], valid.slice(1), [...valid, { enabled: false }], [null, ...valid.slice(1)],
      [{}, ...valid.slice(1)], [{ enabled: false, volts: 1 }, ...valid.slice(1)],
      [{ enabled: true, parameter: "injected identity" }, ...valid.slice(1)]]) {
      expect(parseDme1119aConfig({ ...source, [key]: invalid })).toBeNull();
    }
    for (const enabled of [null, undefined, "false", 0, 1, {}, []]) {
      expect(parseDme1119aConfig({ ...source, [key]: [{ enabled }, ...valid.slice(1)] })).toBeNull();
    }
  });

  it("rejects extra root/nested keys, missing required legacy keys and malformed monitor tables", () => {
    const source = getDefaultDme1119aConfig();
    expect(parseDme1119aConfig({ ...source, connected: true })).toBeNull();
    const missing = structuredClone(source) as Partial<typeof source>;
    delete missing.txOffsets;
    expect(parseDme1119aConfig(missing)).toBeNull();
    for (const monitor of monitors) {
      for (const invalid of [null, {}, [], source.monitorOffsets![monitor].slice(1), [...source.monitorOffsets![monitor], source.monitorOffsets![monitor][0]]]) {
        expect(parseDme1119aConfig({ ...source, monitorOffsets: { ...source.monitorOffsets, [monitor]: invalid } })).toBeNull();
      }
    }
    expect(parseDme1119aConfig({ ...source, monitorOffsets: { ...source.monitorOffsets, monitor3: [] } })).toBeNull();
    const extra = structuredClone(source);
    Object.assign(extra.monitorOffsets!.monitor1[0], { reading: 7 });
    expect(parseDme1119aConfig(extra)).toBeNull();
  });

  for (const monitor of monitors) {
    it(`${monitor} rejects altered parameter/unit identities and reordered rows`, () => {
      for (const index of rows.keys()) for (const key of ["parameter", "unit"] as const) {
        const config = getDefaultDme1119aConfig();
        config.monitorOffsets![monitor][index][key] += " changed";
        expect(parseDme1119aConfig(config), `${monitor}.${index}.${key}`).toBeNull();
      }
      const config = getDefaultDme1119aConfig();
      config.monitorOffsets![monitor].reverse();
      expect(parseDme1119aConfig(config)).toBeNull();
    });
    for (const [index, spec] of rows.entries()) for (const column of columns) {
      it(`${monitor}.${index}.${column} enforces ${spec[column] === null ? "native N/A" : "finite numeric bounds"}`, () => {
        const withValue = (value: unknown) => {
          const config = getDefaultDme1119aConfig();
          Object.assign(config.monitorOffsets![monitor][index], { [column]: value });
          return config;
        };
        if (spec[column] === null) {
          expect(parseDme1119aConfig(withValue(null))).not.toBeNull();
          for (const invalid of [0, "N/A", undefined, false]) expect(parseDme1119aConfig(withValue(invalid))).toBeNull();
        } else {
          for (const valid of [spec.min, spec.max]) expect(parseDme1119aConfig(withValue(valid))).toEqual(withValue(valid));
          for (const invalid of [spec.min - 1, spec.max + 1, null, "0", false, NaN, Infinity, -Infinity]) {
            expect(parseDme1119aConfig(withValue(invalid)), String(invalid)).toBeNull();
          }
        }
      });
    }
  }

  it.each(extensions)("preserves an omitted %s but honors explicitly supplied defaults/false", key => {
    const stored = getDefaultDme1119aConfig();
    stored.monitorOffsets!.monitor1[0].integral = 12;
    for (const group of groups) stored[group]!.forEach(row => { row.enabled = true; });
    const defaults = getDefaultDme1119aConfig();
    const omitted = structuredClone(defaults);
    delete omitted[key];
    const before = structuredClone(stored);
    const preserved = preserveMissingDme1119aExtensions(omitted, parseDme1119aConfig(omitted)!, stored);
    expect(preserved).toEqual({ ...defaults, [key]: stored[key] });
    expect(preserveMissingDme1119aExtensions(defaults, defaults, stored)).toEqual(defaults);
    expect(stored).toEqual(before);
    expect(preserved[key]).not.toBe(stored[key]);
  });
});
