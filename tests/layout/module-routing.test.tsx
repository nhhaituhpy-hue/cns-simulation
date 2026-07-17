import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { StudentDashboard } from "@/components/qcms/student-dashboard";
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
  it("uses persistent admin module links", () => {
    render(<AdminDashboard activeModule="dme" />);

    expect(screen.getByRole("link", { name: "VOR" })).toHaveAttribute("href", "/admin/vor");
    expect(screen.getByRole("link", { name: "DME" })).toHaveAttribute("href", "/admin/dme");
    expect(screen.getByRole("link", { name: "ADS-B" })).toHaveAttribute("href", "/admin/ads-b");
    expect(screen.getByRole("link", { name: "DME" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { name: "PMDT Simulator - DME 1118A/1119A" })).toBeInTheDocument();
  });

  it("uses persistent student module links", () => {
    render(<StudentDashboard activeModule="vor" />);

    expect(screen.getByRole("link", { name: "VOR" })).toHaveAttribute("href", "/student/vor");
    expect(screen.getByRole("link", { name: "DME" })).toHaveAttribute("href", "/student/dme");
    expect(screen.getByRole("link", { name: "ADS-B" })).toHaveAttribute("href", "/student/ads-b");
    expect(screen.getByRole("link", { name: "VOR" })).toHaveAttribute("aria-current", "page");
  });

  it("shows the DME student workflow instead of a placeholder", () => {
    render(<StudentDashboard activeModule="dme" />);

    expect(screen.getByRole("heading", { name: "Thực hành xử lý sự cố DME" })).toBeInTheDocument();
    expect(screen.getByText("Chưa có kịch bản DME")).toBeInTheDocument();
    expect(screen.queryByText(/đang trong quá trình phát triển/i)).not.toBeInTheDocument();
  });
});
