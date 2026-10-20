import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "@/components/layout/app-shell";
import { DEFAULT_SCENARIOS, useScenarioStore } from "@/stores/scenario-store";
import { SCENARIO_STORAGE_KEY, serializeScenarioStorage } from "@/lib/storage";

const mockLogout = vi.hoisted(() => vi.fn());
vi.mock("@/app/login/actions", () => ({ logoutAction: mockLogout }));
const mockUsePathname = vi.hoisted(() => vi.fn());
const mockRouter = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn(), refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: mockUsePathname,
  useRouter: () => mockRouter,
}));

const adminUser = {
  id: "admin-user",
  email: "admin@attech.com.vn",
  fullName: "Quản trị viên",
  workUnit: "Trung tâm Bảo đảm kỹ thuật",
  role: "admin" as const,
  mustChangePassword: false,
};

beforeEach(() => {
  mockUsePathname.mockReturnValue("/admin/dme");
});

function renderShell() {
  return render(
    <AppShell currentUser={adminUser}>
      <p>Nội dung kiểm thử</p>
    </AppShell>,
  );
}

function desktopNavigation() {
  return screen.getByRole("navigation", { name: "Điều hướng chính" });
}

describe("AppShell", () => {
  it("clears the private singleton before awaiting logout and keeps consumers gated", () => {
    let duringLogout: string[] | undefined;
    mockLogout.mockImplementationOnce(() => {
      duringLogout = useScenarioStore.getState().scenarios.map(scenario => scenario.id);
      return new Promise<void>(() => {});
    });
    renderShell();
    const draft = { ...DEFAULT_SCENARIOS[0], id: "logout-private-draft" };
    act(() => { useScenarioStore.setState({ scenarios: [draft], isHydrated: true }); });
    window.localStorage.setItem(SCENARIO_STORAGE_KEY, serializeScenarioStorage([draft]));
    fireEvent.click(screen.getByRole("button", { name: "Tài khoản: Quản trị viên" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Đăng xuất" }));
    expect(duringLogout).toEqual([]);
    expect(window.localStorage.getItem(SCENARIO_STORAGE_KEY)).toBeNull();
    expect(screen.queryByText("Nội dung kiểm thử")).not.toBeInTheDocument();
  });
  it("keeps a hard-navigation recovery visible after logout rejects without restoring private state", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mockLogout.mockRejectedValueOnce(new Error("Network unavailable"));
    try {
      const view = renderShell();
      const draft = { ...DEFAULT_SCENARIOS[0], id: "failed-logout-private-draft" };
      act(() => { useScenarioStore.setState({ scenarios: [draft], isHydrated: true }); });
      window.localStorage.setItem(SCENARIO_STORAGE_KEY, serializeScenarioStorage([draft]));
      fireEvent.click(screen.getByRole("button", { name: "Tài khoản: Quản trị viên" }));
      fireEvent.click(screen.getByRole("menuitem", { name: "Đăng xuất" }));
      await waitFor(() => expect(log).toHaveBeenCalled());
      view.rerender(<AppShell currentUser={adminUser}><p>Nội dung kiểm thử</p></AppShell>);
      expect(screen.getByRole("link", { name: "Tải lại trang đăng nhập" })).toHaveAttribute("href", "/login");
      expect(screen.getByRole("status")).toHaveTextContent("xác minh phiên đăng nhập");
      expect(screen.queryByText("Nội dung kiểm thử")).not.toBeInTheDocument();
      expect(useScenarioStore.getState().scenarios).toEqual([]);
      expect(useScenarioStore.getState().sessionIdentity).toBeNull();
      expect(window.localStorage.getItem(SCENARIO_STORAGE_KEY)).toBeNull();
    } finally { log.mockRestore(); }
  });
  it.each([
    { ...adminUser, id: "student-user", role: "student" as const },
    { ...adminUser, role: "student" as const },
    { ...adminUser, id: "other-admin" },
    { ...adminUser, role: "teacher" as const },
    null,
  ])("does not render a private source even once after profile transition to %j", (nextUser) => {
    const observed: string[][] = [];
    function ScenarioConsumer() {
      const ids = useScenarioStore(state => state.scenarios).map(scenario => scenario.id);
      observed.push(ids);
      return <p>{ids.join(",")}</p>;
    }
    const view = render(<AppShell currentUser={adminUser}><ScenarioConsumer /></AppShell>);
    act(() => { useScenarioStore.setState({ scenarios: [{ ...DEFAULT_SCENARIOS[0], id: "private-admin-draft" }], isHydrated: true }); });
    observed.length = 0;
    view.rerender(<AppShell currentUser={nextUser}><ScenarioConsumer /></AppShell>);
    expect(observed.flat()).not.toContain("private-admin-draft");
    expect(useScenarioStore.getState().scenarios).toEqual([]);
  });
  it("shows the horizontal admin navigation and marks Kịch bản active", () => {
    renderShell();

    const navigation = desktopNavigation();
    expect(
      within(navigation).getAllByRole("link").map((link) => link.textContent),
    ).toEqual([
      "Trang chủ",
      "Simulator",
      "Kịch bản",
      "Ôn tập",
      "Giám khảo",
      "Thí sinh",
    ]);
    expect(
      within(navigation).getByRole("link", { name: "Kịch bản" }),
    ).toHaveAttribute("aria-current", "page");

    const header = screen.getByRole("banner");
    const main = screen.getByRole("main");
    expect(header).toHaveClass("sticky");
    expect(header).not.toHaveClass("fixed");
    expect(main).toHaveAttribute("id", "main-content");
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("marks only Ôn tập active on a review route", () => {
    mockUsePathname.mockReturnValue("/student/ads-b");
    renderShell();

    const currentLinks = within(desktopNavigation())
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");

    expect(currentLinks.map((link) => link.textContent)).toEqual(["Ôn tập"]);
  });

  it("marks only Giám khảo active on a nested exam route", () => {
    mockUsePathname.mockReturnValue("/admin/exams/exam-123");
    renderShell();

    const currentLinks = within(desktopNavigation())
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");

    expect(currentLinks.map((link) => link.textContent)).toEqual(["Giám khảo"]);
  });

  it("opens the mobile navigation and shows the active workspace modules", () => {
    renderShell();

    fireEvent.click(screen.getByRole("button", { name: "Mở điều hướng" }));

    const drawer = screen.getByRole("complementary", {
      name: "Điều hướng trên thiết bị di động",
    });
    expect(drawer).toBeInTheDocument();
    expect(
      within(drawer).getByRole("group", { name: "Phân hệ authoring" }),
    ).toBeInTheDocument();
    expect(
      within(drawer).getByRole("link", { name: "DME 1119A" }),
    ).toHaveAttribute("aria-current", "page");

    fireEvent.click(within(drawer).getByRole("button", { name: "Đóng điều hướng" }));
    expect(
      screen.queryByRole("complementary", {
        name: "Điều hướng trên thiết bị di động",
      }),
    ).not.toBeInTheDocument();
  });

  it("opens the account menu and change-password dialog from the user name", () => {
    renderShell();

    fireEvent.click(screen.getByRole("button", { name: "Tài khoản: Quản trị viên" }));
    const accountMenu = screen.getByRole("menu", { name: "Tài khoản" });
    expect(within(accountMenu).getByRole("menuitem", { name: "Đổi mật khẩu" })).toBeInTheDocument();

    fireEvent.click(within(accountMenu).getByRole("menuitem", { name: "Đổi mật khẩu" }));
    const dialog = screen.getByRole("dialog", { name: "Đổi mật khẩu" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Mật khẩu hiện tại")).toHaveAttribute("autocomplete", "current-password");
    expect(within(dialog).getByLabelText("Mật khẩu mới")).toHaveAttribute("autocomplete", "new-password");
    expect(within(dialog).getByLabelText("Xác nhận mật khẩu mới")).toBeInTheDocument();
  });

  it("keeps only Simulator active on the DVOR 1150 block-diagram route", () => {
    mockUsePathname.mockReturnValue("/simulator/dvor-1150/block-diagram");
    renderShell();

    const currentLinks = within(desktopNavigation())
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");

    expect(currentLinks.map((link) => link.textContent)).toEqual(["Simulator"]);
    expect(
      screen.queryByRole("navigation", { name: "Menu chức năng" }),
    ).not.toBeInTheDocument();
  });

  it("shows the global header and home back action on the ADS-B simulator route", () => {
    const pathname = "/simulator/ads-b";
    mockUsePathname.mockReturnValue(pathname);
    renderShell();

    expect(screen.getByText("Nội dung kiểm thử")).toBeInTheDocument();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quay lại trang chủ" })).toBeInTheDocument();
  });

  it.each([
    "/simulator/dvor-1150",
    "/simulator/dvor-1150a",
    "/simulator/dme-1119a",
    "/simulator/software/dvor-220",
    "/simulator/software/dme-320",
  ])("leaves the home back action to the PMDT toolbar on simulator route %s", (pathname) => {
    mockUsePathname.mockReturnValue(pathname);
    renderShell();

    expect(screen.queryByRole("button", { name: "Quay lại trang chủ" })).not.toBeInTheDocument();
  });

  it("returns to the home page from a simulator detail route", () => {
    mockUsePathname.mockReturnValue("/simulator/ads-b");
    renderShell();

    fireEvent.click(screen.getByRole("button", { name: "Quay lại trang chủ" }));

    expect(mockRouter.push).toHaveBeenCalledWith("/");
  });
});
