import { describe, expect, it } from "vitest";
import {
  DME1119A_SCENARIO_SCHEMA_VERSION,
  createDefaultDme1119aScenarioDefinition,
  parseDme1119aScenarioDefinition,
  validateDme1119aScenarioDefinition,
} from "@/lib/dme1119a/scenario";

describe("DME 1119A Scenario definition", () => {
  it("creates an isolated TST scenario definition", () => {
    const first = createDefaultDme1119aScenarioDefinition();
    const second = createDefaultDme1119aScenarioDefinition();

    expect(first.schemaVersion).toBe(DME1119A_SCENARIO_SCHEMA_VERSION);
    expect(first.configuration.rmsConfigStation.stationDescription).toContain("TST");
    expect(first.successCriteria.length).toBeGreaterThan(0);

    first.configuration.rmsConfigStation.channelNumber = 1;
    expect(second.configuration.rmsConfigStation.channelNumber).toBe(117);
  });

  it("round-trips a version 1 definition", () => {
    const source = createDefaultDme1119aScenarioDefinition();

    expect(parseDme1119aScenarioDefinition(JSON.parse(JSON.stringify(source)))).toEqual(source);
  });

  it("rejects an unsupported schema version", () => {
    const source = createDefaultDme1119aScenarioDefinition();
    const parsed = parseDme1119aScenarioDefinition({ ...source, schemaVersion: 99 });

    expect(parsed).toBeNull();
  });

  it("rejects duplicate or unknown student fields", () => {
    const source = createDefaultDme1119aScenarioDefinition();
    source.studentEditableFieldIds = ["unknown.field", "unknown.field"];

    const issues = validateDme1119aScenarioDefinition(source);

    expect(issues).toEqual(expect.arrayContaining([
      expect.stringContaining("Student editable field is invalid"),
      expect.stringContaining("must not contain duplicates"),
    ]));
  });

  it("rejects duplicate fault and criterion identifiers", () => {
    const source = createDefaultDme1119aScenarioDefinition();
    source.faultInjections = [
      { id: "fault-1", kind: "tx-power-loss", transmitter: "tx1", lossDb: 3 },
      { id: "fault-1", kind: "hpa-fault", transmitter: "tx1", active: true },
    ];
    source.successCriteria = [
      { id: "check-1", kind: "monitor-normal", monitor: "integral" },
      { id: "check-1", kind: "active-transmitter", expected: "any" },
    ];

    const issues = validateDme1119aScenarioDefinition(source);

    expect(issues).toEqual(expect.arrayContaining([
      expect.stringContaining("Fault IDs must be unique"),
      expect.stringContaining("Criterion IDs must be unique"),
    ]));
  });

  it("rejects a single-transmitter scenario that starts with TX2", () => {
    const source = createDefaultDme1119aScenarioDefinition();
    source.configuration.rmsConfigStation.transmitterConfig = "Single Transmitter";
    source.startPolicy.mainTransmitterId = "tx2";

    const issues = validateDme1119aScenarioDefinition(source);

    expect(issues).toContain("A single-transmitter station cannot start with TX2 as Main.");
  });

  it("rejects a scenario without success criteria", () => {
    const source = createDefaultDme1119aScenarioDefinition();
    source.successCriteria = [];

    expect(validateDme1119aScenarioDefinition(source)).toContain(
      "Scenario must define at least one success criterion.",
    );
    expect(parseDme1119aScenarioDefinition(source)).toBeNull();
  });

  it("fails closed for unknown fault and criterion kinds", () => {
    const source = createDefaultDme1119aScenarioDefinition();
    const unknown = {
      ...source,
      faultInjections: [{ id: "fault-1", kind: "invented-fault" }],
      successCriteria: [{ id: "check-1", kind: "invented-check" }],
    };

    expect(parseDme1119aScenarioDefinition(unknown)).toBeNull();
  });

  it("rejects a temperature fault that cannot be derived by the RMS engine", () => {
    const definition = createDefaultDme1119aScenarioDefinition();
    definition.faultInjections = [{ id: "temperature", kind: "temperature", sensor: "Unknown sensor", celsius: 45 }];

    expect(validateDme1119aScenarioDefinition(definition).join(" ")).toContain("unknown RMS temperature sensor");
  });
});
