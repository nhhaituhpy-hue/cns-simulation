import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "@/components/layout/app-shell";

const mockUsePathname = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ usePathname: mockUsePathname }));

beforeEach(() => {
  mockUsePathname.mockReturnValue("/admin/dme");
});

describe("AppShell", () => {
  it("shows three compact desktop destinations and marks the current route", () => {
    render(
      <AppShell>
        <p>Nội dung kiểm thử</p>
      </AppShell>,
    );

    const navigation = screen.getByRole("navigation", {
      name: "Điều hướng chính",
    });
    const links = within(navigation)
      .getAllByRole("link")
      .filter((link) => link.hasAttribute("aria-label"));

    expect(links).toHaveLength(3);
    expect(links.map((link) => link.getAttribute("aria-label"))).toEqual([
      "Trang chủ",
      "Giám khảo",
      "Thí sinh",
    ]);
    expect(within(navigation).getByRole("link", { name: "Giám khảo" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    const moduleTabs = screen.getByRole("group", { name: "Phân hệ Giám khảo" });
    expect(within(moduleTabs).getAllByRole("link")).toHaveLength(3);
    expect(within(moduleTabs).getByRole("link", { name: "VOR" })).toHaveAttribute(
      "href",
      "/admin/vor",
    );
    expect(within(moduleTabs).getByRole("link", { name: "DME" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(moduleTabs).getByRole("link", { name: "ADS-B" })).toHaveAttribute(
      "href",
      "/admin/ads-b",
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

  it("shows student module sub-tabs under the active student destination", () => {
    mockUsePathname.mockReturnValue("/student/ads-b");

    render(
      <AppShell>
        <p>Nội dung kiểm thử</p>
      </AppShell>,
    );

    const moduleTabs = screen.getByRole("group", { name: "Phân hệ Thí sinh" });
    expect(within(moduleTabs).getByRole("link", { name: "VOR" })).toHaveAttribute(
      "href",
      "/student/vor",
    );
    expect(within(moduleTabs).getByRole("link", { name: "DME" })).toHaveAttribute(
      "href",
      "/student/dme",
    );
    expect(within(moduleTabs).getByRole("link", { name: "ADS-B" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
