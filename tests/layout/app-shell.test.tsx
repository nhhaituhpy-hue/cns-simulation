import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppShell } from "@/components/layout/app-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
}));

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
    const links = within(navigation).getAllByRole("link");

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
    const sidebar = navigation.closest("aside");
    const header = screen.getByRole("banner");
    const main = screen.getByRole("main");
    const shell = header.parentElement;

    expect(shell).toHaveClass("grid");
    expect(shell).toHaveClass("md:grid-cols-[5rem_minmax(0,1fr)]");
    expect(header).toHaveClass("row-start-1");
    expect(header).toHaveClass("md:col-span-2");
    expect(sidebar).toHaveClass("sticky");
    expect(sidebar).not.toHaveClass("fixed");
    expect(sidebar).toHaveClass("row-start-2");
    expect(sidebar).toHaveClass("top-[4.25rem]");
    expect(sidebar).toHaveClass("w-20");
    expect(sidebar).toHaveClass("app-sidebar");
    expect(navigation).toHaveClass("pt-10");
    expect(main.parentElement).toHaveClass("row-start-2");
    expect(main.parentElement).toHaveClass("md:col-start-2");
    links.forEach((link) => expect(link).toHaveClass("rounded-lg"));
  });
});
