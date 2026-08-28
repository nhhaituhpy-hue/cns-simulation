import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "@/components/layout/app-shell";

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
  it("shows the horizontal admin navigation and marks Tạo kịch bản active", () => {
    renderShell();

    const navigation = desktopNavigation();
    expect(
      within(navigation).getAllByRole("link").map((link) => link.textContent),
    ).toEqual([
      "Trang chủ",
      "Simulator",
      "Tạo kịch bản",
      "Ôn tập",
      "Giám khảo",
      "Thí sinh",
    ]);
    expect(
      within(navigation).getByRole("link", { name: "Tạo kịch bản" }),
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

  it.each([
    "/simulator/dvor-1150",
    "/simulator/dvor-1150a",
    "/simulator/dme-1119a",
    "/simulator/ads-b",
    "/simulator/software/dvor-220",
    "/simulator/software/dme-320",
  ])("shows the global header and back action on simulator route %s", (pathname) => {
    mockUsePathname.mockReturnValue(pathname);
    renderShell();

    expect(screen.getByText("Nội dung kiểm thử")).toBeInTheDocument();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quay lại trang trước" })).toBeInTheDocument();
  });

  it("falls back to the simulator catalog when browser history has no previous entry", () => {
    mockUsePathname.mockReturnValue("/simulator/dvor-1150");
    renderShell();

    fireEvent.click(screen.getByRole("button", { name: "Quay lại trang trước" }));

    expect(mockRouter.push).toHaveBeenCalledWith("/simulator");
  });
});
