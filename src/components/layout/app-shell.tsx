"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardText,
  House,
  List,
  Student,
  UserCircle,
  X,
  type Icon,
} from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
};

type NavigationItem = {
  href: string;
  label: string;
  icon: Icon;
};

type WorkspaceSection = "admin" | "student";
type CnsModule = "vor" | "dme" | "ads-b";

const moduleItems: { id: CnsModule; label: string }[] = [
  { id: "vor", label: "VOR" },
  { id: "dme", label: "DME" },
  { id: "ads-b", label: "ADS-B" },
];

const navigationItems: NavigationItem[] = [
  { href: "/", label: "Trang chủ", icon: House },
  { href: "/admin/vor", label: "Giám khảo", icon: ClipboardText },
  { href: "/student/vor", label: "Thí sinh", icon: Student },
];

function BrandWordmark() {
  return (
    <Link
      href="/"
      className="inline-flex shrink-0 items-baseline rounded-md px-1 py-1 text-[15px] font-bold tracking-[-0.045em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
      aria-label="ATTECH, về trang chủ"
    >
      <span className="text-[var(--danger)]">A</span>
      <span className="text-[var(--accent)]">TTECH</span>
    </Link>
  );
}

function isItemActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href;
  }

  const section = href.split("/")[1];
  return pathname.startsWith(`/${section}`);
}

function getWorkspaceSection(href: string): WorkspaceSection | null {
  if (href.startsWith("/admin")) return "admin";
  if (href.startsWith("/student")) return "student";
  return null;
}

function getActiveModule(pathname: string): CnsModule | null {
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/student")) {
    return null;
  }

  if (pathname.startsWith("/admin/vor") || pathname.startsWith("/student/vor")) {
    return "vor";
  }

  if (pathname.startsWith("/admin/dme") || pathname.startsWith("/student/dme")) {
    return "dme";
  }

  return "ads-b";
}

function ModuleSubTabs({
  section,
  pathname,
  mobile = false,
  onNavigate,
}: {
  section: WorkspaceSection;
  pathname: string;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const activeModule = getActiveModule(pathname);

  return (
    <div
      role="group"
      aria-label={`Phân hệ ${section === "admin" ? "Giám khảo" : "Thí sinh"}`}
      className={
        mobile
          ? "ml-4 grid grid-cols-3 gap-1 border-l border-[var(--border-strong)] pl-3"
          : "ml-2 grid gap-1 border-l border-[var(--border-strong)] pl-1.5"
      }
    >
      {moduleItems.map((module) => {
        const active = activeModule === module.id;

        return (
          <Link
            key={module.id}
            href={`/${section}/${module.id}`}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`inline-flex items-center justify-center rounded-md border text-[10px] font-semibold transition-[background-color,border-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset motion-reduce:transition-none ${
              mobile ? "min-h-9 px-2" : "h-7 px-1"
            } ${
              active
                ? "border-[var(--accent-border)] bg-[var(--accent-muted)] text-[var(--accent)]"
                : "border-transparent text-[var(--text-muted)] hover:bg-white/70 hover:text-[var(--text-primary)]"
            }`}
          >
            {module.label}
          </Link>
        );
      })}
    </div>
  );
}

