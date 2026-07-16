import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LogWindow, generateScenarioEvents } from "../../src/components/qcms/log-window";
import { QcmsToolbar } from "../../src/components/qcms/qcms-toolbar";
import { ReplayDialog } from "../../src/components/qcms/replay-dialog";
import { SensorConfigWindow } from "../../src/components/qcms/sensor-config-window";
import { SiteMonitor } from "../../src/components/qcms/site-monitor";
import { CON_SON_SENSOR_1 } from "../../src/lib/sensor-data-presets";
import type { QcmsEvent, Scenario, SensorState } from "../../src/lib/types";

function makeSensor(
  status: SensorState["status"] = "green",
  withProfile = true,
): SensorState {
  return {
    id: "con-son-a",
    sensorLabel: "A",
    status,
    ipAddress: "192.168.201.1",
    name: "Con Son Sensor 1",
    dataProfile: withProfile ? structuredClone(CON_SON_SENSOR_1) : undefined,
    monitoring: {
      lastSnmpResponseAt: new Date().toISOString(),
      temperatureC: 42,
      cpuLoadPercent: 18,
      voltages: { v3_3: 3.3, v5: 5, v12: 12 },
      receiverConfidencePercent: 98,
      crcErrorCount: 2,
      gpsStatus: "synchronized",
    },
  };
}

function makeScenario(
  status: SensorState["status"] = "green",
  eventLog?: QcmsEvent[],
): Scenario {
  return {
    id: "module-b-scenario",
    title: "Module B",
    description: "QCMS test fixture",
    difficulty: "medium",
    createdAt: "2026-01-15T09:00:00.000Z",
    sites: [
      {
        id: "con-son",
        name: "Con Son",
        sensorA: makeSensor(status),
        sensorB: null,
      },
    ],
    eventLog,
    targetSensorId: "con-son-a",
    targetLoginUser: "maintenance",
    expectedActions: [],
  };
}

describe("QcmsToolbar", () => {
  it("renders the eight legacy controls and selects an enabled panel", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <QcmsToolbar
        activePanel="sites"
        onSelect={onSelect}
        onExit={vi.fn()}
      />,
    );

    const names = [
      "MAPS",
      "SITES",
      "MET",
      "LOG",
      "REPLAY",
      "EXPORT",
      "GEN",
      "EXIT",
    ];
    expect(screen.getAllByRole("button")).toHaveLength(8);
    for (const name of names) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }

    expect(screen.getByRole("button", { name: "MAPS" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "CONF" })).not.toBeInTheDocument();
    expect(screen.getByText("QCMS Quadrant Control and Monitoring System")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "LOG" }));
    expect(onSelect).toHaveBeenCalledWith("log");
  });
});

describe("LogWindow", () => {
  it("renders event color classes and filters individual types", async () => {
    const user = userEvent.setup();
    const events: QcmsEvent[] = [
      { timestamp: "09:00:00", type: "error", message: "SNMP fault" },
      { timestamp: "09:00:01", type: "snmp", message: "Heartbeat OK" },
    ];

    render(<LogWindow scenario={makeScenario("green", events)} onClose={vi.fn()} />);

    expect(screen.getByText("SNMP fault")).toHaveClass("text-red-600");
    expect(screen.getByText("Heartbeat OK")).toHaveClass("text-blue-600");

    await user.click(screen.getByRole("checkbox", { name: "ERROR" }));
    expect(screen.queryByText("SNMP fault")).not.toBeInTheDocument();
    expect(screen.getByText("Heartbeat OK")).toBeVisible();
  });

  it.each([
    ["green", "heartbeat OK"],
    ["red", "no SNMP response"],
    ["orange", "temperature warning"],
    ["yellow", "no surveillance data"],
  ] as const)("auto-generates %s sensor events", (status, message) => {
    const events = generateScenarioEvents(makeScenario(status));
    expect(events.some((event) => event.message.includes(message))).toBe(true);
  });
});

describe("SensorConfigWindow", () => {
  it("displays dataProfile values and maintenance link", () => {
    render(
      <SensorConfigWindow
        scenarioId="module-b-scenario"
        now={Date.parse("2026-07-16T03:00:00.000Z")}
        sensor={makeSensor()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getAllByText("ConSon Sensor 1")).toHaveLength(2);
    expect(screen.getByText("0.26")).toBeVisible();
    expect(screen.getAllByText("192.168.201.10").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", { name: "OPEN MAINTENANCE APPLICATION" }),
    ).toHaveAttribute(
      "href",
      "/student/terminal?id=module-b-scenario&sensorId=con-son-a",
    );
  });
});

describe("site context actions", () => {
  it("opens the Sensor Configuration window from right-click menu", async () => {
    const user = userEvent.setup();
    render(<SiteMonitor scenario={makeScenario()} />);

    const siteButton = screen.getByRole("button", {
      name: /Con Son\s*0\/1/,
    });
    fireEvent.contextMenu(siteButton, { clientX: 80, clientY: 120 });

    const menu = screen.getByRole("menu", { name: /Con Son/ });
    await user.click(
      within(menu).getByRole("menuitem", {
        name: "Sensor A Configuration",
      }),
    );

    expect(
      screen.getByRole("dialog", { name: "Sensor A Configuration" }),
    ).toBeVisible();
  });
});

describe("ReplayDialog", () => {
  it("switches replay mode and status color", async () => {
    const user = userEvent.setup();
    render(<ReplayDialog onClose={vi.fn()} />);

    expect(screen.getByText("Status: Online mode")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "REPLAY" }));
    expect(screen.getByText("Status: Replay stopped")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "PLAY" }));
    const status = screen.getByText("Status: Replay playing");
    expect(status).toBeVisible();
    expect(status.querySelector("span")).toHaveClass("bg-green-500");

    await user.click(screen.getByRole("button", { name: "PAUSE" }));
    expect(screen.getByText("Status: Replay paused")).toBeVisible();
  });
});
