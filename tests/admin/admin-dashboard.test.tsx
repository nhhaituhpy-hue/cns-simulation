import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AdminDashboard } from "@/components/admin/admin-dashboard";
import type { Scenario } from "@/lib/types";
import { useScenarioStore } from "@/stores/scenario-store";

function scenarioFixture(overrides: Partial<Scenario> = {}): Scenario {
  const scenario: Scenario = {
    id: "scenario-admin-test",
    title: "Kiểm tra Sensor A",
    description: "Kịch bản dùng để kiểm tra thao tác xóa trong dashboard.",
    difficulty: "medium",
    createdAt: "2026-07-15T00:00:00.000Z",
    sites: [
      {
        id: "site-test",
        name: "Site kiểm tra",
        sensorA: {
          id: "site-test-A",
          sensorLabel: "A",
          status: "red",
          ipAddress: "10.10.1.3",
          name: "Quadrant ADS-B sensor A",
        },
        sensorB: null,
      },
    ],
    targetSensorId: "site-test-A",
    targetLoginUser: "sysadmin",
    expectedActions: [],
  };

  return { ...scenario, ...overrides };
}

beforeEach(() => {
  useScenarioStore.setState({
    scenarios: [scenarioFixture()],
    isHydrated: true,
    storageError: null,
  });
});

afterEach(() => {
  cleanup();
  useScenarioStore.setState({
    scenarios: [],
    isHydrated: false,
    storageError: null,
  });
});

describe("AdminDashboard", () => {
  it("sorts newest scenarios first and shows matching ordinal numbers", () => {
    useScenarioStore.setState({
      scenarios: [
        scenarioFixture({
          id: "scenario-older",
          title: "Kịch bản cũ hơn",
          createdAt: "2026-07-14T00:00:00.000Z",
        }),
        scenarioFixture({
          id: "scenario-newer",
          title: "Kịch bản mới hơn",
          createdAt: "2026-07-13T00:00:00.000Z",
          updatedAt: "2026-07-16T00:00:00.000Z",
        }),
      ],
      isHydrated: true,
    });

    render(<AdminDashboard activeModule="ads-b" />);

    const markers = screen.getAllByLabelText(/Kịch bản số/);
    expect(markers[0]).toHaveTextContent("01");
    expect(markers[0].closest("article")).toHaveTextContent("Kịch bản mới hơn");
    expect(markers[1]).toHaveTextContent("02");
    expect(markers[1].closest("article")).toHaveTextContent("Kịch bản cũ hơn");
  });

  it("shows scenario details and deletes only after confirmation", async () => {
    const user = userEvent.setup();
    render(<AdminDashboard activeModule="ads-b" />);

    expect(screen.getByText("Kiểm tra Sensor A")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Xóa" }));

    expect(
      screen.getByRole("heading", { name: "Xóa kịch bản này?" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Kiểm tra Sensor A/)).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Xóa kịch bản" }));

    await waitFor(() =>
      expect(screen.queryByText("Kiểm tra Sensor A")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Chưa có kịch bản")).toBeInTheDocument();
  });
});
