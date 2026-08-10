"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardText } from "@phosphor-icons/react/dist/csr/ClipboardText";
import { CalendarCheck } from "@phosphor-icons/react/dist/csr/CalendarCheck";
import { House } from "@phosphor-icons/react/dist/csr/House";
import { List } from "@phosphor-icons/react/dist/csr/List";
import { Student } from "@phosphor-icons/react/dist/csr/Student";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { BookOpenText } from "@phosphor-icons/react/dist/csr/BookOpenText";
import { CaretDown } from "@phosphor-icons/react/dist/csr/CaretDown";
import { DesktopTower } from "@phosphor-icons/react/dist/csr/DesktopTower";
import { Exam } from "@phosphor-icons/react/dist/csr/Exam";
import { FilePlus } from "@phosphor-icons/react/dist/csr/FilePlus";
import { SignIn } from "@phosphor-icons/react/dist/csr/SignIn";
import { SignOut } from "@phosphor-icons/react/dist/csr/SignOut";
import { UserCircle } from "@phosphor-icons/react/dist/csr/UserCircle";
import type { Icon } from "@phosphor-icons/react/dist/lib/types";
import { useState, type MouseEvent, type ReactNode } from "react";
import { motion } from "motion/react";
import { logoutAction } from "@/app/login/actions";
import type { AuthProfile } from "@/lib/auth/profile";
import { SIMULATOR_MODULES, TRAINING_MODULES } from "@/modules/core/registry";
import { ThemeSwitcher } from "./theme-switcher";

type AppShellProps = {
  children: ReactNode;
  currentUser: AuthProfile | null;
};

type NavigationItem = {
  href: string;
  label: string;
  icon: Icon;
  activePrefixes?: readonly string[];
};

type WorkspaceSection = "simulator" | "authoring" | "review" | "admin" | "student";

function simulatorNavigationItems(): NavigationItem[] {
  return SIMULATOR_MODULES.map((module) => ({
    href: module.routes.simulator,
    label: module.shortName,
    icon: DesktopTower,
  }));
}

function trainingNavigationItems(mode: "authoring" | "review"): NavigationItem[] {
  return TRAINING_MODULES.map((module) => ({
    href: module.routes[mode],
    label: module.shortName,
    icon: DesktopTower,
    ...(mode === "authoring" && module.id === "ads-b"
      ? { activePrefixes: ["/admin/create", "/admin/edit"] }
      : {}),
    ...(mode === "review" && module.id === "ads-b"
      ? { activePrefixes: ["/student/simulation"] }
      : {}),
  }));
}

const workspaceItems: Record<WorkspaceSection, NavigationItem[]> = {
  simulator: simulatorNavigationItems(),
  authoring: trainingNavigationItems("authoring"),
  review: trainingNavigationItems("review"),
  admin: [
    { href: "/admin/exam-sets", label: "Quản lý đề thi", icon: Exam },
    { href: "/admin/exams", label: "Quản lý kỳ thi", icon: CalendarCheck },
  ],
  student: [
    { href: "/student/exams", label: "Vào thi", icon: SignIn },
  ],
};

const navigationItems: NavigationItem[] = [
  { href: "/", label: "Trang chủ", icon: House },
  { href: "/simulator", label: "Simulator", icon: DesktopTower },
  {
    href: "/authoring",
    label: "Tạo kịch bản",
    icon: FilePlus,
    activePrefixes: workspaceItems.authoring.flatMap((item) => [item.href, ...(item.activePrefixes ?? [])]),
  },
  {
    href: "/review",
    label: "Ôn tập",
    icon: BookOpenText,
    activePrefixes: workspaceItems.review.flatMap((item) => [item.href, ...(item.activePrefixes ?? [])]),
  },
  {
    href: "/admin/exams",
    label: "Giám khảo",
    icon: ClipboardText,
    activePrefixes: ["/admin/exam-sets"],
  },
  { href: "/student/exams", label: "Thí sinh", icon: Student },
];

