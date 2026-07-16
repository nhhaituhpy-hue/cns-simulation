import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { SiteMonitor } from "../../src/components/qcms/site-monitor";
import { StatusBadge } from "../../src/components/qcms/status-badge";
import type { Scenario, SensorState, SiteState } from "../../src/lib/types";

function sensor(
  siteNumber: number,
  label: "A" | "B",
  status: SensorState["status"] = "green",
): SensorState {
  return {
    id: `site-${siteNumber}-${label.toLocaleLowerCase("en-US")}`,
    sensorLabel: label,
    status,
    ipAddress: `10.10.${siteNumber}.${label === "A" ? 3 : 4}`,
    name: `Quadrant ADS-B sensor ${label}`,
    monitoring: {
      lastSnmpResponseAt: "2026-01-01T00:00:00.000Z",
      temperatureC: 45.2,
      cpuLoadPercent: 23,
      voltages: { v3_3: 3.3, v5: 5.01, v12: 12.04 },
      receiverConfidencePercent: 96,
      crcErrorCount: 4,
      gpsStatus: "synchronized",
    },
  };
}

function scenarioWithSites(sites: SiteState[]): Scenario {
  return {
    id: "training-scenario",
    title: "Kiểm tra trạng thái QCMS",
    description: "Quan sát và mở thông tin cảm biến.",
    difficulty: "medium",
    createdAt: "2026-07-15T00:00:00.000Z",
    sites,
    targetSensorId: sites[0]?.sensorA?.id ?? sites[0]?.sensorB?.id ?? "",
    targetLoginUser: "maintenance",
    expectedActions: [],
  };
}

function twoSensorSite(siteNumber: number): SiteState {
  return {
    id: `site-${siteNumber}`,
    name: `Site ${siteNumber}`,
    sensorA: sensor(siteNumber, "A"),
    sensorB: sensor(siteNumber, "B", siteNumber === 1 ? "red" : "green"),
  };
}

describe("StatusBadge", () => {
  it.each([
    ["green", "Hoạt động"],
    ["orange", "Suy giảm"],
    ["yellow", "Một phần"],
    ["red", "Lỗi"],
    ["turquoise", "Dự phòng tốt"],
    ["magenta", "Dự phòng lỗi"],
    ["grey", "Đã tắt"],
  ] as const)("renders %s with its Vietnamese label", (status, label) => {
    render(<StatusBadge status={status} />);

    expect(screen.getByText(label)).toBeVisible();
    expect(screen.getByLabelText(`Trạng thái: ${label}`)).toBeVisible();
  });
});

describe("SiteMonitor", () => {
  it("enforces four visualized sensors and enables RR per site", async () => {
    const user = userEvent.setup();
    render(
      <SiteMonitor
        scenario={scenarioWithSites([
          twoSensorSite(1),
          twoSensorSite(2),
          twoSensorSite(3),
        ])}
      />,
    );

    const rrSiteOne = screen.getByRole("button", {
      name: "Bật vòng cự ly cho Site 1",
    });
    expect(rrSiteOne).toBeDisabled();

    const showButtons = screen.getAllByRole("button", {
      name: /^Hiển thị Sensor/,
    });
    await user.click(showButtons[0]);
    expect(rrSiteOne).toBeEnabled();
    await user.click(rrSiteOne);
    expect(rrSiteOne).toHaveAttribute("aria-pressed", "true");

    await user.click(showButtons[1]);
    await user.click(showButtons[2]);
    await user.click(showButtons[3]);

    expect(screen.getByText("4/4 cảm biến hiển thị")).toBeVisible();
    const remainingShowButtons = screen.getAllByRole("button", {
      name: /^Hiển thị Sensor/,
    });
    expect(remainingShowButtons).toHaveLength(2);
    expect(remainingShowButtons.every((button) => button.hasAttribute("disabled"))).toBe(
      true,
    );
  });

  it("removes RR when the last visualized sensor at a site is hidden", async () => {
    const user = userEvent.setup();
    const singleSensorSite: SiteState = {
      id: "site-1",
      name: "Site 1",
      sensorA: sensor(1, "A"),
      sensorB: null,
    };
    render(<SiteMonitor scenario={scenarioWithSites([singleSensorSite])} />);

    await user.click(
      screen.getByRole("button", { name: "Hiển thị Sensor A tại Site 1" }),
    );
    const rrButton = screen.getByRole("button", {
      name: "Bật vòng cự ly cho Site 1",
    });
    await user.click(rrButton);
    expect(rrButton).toHaveAttribute("aria-pressed", "true");

    await user.click(
      screen.getByRole("button", {
        name: "Dừng hiển thị Sensor A tại Site 1",
      }),
    );

    expect(
      screen.getByRole("button", { name: "Bật vòng cự ly cho Site 1" }),
    ).toBeDisabled();
  });

  it("opens stale monitoring data, links to terminal, and returns focus on Escape", async () => {
    const user = userEvent.setup();
    const testSite = twoSensorSite(1);
    render(<SiteMonitor scenario={scenarioWithSites([testSite])} />);

    const trigger = screen.getByRole("button", {
      name: "Mở giám sát Sensor A tại Site 1, trạng thái Hoạt động",
    });
    trigger.focus();
    await user.click(trigger);

    const dialog = screen.getByRole("dialog", {
      name: /Sensor A \| 10\.10\.1\.3/,
    });
    expect(dialog).toBeVisible();
    expect(within(dialog).getByText("Dữ liệu SNMP đã cũ")).toBeVisible();
    expect(within(dialog).getByText("45,2 °C")).toBeVisible();
    expect(within(dialog).getByText("Đã đồng bộ")).toBeVisible();

    const maintenanceLink = within(dialog).getByRole("link", {
      name: "Mở ứng dụng bảo trì",
    });
    expect(maintenanceLink).toHaveAttribute(
      "href",
      "/student/terminal?id=training-scenario&sensorId=site-1-a",
    );

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
