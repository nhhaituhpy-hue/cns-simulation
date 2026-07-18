"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardText } from "@phosphor-icons/react/dist/csr/ClipboardText";
import { House } from "@phosphor-icons/react/dist/csr/House";
import { List } from "@phosphor-icons/react/dist/csr/List";
import { Student } from "@phosphor-icons/react/dist/csr/Student";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { Compass } from "@phosphor-icons/react/dist/csr/Compass";
import { Ruler } from "@phosphor-icons/react/dist/csr/Ruler";
import { Broadcast } from "@phosphor-icons/react/dist/csr/Broadcast";
import { SignOut } from "@phosphor-icons/react/dist/csr/SignOut";
import { UserCircle } from "@phosphor-icons/react/dist/csr/UserCircle";
import type { Icon } from "@phosphor-icons/react/dist/lib/types";
import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { logoutAction } from "@/app/login/actions";
import type { AuthProfile } from "@/lib/auth/profile";

type AppShellProps = {
  children: ReactNode;
  currentUser: AuthProfile | null;
};

type NavigationItem = {
  href: string;
  label: string;
  icon: Icon;
};

type WorkspaceSection = "admin" | "student";
type CnsModule = "vor" | "dme" | "ads-b";

const moduleItems: { id: CnsModule; label: string; icon: Icon }[] = [
  { id: "vor", label: "VOR", icon: Compass },
  { id: "dme", label: "DME", icon: Ruler },
  { id: "ads-b", label: "ADS-B", icon: Broadcast },
];

const navigationItems: NavigationItem[] = [
  { href: "/", label: "Trang chủ", icon: House },
  { href: "/admin/vor", label: "Giám khảo", icon: ClipboardText },
  { href: "/student/vor", label: "Thí sinh", icon: Student },
];

function visibleNavigationItems(role?: AuthProfile["role"]) {
  return navigationItems.filter((item) => {
    if (item.href.startsWith("/admin")) return role === "admin";
    if (item.href.startsWith("/student")) return Boolean(role);
    return true;
  });
}