function visibleNavigationItems(role?: AuthProfile["role"]) {
  return navigationItems.filter((item) => {
    if (item.href.startsWith("/simulator")) return Boolean(role);
    if (item.href.startsWith("/authoring")) return role === "admin";
    if (item.href.startsWith("/review")) return Boolean(role);
    if (item.href.startsWith("/admin")) return role === "admin";
    if (item.href.startsWith("/student")) return Boolean(role);
    return true;
  });
}

function ApplicationIdentity({ mobile = false }: { mobile?: boolean }) {
  return (
    <Link
      href="/"
      className="flex min-w-0 flex-col items-center justify-center rounded-md px-2 py-1 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
      aria-label="Thực hành mô phỏng CNS, về trang chủ"
    >
      <span
        className={`truncate font-medium uppercase tracking-[0.08em] text-[var(--text-muted)] leading-tight ${mobile ? "hidden text-[11px] sm:block" : "text-[11px]"}`}
      >
        Trung tâm Bảo đảm kỹ thuật
      </span>
      <span
        className={`mt-0.5 truncate font-bold tracking-tight text-[var(--text-primary)] leading-tight ${mobile ? "text-[14px] sm:text-[16px]" : "text-[14px]"}`}
      >
        THỰC HÀNH MÔ PHỎNG CNS
      </span>
    </Link>
  );
}

function getPageHeader(pathname: string) {
  if (pathname === "/") {
    return {
      eyebrow: "Trung tâm mô phỏng CNS",
      title: "CNS Simulation Lab",
      showMobileTitle: true,
    };
  }

  if (pathname === "/simulator") {
    return {
      eyebrow: "Bộ công cụ mô phỏng CNS",
      title: "Simulator",
      showMobileTitle: false,
    };
  }

  const simulatorModule = SIMULATOR_MODULES.find(
    (candidate) => candidate.routes.simulator === pathname,
  );
  if (simulatorModule) {
    const usesPmdt = simulatorModule.id === "dvor-1150" || simulatorModule.id === "dvor-1150a" || simulatorModule.id === "dme-1119a";
    return {
      eyebrow: "Phần mềm mô phỏng",
      title: `${simulatorModule.shortName}${usesPmdt ? " PMDT" : ""} Simulator`,
      showMobileTitle: true,
    };
  }

  if (pathname === "/authoring") {
    return { eyebrow: "Giám khảo", title: "Tạo kịch bản", showMobileTitle: true };
  }

  const authoringItem = workspaceItems.authoring.find((item) =>
    isPathWithinNavigationItem(pathname, item),
  );
  if (authoringItem) {
    return {
      eyebrow: "Tạo kịch bản",
      title: authoringItem.label,
      showMobileTitle: true,
    };
  }

  if (pathname === "/review") {
    return { eyebrow: "Thực hành CNS", title: "Ôn tập", showMobileTitle: true };
  }

  const reviewItem = workspaceItems.review.find((item) =>
    isPathWithinNavigationItem(pathname, item),
  );
  if (reviewItem) {
    return {
      eyebrow: "Ôn tập",
      title: reviewItem.label,
      showMobileTitle: true,
    };
  }

  const adminItem = workspaceItems.admin.find((item) =>
    isPathWithinNavigationItem(pathname, item),
  );
  if (adminItem) {
    return {
      eyebrow: "Giám khảo",
      title: adminItem.label,
      showMobileTitle: true,
    };
  }

  const studentItem = workspaceItems.student.find((item) =>
    isPathWithinNavigationItem(pathname, item),
  );
  if (studentItem) {
    return {
      eyebrow: "Thí sinh",
      title: studentItem.label,
      showMobileTitle: true,
    };
  }

  return null;
}

function isItemActive(pathname: string, item: NavigationItem) {
  if (item.href === "/") {
    return pathname === item.href;
  }
  return isPathWithinNavigationItem(pathname, item);
}