function MobileNavigation({ onNavigate }: {
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Điều hướng chính" className="grid gap-1">
      {navigationItems.map((item) => {
        const active = isItemActive(pathname, item.href);
        const ItemIcon = item.icon;
        const workspaceSection = getWorkspaceSection(item.href);

        return (
          <div key={item.href} className="grid gap-1">
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`group relative flex min-h-11 items-center gap-3 rounded border-l-2 px-3 text-sm font-medium transition-[background-color,color,border-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset motion-reduce:transition-none ${
                active
                  ? "border-[var(--accent)] bg-white text-[var(--accent)]"
                  : "border-transparent text-[var(--text-secondary)] hover:bg-white hover:text-[var(--text-primary)]"
              }`}
            >
              <ItemIcon aria-hidden size={20} weight="regular" />
              <span className="truncate">{item.label}</span>
            </Link>
            {active && workspaceSection ? (
              <ModuleSubTabs
                section={workspaceSection}
                pathname={pathname}
                mobile
                onNavigate={onNavigate}
              />
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

function DesktopNavigationRail() {
  const pathname = usePathname();

  return (
    <aside
      className="app-glass app-sidebar sticky top-0 z-20 col-start-1 row-start-2 hidden h-[100dvh] w-20 self-start border-r border-[var(--border)] md:block"
      aria-label="Thanh điều hướng"
    >
      <nav
        aria-label="Điều hướng chính"
        className="relative z-10 grid gap-1.5 px-2 pb-2 pt-10"
      >
        {navigationItems.map((item) => {
          const active = isItemActive(pathname, item.href);
          const ItemIcon = item.icon;
          const workspaceSection = getWorkspaceSection(item.href);

          return (
            <div key={item.href} className="grid gap-1">
              <Link
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={`group relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border px-1 text-[var(--text-secondary)] transition-[background-color,border-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset motion-reduce:transition-none ${
                  active
                    ? "border-[var(--accent-border)] bg-[var(--surface)] text-[var(--accent)] shadow-[var(--shadow-sm)]"
                    : "border-transparent hover:bg-white/70 hover:text-[var(--text-primary)]"
                }`}
              >
                <ItemIcon aria-hidden size={21} weight="regular" />
                <span aria-hidden="true" className="max-w-full truncate text-[10px] font-semibold leading-none">
                  {item.label}
                </span>
              </Link>
              {active && workspaceSection ? (
                <ModuleSubTabs section={workspaceSection} pathname={pathname} />
              ) : null}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

export function AppShell({ children }: AppShellProps) {
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const pathname = usePathname();
  const workspaceLabel = pathname.startsWith("/admin")
    ? "Giám khảo"
    : pathname.startsWith("/student")
      ? "Thí sinh"
      : "Cổng hệ thống";

  return (
    <div className="grid min-h-[100dvh] grid-cols-1 grid-rows-[4.25rem_minmax(0,1fr)] bg-[var(--background)] text-[var(--foreground)] md:grid-cols-[5rem_minmax(0,1fr)]">
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-50 -translate-y-20 rounded bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 motion-reduce:transition-none"
      >
        Chuyển đến nội dung chính
      </a>

      <header className="app-glass relative overflow-hidden col-span-full z-30 h-[4.25rem] border-b border-[var(--border)]">
        <div className="relative z-10 flex h-full items-center gap-3 px-4 sm:px-5 md:pl-0">
          <button
            type="button"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-[var(--text-primary)] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] md:hidden"
            aria-label="Mở điều hướng"
            aria-controls="mobile-navigation"
            aria-expanded={mobileNavigationOpen}
            onClick={() => setMobileNavigationOpen(true)}
          >
            <List aria-hidden size={21} weight="regular" />
          </button>

          <div className="flex shrink-0 items-center md:h-full md:w-20 md:justify-center md:border-r md:border-[var(--border)]">
            <BrandWordmark />
          </div>

          <div className="min-w-0 md:pl-1">
            <p className="hidden truncate text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)] sm:block">
              Trung tâm Bảo đảm kỹ thuật
            </p>
            <p className="truncate text-sm font-semibold tracking-tight text-[var(--text-primary)] sm:text-[15px]">
              Hệ thống kiểm tra mô phỏng CNS
            </p>
          </div>

          <div className="ml-auto hidden shrink-0 items-center gap-2 rounded-lg border border-[var(--border)] bg-white/70 px-3 py-2 text-sm text-[var(--text-secondary)] shadow-[var(--shadow-sm)] sm:flex">
            <UserCircle aria-hidden size={19} weight="duotone" className="text-[var(--accent)]" />
            <span className="font-medium">{workspaceLabel}</span>
          </div>
        </div>
      </header>

      <DesktopNavigationRail />

      <div className="row-start-2 min-h-[calc(100dvh-4.25rem)] min-w-0 md:col-start-2">
        <main id="main-content" tabIndex={-1} className="min-w-0">
          {children}
        </main>
      </div>

      {mobileNavigationOpen ? (
        <div
          className="fixed inset-0 top-[4.25rem] z-40 md:hidden"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setMobileNavigationOpen(false);
            }
          }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#16242f]/25 backdrop-blur-[2px]"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setMobileNavigationOpen(false)}
          />
          <aside
            id="mobile-navigation"
            className="app-glass relative h-full w-[min(19rem,88vw)] border-r border-[var(--border)] shadow-[var(--shadow-panel)]"
            aria-label="Điều hướng trên thiết bị di động"
          >
            <div className="relative z-10 flex h-full flex-col p-4">
              <div className="mb-5 flex items-center justify-between border-b border-[var(--border-strong)] pb-4">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  Điều hướng
                </span>
                <button
                  type="button"
                  className="inline-flex size-9 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-white hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  aria-label="Đóng điều hướng"
                  onClick={() => setMobileNavigationOpen(false)}
                >
                  <X aria-hidden size={20} weight="regular" />
                </button>
              </div>
              <MobileNavigation onNavigate={() => setMobileNavigationOpen(false)} />
              <p className="mt-auto border-t border-[var(--border-strong)] pt-4 text-xs text-[var(--text-muted)]">
                Công cụ đào tạo CNS
              </p>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
