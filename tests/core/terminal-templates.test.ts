import { describe, expect, it } from "vitest";

import {
  CON_SON_SENSOR_1,
  CON_SON_SENSOR_3,
} from "../../src/lib/sensor-data-presets";
import {
  deserializeScenarioStorage,
  serializeScenarioStorage,
} from "../../src/lib/storage";
import {
  renderTemplate,
  TERMINAL_TEMPLATE_IDS,
} from "../../src/lib/terminal-templates";
import { TerminalEngine } from "../../src/lib/terminal-engine";
import type { SensorMonitoringData } from "../../src/lib/types";
import { DEFAULT_SCENARIOS } from "../../src/stores/default-scenarios";

const monitoring: SensorMonitoringData = {
  lastSnmpResponseAt: "2026-01-01T00:00:00.000Z",
  temperatureC: 42.5,
  cpuLoadPercent: 31,
  voltages: { v3_3: 3.3, v5: 5.02, v12: 12.08 },
  receiverConfidencePercent: 97,
  crcErrorCount: 3,
  gpsStatus: "synchronized",
};

const templateExpectations: ReadonlyArray<readonly [string, string]> = [
  ["sa-network-display", "192.168.201.1"],
  ["sa-software-version", "ConSon_V1.0"],
  ["sa-clients-display", "QCMS"],
  ["sa-clients-stats", "4,523,100"],
  ["sa-snmp-users", "qcms_user"],
  ["sa-snmp-traps", "20900"],
  ["sa-syslog-config", "/var/log/sensor.log"],
  ["ma-network-display", "255.255.255.0"],
  ["ma-network-ntp", "192.168.201.10"],
  ["ma-network-bitrate", "100 Mbit/s full duplex"],
  ["ma-system-config", "120 / 1"],
  ["ma-system-status", "42.5 \u00b0C"],
  ["ma-dsp-stats", "1,284,567"],
  ["ma-gps-status", "8.6833"],
  ["ma-filter-display", "FL0 - FL600"],
  ["ma-clients-display", "Gateway"],
  ["ma-monitoring-display", "Site Monitor 1"],
];

describe("terminal data templates", () => {
  it("defines the complete set of 17 planned templates", () => {
    expect(TERMINAL_TEMPLATE_IDS).toHaveLength(17);
    expect(TERMINAL_TEMPLATE_IDS).toEqual(
      templateExpectations.map(([templateId]) => templateId),
    );
  });

  it.each(templateExpectations)(
    "renders %s with sensor-profile data",
    (templateId, expectedText) => {
      const output = renderTemplate(
        templateId,
        CON_SON_SENSOR_1,
        monitoring,
      );

      expect(output).toContain(expectedText);
      expect(output.endsWith("Press RETURN to continue:")).toBe(true);
    },
  );

  it("renders monitoring values in system status", () => {
    const output = renderTemplate(
      "ma-system-status",
      CON_SON_SENSOR_1,
      monitoring,
    );

    expect(output).toContain("42.5 \u00b0C");
    expect(output).toContain("31 %");
    expect(output).toContain("12.08 V");
    expect(output).toContain("Synchronized");
  });

  it("renders surveillance clients in an aligned console table", () => {
    const output = renderTemplate(
      "sa-clients-display",
      CON_SON_SENSOR_1,
    );

    expect(output).toContain("Name       IP");
    expect(output).toContain("QCMS");
    expect(output).toContain("192.168.201.10");
    expect(output).toContain("Total: 2 clients configured");
  });

  it("returns deterministic fallbacks for unknown templates or missing data", () => {
    expect(renderTemplate("unknown-id", CON_SON_SENSOR_1)).toContain(
      'Terminal template "unknown-id" is not available.',
    );
    expect(renderTemplate("sa-network-display", undefined)).toContain(
      "Sensor data profile is not available.",
    );
  });
});

describe("terminal engine data-profile integration", () => {
  it("uses a template when the engine receives a sensor data profile", () => {
    const engine = new TerminalEngine({
      targetLoginUser: "sysadmin",
      sensorDataProfile: CON_SON_SENSOR_1,
      sensorMonitoring: monitoring,
    });

    engine.processInput("2");
    const result = engine.processInput("1");

    expect(result.output).toContain("192.168.201.1");
    expect(result.output.match(/Press RETURN to continue:/g)).toHaveLength(1);
  });

  it("keeps legacy display content when no profile is supplied", () => {
    const engine = new TerminalEngine({ targetLoginUser: "sysadmin" });

    engine.processInput("2");
    const result = engine.processInput("1");

    expect(result.output).toContain("Interface eth0: 10.10.10.3/24");
    expect(result.output).not.toContain("192.168.201.1");
  });
});

describe("Con Son scenario compatibility", () => {
  it("keeps the original three scenarios profile-free", () => {
    expect(DEFAULT_SCENARIOS.slice(0, 3)).toHaveLength(3);
    expect(
      DEFAULT_SCENARIOS.slice(0, 3).every((scenario) =>
        scenario.sites.every(
          (site) =>
            !site.sensorA?.dataProfile && !site.sensorB?.dataProfile,
        ),
      ),
    ).toBe(true);
  });

  it("adds a complete Sensor 1 scenario and persists its profile", () => {
    const scenario = DEFAULT_SCENARIOS.find(
      (item) => item.id === "seed-con-son-network",
    );
    expect(scenario?.sites[0].sensorA?.dataProfile).toEqual(CON_SON_SENSOR_1);

    const parsed = deserializeScenarioStorage(
      serializeScenarioStorage([scenario!]),
    );
    expect(parsed.scenarios[0].sites[0].sensorA?.dataProfile).toEqual(
      CON_SON_SENSOR_1,
    );
    expect(CON_SON_SENSOR_3.network.ip).toBe("192.168.201.5");
    expect(CON_SON_SENSOR_3.asterix.sic).toBe(3);
  });
});
