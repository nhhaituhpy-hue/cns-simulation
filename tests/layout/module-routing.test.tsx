import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { Dvor1150StudentDashboard } from "@/components/dvor1150/student/dvor1150-student-dashboard";
import { StudentDashboard } from "@/components/qcms/student-dashboard";
import { DVOR_1150_MODULE } from "@/modules/devices/dvor-1150";
import { DVOR_1150A_MODULE } from "@/modules/devices/dvor-1150a";
import { DME_1119A_MODULE } from "@/modules/devices/dme-1119a";
import { ADSB_MODULE } from "@/modules/devices/adsb";
import { useScenarioStore } from "@/stores/scenario-store";
import { useVorScenarioStore } from "@/stores/vor-scenario-store";
import { useDmeScenarioStore } from "@/stores/dme-scenario-store";
import { useDmeSubmissionStore } from "@/stores/dme-submission-store";

beforeEach(() => {
  useScenarioStore.setState({ scenarios: [], isHydrated: true, storageError: null });
  useVorScenarioStore.setState({
    scenarios: [],
    isHydrated: true,
    isLoading: false,
    syncError: null,
  });
  useDmeScenarioStore.setState({
    scenarios: [],
    isHydrated: true,
    isLoading: false,
    syncError: null,
  });
  useDmeSubmissionStore.setState({
    submissions: [],
    isHydrated: true,
    isLoading: false,
    syncError: null,
  });
});

afterEach(() => cleanup());

describe("CNS module routing", () => {
  it("keeps legacy DVOR 1150 review separate from DVOR 1150A", () => {
    expect(DVOR_1150_MODULE.routes.student).toBe("/student/dvor-1150");
    expect(DVOR_1150_MODULE.routes.review).toBe("/review/dvor-1150");
    expect(DVOR_1150_MODULE.routes.authoring).toBe("/authoring/dvor-1150");
    expect(DVOR_1150A_MODULE.routes.student).toBe("/student/vor");
    expect(DVOR_1150A_MODULE.routes.review).toBe("/review/dvor-1150a");
    expect(DVOR_1150A_MODULE.routes.authoring).toBe("/authoring/dvor-1150a");
    expect(DME_1119A_MODULE.routes.authoring).toBe("/authoring/dme-1119a");
    expect(ADSB_MODULE.routes.authoring).toBe("/authoring/ads-b");
  });

  it("shows the DVOR 1150 scenario catalog before opening the simulator", () => {
    render(<Dvor1150StudentDashboard />);

    expect(screen.getByRole("heading", { name: "Thực hành xử lý sự cố DVOR 1150" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bắt đầu bài DVOR 1150: TX1 Low Carrier and 9960 Hz Modulation" })).toHaveAttribute(
      "href",
      "/student/dvor-1150/session?id=carrier-9960",
    );
  });

  it("shows an empty state when DVOR 1150 has no student scenarios", () => {
    render(<Dvor1150StudentDashboard scenarios={[]} />);

    expect(screen.getByText("Chưa có kịch bản DVOR 1150")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Bắt đầu bài DVOR 1150:/ })).not.toBeInTheDocument();
  });

  it("renders the selected admin module without an in-content tab bar", () => {
    const { container } = render(<AdminDashboard activeModule="dme" />);

    const workspace = container.firstChild;
    expect(screen.queryByRole("navigation", { name: "Phân hệ thiết bị CNS" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "PMDT Simulator - DME 1119A" })).toHaveClass("text-base");
    expect(workspace).toHaveClass("max-w-none");
    expect(workspace).not.toHaveClass("max-w-[1320px]");
    expect(workspace).toHaveClass("lg:px-8", "xl:px-10", "2xl:px-12");
  });

  it("renders the selected student module without an in-content tab bar", () => {
    const { container } = render(<StudentDashboard activeModule="vor" />);

    const workspace = container.firstChild;
    expect(screen.queryByRole("navigation", { name: "Phân hệ thiết bị CNS" })).not.toBeInTheDocument();
    expect(workspace).toHaveClass("max-w-none");
    expect(workspace).not.toHaveClass("max-w-[1320px]");
    expect(workspace).toHaveClass("lg:px-8", "xl:px-10", "2xl:px-12");
  });

  it("shows the DME student workflow instead of a placeholder", () => {
    render(<StudentDashboard activeModule="dme" />);

    expect(screen.getByRole("heading", { name: "Thực hành xử lý sự cố DME" })).toBeInTheDocument();
    expect(screen.getByText("Chưa có kịch bản DME")).toBeInTheDocument();
    expect(screen.queryByText(/đang trong quá trình phát triển/i)).not.toBeInTheDocument();
  });
});
