"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GearSix,
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

const navigationItems: NavigationItem[] = [
  { href: "/", label: "Trang chủ", icon: House },
  { href: "/admin/vor", label: "Quản trị", icon: GearSix },
  { href: "/student/vor", label: "Học viên", icon: Student },
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

function MobileNavigation({ onNavigate }: {
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Điều hướng chính" className="grid gap-1">
      {navigationItems.map((item) => {
        const active = isItemActive(pathname, item.href);
        const ItemIcon = item.icon;

        return (
          <Link
            key={item.href}
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
        );
      })}
    </nav>
  );
}

function DesktopNavigationRail() {
  const pathname = usePathname();

  return (
    <aside
      className="app-glass fixed bottom-0 left-0 top-[4.25rem] z-20 hidden w-20 border-r border-[var(--border)] md:block"
      aria-label="Thanh điều hướng"
    >
      <nav
        aria-label="Điều hướng chính"
        className="relative z-10 grid gap-1.5 p-2"
      >
        {navigationItems.map((item) => {
          const active = isItemActive(pathname, item.href);
          const ItemIcon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={`group relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border px-1 text-[var(--text-secondary)] transition-[background-color,border-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset motion-reduce:transition-none ${
                active
                  ? "border-[var(--accent-border)] bg-[var(--surface)] text-[var(--accent)] shadow-[var(--shadow-sm)]"
                  : "border-transparent hover:bg-white/70 hover:text-[var(--text-primary)]"
              }`}
            >
              <ItemIcon aria-hidden size={21} weight={active ? "duotone" : "regular"} />
              <span aria-hidden="true" className="max-w-full truncate text-[10px] font-semibold leading-none">
                {item.label}
              </span>
            </Link>
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
    ? "Không gian giám khảo"
    : pathname.startsWith("/student")
      ? "Không gian học viên"
      : "Cổng hệ thống";

  return (
    <div className="min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)]">
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-50 -translate-y-20 rounded bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 motion-reduce:transition-none"
      >
        Chuyển đến nội dung chính
      </a>

      <header className="app-glass sticky top-0 z-30 h-[4.25rem] border-b border-[var(--border)]">
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

      <div className="min-h-[calc(100dvh-4.25rem)] md:pl-20">
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
