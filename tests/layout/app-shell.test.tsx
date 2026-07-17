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
      "Quản trị",
      "Học viên",
    ]);
    expect(within(navigation).getByRole("link", { name: "Quản trị" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(navigation.closest("aside")).toHaveClass("fixed");
    expect(navigation.closest("aside")).toHaveClass("w-20");
    links.forEach((link) => expect(link).toHaveClass("rounded-lg"));
  });
});
