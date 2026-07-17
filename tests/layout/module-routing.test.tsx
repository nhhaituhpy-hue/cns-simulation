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
  it("renders the selected admin module without an in-content tab bar", () => {
    render(<AdminDashboard activeModule="dme" />);

    const workspace = screen.getByRole("banner").parentElement;

    expect(screen.queryByRole("navigation", { name: "Phân hệ thiết bị CNS" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "PMDT Simulator - DME 1118A/1119A" })).toHaveClass("text-base");
    expect(screen.getByRole("heading", { name: "Quản lý kịch bản kiểm tra" })).toHaveClass(
      "text-2xl",
      "sm:text-[1.75rem]",
    );
    expect(workspace).toHaveClass("max-w-none");
    expect(workspace).not.toHaveClass("max-w-[1320px]");
    expect(workspace).toHaveClass("lg:px-8", "xl:px-10", "2xl:px-12");
  });

  it("renders the selected student module without an in-content tab bar", () => {
    render(<StudentDashboard activeModule="vor" />);

    const workspace = screen.getByRole("banner").parentElement;

    expect(screen.queryByRole("navigation", { name: "Phân hệ thiết bị CNS" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bài thực hành mô phỏng CNS" })).toHaveClass(
      "text-2xl",
      "sm:text-[1.75rem]",
    );
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
