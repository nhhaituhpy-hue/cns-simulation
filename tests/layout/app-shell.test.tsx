import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "@/components/layout/app-shell";

const mockUsePathname = vi.hoisted(() => vi.fn());
const mockRouter = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));

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
  document.documentElement.dataset.theme = "light";
  window.localStorage.clear();
});

describe("AppShell", () => {
  it("shows the admin destinations and marks Tạo kịch bản as the current workspace", () => {
    render(
      <AppShell currentUser={adminUser}>
        <p>Nội dung kiểm thử</p>
      </AppShell>,
    );

    const navigation = screen.getByRole("navigation", {
      name: "Điều hướng chính",
    });
    const links = within(navigation)
      .getAllByRole("link")
      .filter((link) => link.hasAttribute("aria-label"));

    expect(links).toHaveLength(6);
    expect(links.map((link) => link.getAttribute("aria-label"))).toEqual([
      "Trang chủ",
      "Simulator",
      "Tạo kịch bản",
      "Ôn tập",
      "Giám khảo",
      "Thí sinh",
    ]);
    expect(within(navigation).getByRole("link", { name: "Tạo kịch bản" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    const moduleTabs = screen.getByRole("group", { name: "Phân hệ Tạo kịch bản" });
    expect(
      within(moduleTabs).getAllByRole("link").map((link) => link.textContent),
    ).toEqual(["DVOR 1150", "DVOR 1150A", "DME 1119A", "DVOR 220", "DME 320", "ADS-B", "VHF", "VSAT"]);
    expect(within(moduleTabs).getByRole("link", { name: "DME 1119A" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    const sidebar = navigation.closest("aside");
    const header = screen.getByRole("banner");
    const main = screen.getByRole("main");
    const shell = header.parentElement;

    expect(shell).toHaveClass("grid");
    expect(shell).toHaveClass("md:grid-cols-[5rem_minmax(0,1fr)]");
    expect(header).toHaveClass("col-span-full");
    expect(header).not.toHaveClass("fixed");
    expect(sidebar).toHaveClass("sticky");
    expect(sidebar).not.toHaveClass("fixed");
    expect(sidebar).toHaveClass("row-start-2");
    expect(sidebar).toHaveClass("top-0");
    expect(sidebar).toHaveClass("w-20");
    expect(sidebar).toHaveClass("app-sidebar");
    expect(navigation).toHaveClass("pt-10");
    expect(main.parentElement).toHaveClass("row-start-2");
    expect(main.parentElement).toHaveClass("md:col-start-2");
    links.forEach((link) => expect(link).toHaveClass("rounded-lg"));
  });

  it("shows the review modules under the active Ôn tập destination", () => {
    mockUsePathname.mockReturnValue("/student/ads-b");

    render(
      <AppShell currentUser={adminUser}>
        <p>Nội dung kiểm thử</p>
      </AppShell>,
    );

    const moduleTabs = screen.getByRole("group", { name: "Phân hệ Ôn tập" });
    expect(
      within(moduleTabs).getAllByRole("link").map((link) => link.textContent),
    ).toEqual(["DVOR 1150", "DVOR 1150A", "DME 1119A", "DVOR 220", "DME 320", "ADS-B", "VHF", "VSAT"]);
    expect(within(moduleTabs).getByRole("link", { name: "ADS-B" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("marks nested non-module routes without activating a neighboring tab", () => {
    mockUsePathname.mockReturnValue("/admin/exams/exam-123");

    render(
      <AppShell currentUser={adminUser}>
        <p>Nội dung kiểm thử</p>
      </AppShell>,
    );

    const moduleTabs = screen.getByRole("group", { name: "Phân hệ Giám khảo" });
    expect(within(moduleTabs).getByRole("link", { name: "Quản lý kỳ thi" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(moduleTabs).getByRole("link", { name: "Quản lý đề thi" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("collapses and expands the active submenu when its parent is clicked again", () => {
    render(
      <AppShell currentUser={adminUser}>
        <p>Nội dung kiểm thử</p>
      </AppShell>,
    );

    const parent = screen.getByRole("link", { name: "Tạo kịch bản" });
    expect(screen.getByRole("group", { name: "Phân hệ Tạo kịch bản" })).toBeInTheDocument();

    fireEvent.click(parent);
    expect(screen.queryByRole("group", { name: "Phân hệ Tạo kịch bản" })).not.toBeInTheDocument();

    fireEvent.click(parent);
    expect(screen.getByRole("group", { name: "Phân hệ Tạo kịch bản" })).toBeInTheDocument();
  });

  it("toggles and stores the selected global theme", () => {
    render(
      <AppShell currentUser={adminUser}>
        <p>Nội dung kiểm thử</p>
      </AppShell>,
    );

    const themeToggle = screen.getByRole("button", { name: "Chuyển chế độ sáng/tối" });
    fireEvent.click(themeToggle);

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(window.localStorage.getItem("cns-app-theme")).toBe("dark");

    fireEvent.click(themeToggle);

    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(window.localStorage.getItem("cns-app-theme")).toBe("light");
  });

  it("keeps the classic DVOR PMDT routes outside the global app shell", () => {
    mockUsePathname.mockReturnValue("/simulator/dvor-1150a");

    render(
      <AppShell currentUser={adminUser}>
        <p>Nội dung kiểm thử</p>
      </AppShell>,
    );

    expect(screen.getByText("Nội dung kiểm thử")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Điều hướng chính" })).not.toBeInTheDocument();
  });

  it("shows contextual header titles for the remaining workspace menus", () => {
    mockUsePathname.mockReturnValue("/admin/exams");

    const { rerender } = render(
      <AppShell currentUser={adminUser}>
        <p>Nội dung kiểm thử</p>
      </AppShell>,
    );

    expect(
      screen.getByRole("heading", { name: "Quản lý kỳ thi" }),
    ).toBeInTheDocument();

    mockUsePathname.mockReturnValue("/student/ads-b");
    rerender(
      <AppShell currentUser={adminUser}>
        <p>Nội dung kiểm thử</p>
      </AppShell>,
    );

    expect(screen.getByRole("heading", { name: "ADS-B" })).toBeInTheDocument();
  });
});