function getWorkspaceSection(href: string): WorkspaceSection | null {
  if (href.startsWith("/simulator")) return "simulator";
  if (href.startsWith("/authoring")) return "authoring";
  if (href.startsWith("/review")) return "review";
  if (href.startsWith("/admin")) return "admin";
  if (href.startsWith("/student")) return "student";
  return null;
}

const workspaceSectionLabels: Record<WorkspaceSection, string> = {
  simulator: "Simulator",
  authoring: "Tạo kịch bản",
  review: "Ôn tập",
  admin: "Giám khảo",
  student: "Thí sinh",
};

function isPathWithin(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isPathWithinNavigationItem(pathname: string, item: NavigationItem) {
  return (
    isPathWithin(pathname, item.href) ||
    item.activePrefixes?.some((prefix) => isPathWithin(pathname, prefix)) === true
  );
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
  const items = workspaceItems[section];

  if (!mobile) {
    return (
      <div
        role="group"
        aria-label={`Phân hệ ${workspaceSectionLabels[section]}`}
        className="mt-1 flex flex-col gap-1 pl-8"
      >
        {items.map((item) => {
          const active = isPathWithinNavigationItem(pathname, item);
          const ItemIcon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex h-9 items-center rounded-md px-4 text-xs font-bold tracking-wide transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] motion-reduce:transition-none ${
                active
              ? "text-[var(--color-sidebar-text-active)] font-extrabold"
              : "text-[var(--color-sidebar-text)] hover:text-[var(--color-sidebar-text-hover)]"
              }`}
            >
              <ItemIcon size={14} weight="regular" className="mr-2 shrink-0 opacity-70" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={`Phân hệ ${workspaceSectionLabels[section]}`}
      className="ml-4 grid grid-cols-2 gap-1 border-l border-[var(--border-strong)] pl-3"
    >
      {items.map((item) => {
        const active = isPathWithinNavigationItem(pathname, item);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`inline-flex items-center justify-center rounded-md border text-[10px] font-semibold transition-[background-color,border-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset motion-reduce:transition-none min-h-9 px-2 ${
              active
              ? "border-[var(--accent-border)] bg-[var(--accent-muted)] text-[var(--color-sidebar-text-active)]"
              : "border-transparent text-[var(--color-sidebar-text)] hover:bg-[var(--surface)] hover:text-[var(--color-sidebar-text-hover)]"
            }`}
          >
            {item.label}
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
  const [collapsedSections, setCollapsedSections] = useState<
    Partial<Record<WorkspaceSection, boolean>>
  >({});

  function handleParentClick(
    event: MouseEvent<HTMLAnchorElement>,
    active: boolean,
    section: WorkspaceSection | null,
  ) {
    if (!section) {
      onNavigate?.();
      return;
    }

    if (!active) {
      setCollapsedSections((current) => ({ ...current, [section]: false }));
      onNavigate?.();
      return;
    }

    event.preventDefault();
    setCollapsedSections((current) => ({ ...current, [section]: !current[section] }));
  }

  return (
    <nav aria-label="Điều hướng chính" className="grid gap-1">
      {visibleNavigationItems(role).map((item) => {
        const active = isItemActive(pathname, item);
        const ItemIcon = item.icon;
        const workspaceSection = getWorkspaceSection(item.href);
        const expanded = Boolean(
          active && workspaceSection && !collapsedSections[workspaceSection],
        );

        return (
          <div key={item.href} className="grid gap-1">
            <Link
              href={item.href}
              onClick={(event) => handleParentClick(event, active, workspaceSection)}
              aria-current={active ? "page" : undefined}
              aria-expanded={workspaceSection ? expanded : undefined}
              className={`group relative flex min-h-11 items-center gap-3 rounded border-l-2 px-3 text-sm font-medium transition-[background-color,color,border-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset motion-reduce:transition-none ${
                active
                    ? "border-[var(--color-sidebar-text-active)] bg-[var(--surface)] text-[var(--color-sidebar-text-active)]"
                    : "border-transparent text-[var(--color-sidebar-text)] hover:bg-[var(--surface)] hover:text-[var(--color-sidebar-text-hover)]"
              }`}
            >
              <ItemIcon aria-hidden size={20} weight="regular" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {workspaceSection ? (
                <CaretDown
                  aria-hidden
                  size={15}
                  className={`shrink-0 transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
                />
              ) : null}
            </Link>
            {expanded && workspaceSection ? (
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
  const [collapsedSections, setCollapsedSections] = useState<
    Partial<Record<WorkspaceSection, boolean>>
  >({});

  function handleParentClick(
    event: MouseEvent<HTMLAnchorElement>,
    active: boolean,
    section: WorkspaceSection | null,
  ) {
    if (!section) return;

    if (!active) {
      setCollapsedSections((current) => ({ ...current, [section]: false }));
      return;
    }

    event.preventDefault();
    setCollapsedSections((current) => ({ ...current, [section]: !current[section] }));
  }

  return (
    <aside
      className="app-sidebar app-sidebar-custom sticky top-0 z-20 col-start-1 row-start-2 hidden h-[100dvh] w-20 self-start border-r border-[var(--border-strong)] bg-[var(--color-sidebar-background)] md:block"
      aria-label="Thanh điều hướng"
    >
      <div className="relative z-10 flex h-[4.25rem] items-center justify-center border-b border-[var(--border)] px-3">
        <ApplicationIdentity />
      </div>
      <nav
        aria-label="Điều hướng chính"
        className="relative z-10 grid gap-1 px-3 pb-2 pt-10"
      >
        {visibleNavigationItems(role).map((item) => {
          const active = isItemActive(pathname, item);
          const workspaceSection = getWorkspaceSection(item.href);
          const ItemIcon = item.icon;
          const expanded = Boolean(
            active && workspaceSection && !collapsedSections[workspaceSection],
          );

          return (
            <div key={item.href} className="grid gap-1">
              <Link
                href={item.href}
                onClick={(event) => handleParentClick(event, active, workspaceSection)}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                aria-expanded={workspaceSection ? expanded : undefined}
                className={`group relative flex h-10 items-center rounded-lg px-4 text-[14px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset motion-reduce:transition-none ${
                  active
                    ? "text-[var(--color-sidebar-text-active)] font-bold"
                    : "text-[var(--color-sidebar-text)] hover:text-[var(--color-sidebar-text-hover)] font-medium"
                }`}
              >
                <ItemIcon size={18} weight="regular" className="mr-2.5 shrink-0 opacity-80" />
                <span className="min-w-0 flex-1">
                  <span className="truncate block max-w-full">{item.label}</span>
                </span>
                {workspaceSection ? (
                  <CaretDown
                    aria-hidden
                    size={14}
                    className={`ml-2 shrink-0 transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
                  />
                ) : null}
              </Link>
              {expanded && workspaceSection ? (
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
      // Trang chủ có video/poster lớn: fade từ opacity 0 sau hydration tạo
      // cảm giác toàn trang bị nháy. Các route chức năng vẫn giữ chuyển cảnh.
      initial={pathname === "/" ? false : { opacity: 0 }}
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
  const pageHeader = getPageHeader(pathname);

  // The reference DVOR and DME maintenance tools are standalone desktop
  // applications. Keep the global CNS navigation outside those simulators so
  // their client areas retain the geometry shown in the supplied captures.
  if (
    pathname === "/login" ||
    pathname === "/simulator/dvor-1150" ||
    pathname === "/simulator/dvor-1150a" ||
    pathname === "/simulator/dme-1119a" ||
    pathname === "/simulator/software/dvor-220" ||
    pathname === "/simulator/software/dme-320"
  ) {
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
            grid-template-columns: 15.18rem minmax(0, 1fr) !important;
            grid-template-rows: 4.25rem minmax(0, 1fr) !important;
            background-color: var(--background) !important;
          }
          .app-header-custom {
            grid-column: 2 / -1 !important;
            grid-row: 1 !important;
          }
          .app-sidebar-custom {
            grid-row: 1 / -1 !important;
            height: 100dvh !important;
            width: 15.18rem !important;
          }
          .app-content-custom {
            padding-top: 0 !important;
            min-height: calc(100dvh - 4.25rem) !important;
          }
        }
        @media print {
          body, html {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          .app-layout-grid-custom {
            display: block !important;
            grid-template-columns: none !important;
            grid-template-rows: none !important;
            background-color: #ffffff !important;
          }
          .app-header-custom {
            display: none !important;
          }
          .app-sidebar-custom {
            display: none !important;
          }
          .app-content-custom {
            padding: 0 !important;
            margin: 0 !important;
            min-height: auto !important;
          }
          .print\:hidden {
            display: none !important;
          }
        }
      `}} />
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-50 -translate-y-20 rounded bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 motion-reduce:transition-none print:hidden"
      >
        Chuyển đến nội dung chính
      </a>

      <header className="relative col-span-full z-30 h-[4.25rem] overflow-hidden bg-[var(--background)] app-header-custom">
        <div className="relative z-10 flex h-full items-center justify-center px-4 sm:px-5">
          <div className="absolute left-4 flex items-center gap-3 md:hidden">
            <button
              type="button"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-[var(--text-primary)] hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              aria-label="Mở điều hướng"
              title="Mở điều hướng"
              aria-controls="mobile-navigation"
              aria-expanded={mobileNavigationOpen}
              onClick={() => setMobileNavigationOpen(true)}
            >
              <List aria-hidden size={21} weight="regular" />
            </button>
          </div>

          <div className="min-w-0 md:hidden">
            {pageHeader?.showMobileTitle ? (
              <p className="max-w-[48vw] truncate text-sm font-bold tracking-tight text-[var(--text-primary)]">
                {pageHeader.title}
              </p>
            ) : (
              <ApplicationIdentity mobile />
            )}
          </div>

          {pageHeader ? (
            <div className="absolute left-10 hidden max-w-[calc(100%_-_22rem)] min-w-0 flex-col justify-center md:flex">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
                {pageHeader.eyebrow}
              </p>
              <h1 className="mt-0.5 truncate text-lg font-bold leading-tight tracking-tight text-[var(--text-primary)]">
                {pageHeader.title}
              </h1>
            </div>
          ) : null}

          <div className="absolute right-4 hidden items-center gap-2 sm:flex">
            <ThemeSwitcher />
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
            className="absolute inset-0 bg-[var(--color-overlay)] backdrop-blur-[2px]"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setMobileNavigationOpen(false)}
          />
          <aside
            id="mobile-navigation"
            className="relative h-full w-[min(19rem,88vw)] border-r border-[var(--border-strong)] bg-[var(--color-sidebar-background)] shadow-[var(--shadow-panel)]"
            aria-label="Điều hướng trên thiết bị di động"
          >
            <div className="relative z-10 flex h-full flex-col p-4">
              <div className="mb-5 flex items-center justify-between border-b border-[var(--border-strong)] pb-4">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  Điều hướng
                </span>
                <button
                  type="button"
                  className="inline-flex size-9 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  aria-label="Đóng điều hướng"
                  title="Đóng điều hướng"
                  onClick={() => setMobileNavigationOpen(false)}
                >
                  <X aria-hidden size={20} weight="regular" />
                </button>
              </div>
              <div className="mb-4">
                <ThemeSwitcher />
              </div>
              <MobileNavigation role={currentUser?.role} onNavigate={() => setMobileNavigationOpen(false)} />
              {currentUser ? (
                <button
                  type="button"
                  onClick={signOut}
                  disabled={signingOut}
                  className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--danger)] disabled:opacity-50"
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
