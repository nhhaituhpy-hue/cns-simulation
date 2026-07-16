import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { StudentDashboard } from "../../src/components/qcms/student-dashboard";
import type { Scenario } from "../../src/lib/types";
import { useScenarioStore } from "../../src/stores/scenario-store";

const scenario: Scenario = {
  id: "scenario-dashboard",
  title: "Kiểm tra cảm biến",
  description: "Quan sát trạng thái và mở ứng dụng bảo trì.",
  difficulty: "easy",
  createdAt: "2026-07-15T00:00:00.000Z",
  sites: [
    {
      id: "site-1",
      name: "Site 1",
      sensorA: {
        id: "site-1-a",
        sensorLabel: "A",
        status: "green",
        ipAddress: "10.10.1.3",
        name: "Sensor A",
      },
      sensorB: null,
    },
  ],
  targetSensorId: "site-1-a",
  targetLoginUser: "sysadmin",
  expectedActions: [],
};

describe("StudentDashboard", () => {
  beforeEach(() => {
    useScenarioStore.setState({
      scenarios: [],
      isHydrated: true,
      storageError: null,
    });
  });

  it("renders the empty state after hydration", () => {
    render(<StudentDashboard activeModule="ads-b" />);

    expect(screen.getByText("Chưa có bài thực hành")).toBeVisible();
    expect(screen.getByRole("link", { name: "Tạo kịch bản" })).toHaveAttribute(
      "href",
      "/admin/create",
    );
  });

  it("renders scenario metadata without exposing the target sensor", () => {
    useScenarioStore.setState({ scenarios: [scenario], isHydrated: true });

    render(<StudentDashboard activeModule="ads-b" />);

    const card = screen.getByRole("link", { name: /Kiểm tra cảm biến/ });
    expect(card).toHaveAttribute("href", "/student/simulation?id=scenario-dashboard");
    expect(screen.getByText("Cơ bản")).toBeVisible();
    expect(screen.getByText("1 site")).toBeVisible();
    expect(screen.getByText("1 cảm biến")).toBeVisible();
    expect(screen.queryByText(/mục tiêu/i)).not.toBeInTheDocument();
  });

  it("uses the same newest-first order and ordinal numbers as admin", () => {
    useScenarioStore.setState({
      scenarios: [
        {
          ...scenario,
          id: "scenario-older",
          title: "Bài thực hành cũ hơn",
          createdAt: "2026-07-14T00:00:00.000Z",
        },
        {
          ...scenario,
          id: "scenario-newer",
          title: "Bài thực hành mới hơn",
          createdAt: "2026-07-13T00:00:00.000Z",
          updatedAt: "2026-07-16T00:00:00.000Z",
        },
      ],
      isHydrated: true,
    });

    render(<StudentDashboard activeModule="ads-b" />);

    const markers = screen.getAllByLabelText(/Bài thực hành số/);
    expect(markers[0]).toHaveTextContent("01");
    expect(markers[0].closest("article")).toHaveTextContent(
      "Bài thực hành mới hơn",
    );
    expect(markers[1]).toHaveTextContent("02");
    expect(markers[1].closest("article")).toHaveTextContent(
      "Bài thực hành cũ hơn",
    );
  });
});

