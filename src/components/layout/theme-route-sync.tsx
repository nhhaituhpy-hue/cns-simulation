"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const DARK_ROUTES = ["/", "/simulator"];

function isDarkRoute(pathname: string): boolean {
  return DARK_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function ThemeRouteSync() {
  const pathname = usePathname();

  useEffect(() => {
    const theme = isDarkRoute(pathname ?? "") ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
  }, [pathname]);

  return null;
}
