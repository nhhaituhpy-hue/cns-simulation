import { describe, expect, it } from "vitest";

import type { SiteState } from "../../src/lib/types";
import {
  createGroundStationSlots,
  GROUND_STATION_SLOT_COUNT,
  MAX_VISUALIZED_SENSORS,
  PROCESSING_SITE_SLOT_COUNT,
  SENSOR_STATUS_DETAILS,
  formatElapsedTime,
  formatSnmpAge,
  getSnmpAgeSeconds,
  isSnmpStale,
  siteHasVisualizedSensor,
  toggleSensorVisualization,
} from "../../src/components/qcms/qcms-utils";

const site: SiteState = {
  id: "site-1",
  name: "Site 1",
  sensorA: {
    id: "site-1-a",
    sensorLabel: "A",
    status: "green",
    ipAddress: "10.10.1.3",
    name: "Sensor A",
  },
  sensorB: {
    id: "site-1-b",
    sensorLabel: "B",
    status: "red",
    ipAddress: "10.10.1.4",
    name: "Sensor B",
  },
};

describe("QCMS status mapping", () => {
  it("defines text and non-color context for all seven statuses", () => {
    expect(Object.keys(SENSOR_STATUS_DETAILS)).toEqual([
      "green",
      "orange",
      "yellow",
      "red",
      "turquoise",
      "magenta",
      "grey",
    ]);

    for (const details of Object.values(SENSOR_STATUS_DETAILS)) {
      expect(details.label).not.toBe("");
      expect(details.description).not.toBe("");
      expect(details.textColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(details.signalColor).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe("Ground Station slots", () => {
  it("maps scenario sites into 64 slots with four processing positions", () => {
    const slots = createGroundStationSlots([site]);

    expect(slots).toHaveLength(GROUND_STATION_SLOT_COUNT);
    expect(slots[0]).toEqual({
      slotNumber: 1,
      group: "processing",
      site,
    });
    expect(slots[PROCESSING_SITE_SLOT_COUNT]).toMatchObject({
      slotNumber: 5,
      group: "redundant",
      site: null,
    });
    expect(slots[63]).toMatchObject({
      slotNumber: 64,
      group: "redundant",
      site: null,
    });
  });
});

describe("sensor visualization rules", () => {
  it("adds and removes a sensor without mutating the input set", () => {
    const original = new Set<string>();
    const shown = toggleSensorVisualization(original, "sensor-a");
    const hidden = toggleSensorVisualization(shown.sensorIds, "sensor-a");

    expect(original.size).toBe(0);
    expect(shown.outcome).toBe("shown");
    expect(shown.sensorIds.has("sensor-a")).toBe(true);
    expect(hidden.outcome).toBe("hidden");
    expect(hidden.sensorIds.has("sensor-a")).toBe(false);
  });

  it("rejects a fifth simultaneous sensor", () => {
    const current = new Set(["a", "b", "c", "d"]);
    const result = toggleSensorVisualization(current, "e");

    expect(current.size).toBe(MAX_VISUALIZED_SENSORS);
    expect(result.outcome).toBe("limit-reached");
    expect(result.sensorIds).toEqual(current);
  });

  it("enables a site range ring only when one of its sensors is visualized", () => {
    expect(siteHasVisualizedSensor(site, new Set())).toBe(false);
    expect(siteHasVisualizedSensor(site, new Set(["site-1-a"]))).toBe(true);
    expect(siteHasVisualizedSensor(site, new Set(["another-sensor"]))).toBe(
      false,
    );
  });
});

describe("SNMP age helpers", () => {
  const responseTime = "2026-07-15T00:00:00.000Z";
  const responseTimestamp = Date.parse(responseTime);

  it("marks data stale only after 60 seconds", () => {
    expect(isSnmpStale(responseTime, responseTimestamp + 60_000)).toBe(false);
    expect(isSnmpStale(responseTime, responseTimestamp + 61_000)).toBe(true);
  });

  it("formats age and invalid timestamps safely", () => {
    expect(getSnmpAgeSeconds(responseTime, responseTimestamp + 75_000)).toBe(75);
    expect(getSnmpAgeSeconds("invalid", responseTimestamp)).toBeNull();
    expect(formatSnmpAge(75)).toBe("1 phút trước");
    expect(formatSnmpAge(null)).toBe("Không xác định");
  });
});

describe("elapsed time", () => {
  it("formats minute and hour durations", () => {
    expect(formatElapsedTime(0)).toBe("00:00");
    expect(formatElapsedTime(125)).toBe("02:05");
    expect(formatElapsedTime(3_661)).toBe("01:01:01");
  });
});