function BrandWordmark() {
  return (
    <Link
      href="/"
      className="flex flex-col items-center justify-center text-center rounded-md px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
      aria-label="ATTECH, về trang chủ"
    >
      <span className="text-[17px] font-bold tracking-[0.16em] mr-[-0.16em] uppercase text-[var(--accent)] select-none leading-none">
        <span className="text-[var(--danger)]">A</span>TTECH
      </span>
      <span className="mt-1 text-[8.5px] font-medium tracking-[-0.02em] text-[#475569] select-none leading-none">
        Creative & Adaptive
      </span>
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

  if (!mobile) {
    return (
      <div
        role="group"
        aria-label={`Phân hệ ${section === "admin" ? "Giám khảo" : "Thí sinh"}`}
        className="mt-1 flex flex-col gap-1 pl-8"
      >
        {moduleItems.map((module) => {
          const active = activeModule === module.id;
          const ModuleIcon = module.icon;

          return (
            <Link
              key={module.id}
              href={`/${section}/${module.id}`}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex h-9 items-center rounded-md px-4 text-xs font-bold tracking-wide transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] motion-reduce:transition-none ${
                active
                  ? "text-[#0369a1] font-extrabold"
                  : "text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              <ModuleIcon size={14} weight="regular" className="mr-2 shrink-0 opacity-70" />
              <span className="relative">
                {module.label}
                {active && (
                  <span className="absolute bottom-[-3px] left-1/2 h-[1px] w-1/2 -translate-x-1/2 bg-[#0369a1] rounded-full" />
                )}
              </span>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={`Phân hệ ${section === "admin" ? "Giám khảo" : "Thí sinh"}`}
      className="ml-4 grid grid-cols-3 gap-1 border-l border-[var(--border-strong)] pl-3"
    >
      {moduleItems.map((module) => {
        const active = activeModule === module.id;

        return (
          <Link
            key={module.id}
            href={`/${section}/${module.id}`}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`inline-flex items-center justify-center rounded-md border text-[10px] font-semibold transition-[background-color,border-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset motion-reduce:transition-none min-h-9 px-2 ${
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

function MobileNavigation({ onNavigate, role }: {
  onNavigate?: () => void;
  role?: AuthProfile["role"];
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Điều hướng chính" className="grid gap-1">
      {visibleNavigationItems(role).map((item) => {
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

function DesktopNavigationRail({ role }: { role?: AuthProfile["role"] }) {
  const pathname = usePathname();

  return (
    <aside
      className="app-glass app-sidebar app-sidebar-custom sticky top-0 z-20 col-start-1 row-start-2 hidden h-[100dvh] w-20 self-start border-r border-[var(--border)] md:block"
      aria-label="Thanh điều hướng"
    >
      <div className="relative z-10 flex h-[4.25rem] items-center justify-center px-4 border-b border-[var(--border)]">
        <BrandWordmark />
      </div>
      <nav
        aria-label="Điều hướng chính"
        className="relative z-10 grid gap-1 px-3 pb-2 pt-10"
      >
        {visibleNavigationItems(role).map((item) => {
          const active = isItemActive(pathname, item.href);
          const workspaceSection = getWorkspaceSection(item.href);
          const ItemIcon = item.icon;

          return (
            <div key={item.href} className="grid gap-1">
              <Link
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={`group relative flex h-10 items-center rounded-lg px-4 text-[14px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset motion-reduce:transition-none ${
                  active
                    ? "text-[#0369a1] font-bold"
                    : "text-[#64748b] hover:text-[#0f172a] font-medium"
                }`}
              >
                <ItemIcon size={18} weight="regular" className="mr-2.5 shrink-0 opacity-80" />
                <span className="relative">
                  <span className="truncate block max-w-full">{item.label}</span>
                  {active && (
                    <span className="absolute bottom-[-3px] left-1/2 h-[1px] w-1/2 -translate-x-1/2 bg-[#0369a1] rounded-full" />
                  )}
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

function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: "easeInOut" }}
      className="h-full w-full"
    >
      {children}
    </motion.div>
  );
}

export function AppShell({ children, currentUser }: AppShellProps) {
  const pathname = usePathname();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  async function signOut() {
    setSigningOut(true);
    try {
      await logoutAction();
    } catch (error) {
      console.error("Logout action failed", error);
      setSigningOut(false);
    }
  }

  return (
    <div className="grid min-h-[100dvh] grid-cols-1 grid-rows-[4.25rem_minmax(0,1fr)] bg-[var(--background)] text-[var(--foreground)] md:grid-cols-[5rem_minmax(0,1fr)] app-layout-grid-custom">
      <style dangerouslySetInnerHTML={{ __html: `
        @media (min-width: 768px) {
          .app-layout-grid-custom {
            grid-template-columns: 11rem minmax(0, 1fr) !important;
            grid-template-rows: calc(4.25rem + 0.5cm) minmax(0, 1fr) !important;
            background-color: #ffffff !important;
          }
          .app-header-custom {
            grid-column: 2 / -1 !important;
            grid-row: 1 !important;
            margin-top: 0.5cm !important;
          }
          .app-sidebar-custom {
            grid-row: 1 / -1 !important;
            height: 100dvh !important;
            width: 11rem !important;
          }
          .app-content-custom {
            padding-top: 1cm !important;
            min-height: calc(100dvh - 4.25rem - 0.5cm) !important;
          }
        }
      `}} />
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-50 -translate-y-20 rounded bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 motion-reduce:transition-none"
      >
        Chuyển đến nội dung chính
      </a>

      <header className="bg-white relative overflow-hidden col-span-full z-30 h-[4.25rem] app-header-custom">
        <div className="relative z-10 flex h-full items-center justify-center px-4 sm:px-5">
          <div className="absolute left-4 flex items-center gap-3 md:hidden">
            <button
              type="button"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-[var(--text-primary)] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              aria-label="Mở điều hướng"
              aria-controls="mobile-navigation"
              aria-expanded={mobileNavigationOpen}
              onClick={() => setMobileNavigationOpen(true)}
            >
              <List aria-hidden size={21} weight="regular" />
            </button>
            <BrandWordmark />
          </div>

          <div className="min-w-0 text-center flex flex-col items-center justify-center">
            <p className="hidden truncate text-[13px] sm:text-[14px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)] sm:block leading-tight">
              Trung tâm Bảo đảm kỹ thuật
            </p>
            <p className="truncate text-[16px] sm:text-[18px] font-bold tracking-tight text-[var(--text-primary)] leading-tight mt-0.5">
              THỰC HÀNH MÔ PHỎNG CNS
            </p>
            <div className="mt-2 h-[1px] w-36 rounded-full bg-sky-700" />
          </div>

          <div className="absolute right-4 hidden items-center gap-2 sm:flex">
            {currentUser ? (
              <>
                <div className="hidden max-w-48 text-right lg:block">
                  <p className="truncate text-xs font-semibold text-[var(--text-primary)]">{currentUser.fullName}</p>
                  <p className="truncate text-[10px] text-[var(--text-muted)]">{currentUser.workUnit}</p>
                </div>
                <button
                  type="button"
                  onClick={signOut}
                  disabled={signingOut}
                  className="inline-flex size-9 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
                  aria-label="Đăng xuất"
                  title="Đăng xuất"
                >
                  <SignOut aria-hidden size={20} />
                </button>
              </>
            ) : (
              <Link href="/login" className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--accent)] px-3 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2">
                <UserCircle aria-hidden size={18} /> Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </header>

      <DesktopNavigationRail role={currentUser?.role} />

      <div className="row-start-2 min-h-[calc(100dvh-4.25rem)] min-w-0 md:col-start-2 app-content-custom">
        <main id="main-content" tabIndex={-1} className="min-w-0">
          <PageTransition>{children}</PageTransition>
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
              <MobileNavigation role={currentUser?.role} onNavigate={() => setMobileNavigationOpen(false)} />
              {currentUser ? (
                <button
                  type="button"
                  onClick={signOut}
                  disabled={signingOut}
                  className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--border-strong)] bg-white text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--danger)] disabled:opacity-50"
                >
                  <SignOut aria-hidden size={18} /> {signingOut ? "Đang đăng xuất..." : "Đăng xuất"}
                </button>
              ) : null}
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
