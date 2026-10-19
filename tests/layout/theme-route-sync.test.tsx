import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeRouteSync } from "@/components/layout/theme-route-sync";

const route = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.theme;
});

describe("route themes", () => {
  it("switches from home to the light catalog and back to equipment screens", () => {
    route.pathname = "/";
    const view = render(<ThemeRouteSync />);
    expect(document.documentElement.dataset.theme).toBe("dark");

    for (const pathname of ["/simulator", "/simulator/", "/authoring"]) {
      route.pathname = pathname;
      view.rerender(<ThemeRouteSync />);
      expect(document.documentElement.dataset.theme).toBe("light");
    }

    route.pathname = "/simulator/software/dme-320";
    view.rerender(<ThemeRouteSync />);
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
