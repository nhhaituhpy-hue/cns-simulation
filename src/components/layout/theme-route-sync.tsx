"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

function isDarkRoute(pathname: string): boolean {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  // Keep equipment screens dark; the simulator catalog uses the light theme.
  return normalizedPath === "/" || normalizedPath.startsWith("/simulator/");
}

export function ThemeRouteSync() {
  const pathname = usePathname();

  useEffect(() => {
    const theme = isDarkRoute(pathname ?? "") ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
  }, [pathname]);

  return null;
}
