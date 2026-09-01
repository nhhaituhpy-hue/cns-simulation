"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { BookOpenText } from "@phosphor-icons/react/dist/csr/BookOpenText";
import { CalendarCheck } from "@phosphor-icons/react/dist/csr/CalendarCheck";
import { CaretDown } from "@phosphor-icons/react/dist/csr/CaretDown";
import { ClipboardText } from "@phosphor-icons/react/dist/csr/ClipboardText";
import { DesktopTower } from "@phosphor-icons/react/dist/csr/DesktopTower";
import { Exam } from "@phosphor-icons/react/dist/csr/Exam";
import { FilePlus } from "@phosphor-icons/react/dist/csr/FilePlus";
import { House } from "@phosphor-icons/react/dist/csr/House";
import { List } from "@phosphor-icons/react/dist/csr/List";
import { Password } from "@phosphor-icons/react/dist/csr/Password";
import { SignIn } from "@phosphor-icons/react/dist/csr/SignIn";
import { SignOut } from "@phosphor-icons/react/dist/csr/SignOut";
import { Student } from "@phosphor-icons/react/dist/csr/Student";
import { UserCircle } from "@phosphor-icons/react/dist/csr/UserCircle";
import { X } from "@phosphor-icons/react/dist/csr/X";
import type { Icon } from "@phosphor-icons/react/dist/lib/types";
import { motion } from "motion/react";
import { useState, type MouseEvent, type ReactNode } from "react";
import { logoutAction } from "@/app/login/actions";
import { ChangeOwnPasswordDialog } from "@/components/auth/change-own-password-dialog";
import type { AuthProfile } from "@/lib/auth/profile";
import { SIMULATOR_MODULES, TRAINING_MODULES } from "@/modules/core/registry";

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
  const moduleItems: NavigationItem[] = SIMULATOR_MODULES.map((module) => ({
    href: module.routes.simulator,
    label: module.shortName,
    icon: DesktopTower,
  }));

  const dvor1150Index = moduleItems.findIndex(
    (item) => item.href === "/simulator/dvor-1150",
  );

  if (dvor1150Index >= 0) {
    moduleItems.splice(dvor1150Index + 1, 0, {
      href: "/simulator/dvor-1150/block-diagram",
      label: "Sơ đồ khối DVOR 1150",
      icon: DesktopTower,
    });
  }

  return moduleItems;
}

function trainingNavigationItems(mode: "authoring" | "review"): NavigationItem[] {
  return TRAINING_MODULES.map((module) => ({
    href: module.routes[mode],
    label: module.shortName,
    icon: DesktopTower,
    ...(mode === "authoring" && module.id === "ads-b"
      ? { activePrefixes: ["/admin/create", "/admin/edit"] }
      : {}),
    ...(mode === "authoring" && module.id === "dme-1119a"
      ? { activePrefixes: ["/admin/dme"] }
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
  student: [{ href: "/student/exams", label: "Vào thi", icon: SignIn }],
};

const navigationItems: NavigationItem[] = [
  { href: "/", label: "Trang chủ", icon: House },
  { href: "/simulator", label: "Simulator", icon: DesktopTower },
  {
    href: "/authoring",
    label: "Tạo kịch bản",
    icon: FilePlus,
    // Some unfinished module manifests temporarily point authoring back to a
    // simulator URL. Only explicit aliases should affect this top-level tab;
    // real /authoring child routes are already covered by item.href itself.
    activePrefixes: workspaceItems.authoring.flatMap((item) => [
      ...(item.href.startsWith("/simulator") ? [] : [item.href]),
      ...(item.activePrefixes ?? []),
    ]),
  },
  {
    href: "/review",
    label: "Ôn tập",
    icon: BookOpenText,
    // Do not mark Review active for fallback URLs in the simulator workspace.
    activePrefixes: workspaceItems.review.flatMap((item) => [
      ...(item.href.startsWith("/simulator") ? [] : [item.href]),
      ...(item.activePrefixes ?? []),
    ]),
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

function isPathWithin(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function isPathWithinNavigationItem(pathname: string, item: NavigationItem) {
  return (
    isPathWithin(pathname, item.href) ||
    item.activePrefixes?.some((prefix) => isPathWithin(pathname, prefix)) === true
  );
}

function isMostSpecificActiveItem(
  pathname: string,
  item: NavigationItem,
  siblings: readonly NavigationItem[],
) {
  if (!isPathWithinNavigationItem(pathname, item)) return false;

  return !siblings.some(
    (candidate) =>
      candidate !== item &&
      candidate.href.length > item.href.length &&
      isPathWithinNavigationItem(pathname, candidate),
  );
}

function isItemActive(pathname: string, item: NavigationItem) {
  return item.href === "/" ? pathname === "/" : isPathWithinNavigationItem(pathname, item);
}

function getWorkspaceSection(href: string): WorkspaceSection | null {
  if (href.startsWith("/simulator")) return "simulator";
  if (href.startsWith("/authoring")) return "authoring";
  if (href.startsWith("/review")) return "review";
  if (href.startsWith("/admin")) return "admin";
  if (href.startsWith("/student")) return "student";
  return null;
}

function ApplicationIdentity({
  mobile = false,
  inverted = false,
}: {
  mobile?: boolean;
  inverted?: boolean;
}) {
  return (
    <Link
      href="/"
      className={[
        "flex min-w-0 items-center gap-2 rounded-lg py-1 pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2",
        mobile ? "max-w-[13rem] sm:max-w-[18rem]" : "max-w-[18rem]",
      ].join(" ")}
      aria-label="ATTECH CNS Simulation Lab, về trang chủ"
    >
      <span className="shrink-0 text-[1.05rem] font-black tracking-[-0.07em]">
        <span className="text-[#e3212d]">A</span>
        <span className="text-[#1386c9]">TTECH</span>
      </span>
      <span
        className={[
          "truncate border-l pl-2 text-xs font-semibold tracking-[-0.02em]",
          inverted
            ? "border-white/20 text-white"
            : "border-[var(--border-strong)] text-[var(--text-primary)]",
        ].join(" ")}
      >
        CNS Simulation Lab
      </span>
    </Link>
  );
}

function MobileWorkspaceTabs({
  section,
  pathname,
  onNavigate,
}: {
  section: WorkspaceSection;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div
      role="group"
      aria-label={"Phân hệ " + section}
      className="ml-4 grid grid-cols-2 gap-1 border-l border-[var(--border-strong)] pl-3"
    >
      {workspaceItems[section].map((item) => {
        const active = isMostSpecificActiveItem(
          pathname,
          item,
          workspaceItems[section],
        );

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={[
              "inline-flex min-h-9 items-center justify-center rounded-md border px-2 text-[10px] font-semibold transition-[background-color,border-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset motion-reduce:transition-none",
              active
                ? "border-[var(--accent-border)] bg-[var(--accent-muted)] text-[var(--accent)]"
                : "border-transparent text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]",
            ].join(" ")}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

function MobileNavigation({
  onNavigate,
  role,
}: {
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
    setCollapsedSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
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
              className={[
                "group relative flex min-h-11 items-center gap-3 rounded border-l-2 px-3 text-sm font-medium transition-[background-color,color,border-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset motion-reduce:transition-none",
                active
                  ? "border-[var(--accent)] bg-[var(--surface)] text-[var(--accent)]"
                  : "border-transparent text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]",
              ].join(" ")}
            >
              <ItemIcon aria-hidden size={20} weight="regular" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {workspaceSection ? (
                <CaretDown
                  aria-hidden
                  size={15}
                  className={[
                    "shrink-0 transition-transform duration-150",
                    expanded ? "rotate-180" : "",
                  ].join(" ")}
                />
              ) : null}
            </Link>
            {expanded && workspaceSection ? (
              <MobileWorkspaceTabs
                section={workspaceSection}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

function TopNavigation({
  role,
  inverted = false,
}: {
  role?: AuthProfile["role"];
  inverted?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Điều hướng chính"
      className="absolute left-1/2 hidden min-w-0 -translate-x-1/2 items-center gap-1 xl:flex"
    >
      {visibleNavigationItems(role).map((item) => {
        const active = isItemActive(pathname, item);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={[
              "rounded-full px-3 py-2 text-xs font-semibold transition-[background-color,color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 motion-reduce:transition-none",
              active
                ? inverted
                  ? "bg-white/14 text-white"
                  : "bg-[var(--accent-muted)] text-[var(--accent)]"
                : inverted
                  ? "text-white/70 hover:bg-white/8 hover:text-white"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
            ].join(" ")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={pathname === "/" ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: "easeInOut" }}
      className="h-full min-h-full w-full"
    >
      {children}
    </motion.div>
  );
}

export function AppShell({ children, currentUser }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const isLanding = pathname === "/";
  const isLogin = pathname === "/login";
  const isSimulatorDetail = pathname.startsWith("/simulator/");

  if (isLogin) {
    return <>{children}</>;
  }

  function goBackFromSimulator() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/simulator");
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

  function openPasswordDialog() {
    setAccountMenuOpen(false);
    setMobileNavigationOpen(false);
    setPasswordDialogOpen(true);
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)]">
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-50 -translate-y-20 rounded bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 motion-reduce:transition-none print:hidden"
      >
        Chuyển đến nội dung chính
      </a>

      <header
        className={[
          "sticky top-0 z-30 h-[4.5rem] border-b print:hidden",
          isLanding
            ? "border-white/10 bg-[#061b25]/95 text-white backdrop-blur-xl"
            : "border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]",
        ].join(" ")}
      >
        <div className="relative mx-auto flex h-full max-w-[1600px] items-center gap-4 px-4 sm:px-5 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-3 xl:flex-none">
            <button
              type="button"
              className={[
                "inline-flex size-9 shrink-0 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] xl:hidden",
                isLanding
                  ? "text-white hover:bg-white/10"
                  : "text-[var(--text-primary)] hover:bg-[var(--surface)]",
              ].join(" ")}
              aria-label="Mở điều hướng"
              title="Mở điều hướng"
              aria-controls="mobile-navigation"
              aria-expanded={mobileNavigationOpen}
              onClick={() => setMobileNavigationOpen(true)}
            >
              <List aria-hidden size={21} weight="regular" />
            </button>
            <ApplicationIdentity mobile inverted={isLanding} />
          </div>

          <TopNavigation role={currentUser?.role} inverted={isLanding} />

          <div className="ml-auto hidden items-center gap-2 sm:flex">
            {currentUser ? (
              <div
                className="relative"
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setAccountMenuOpen(false);
                  }
                }}
              >
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((current) => !current)}
                  aria-haspopup="menu"
                  aria-expanded={accountMenuOpen}
                  aria-label={`Tài khoản: ${currentUser.fullName}`}
                  className={[
                    "flex min-h-11 items-center gap-2 rounded-lg px-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                    isLanding
                      ? "text-white hover:bg-white/10"
                      : "text-[var(--text-primary)] hover:bg-[var(--surface-muted)]",
                  ].join(" ")}
                >
                  <UserCircle aria-hidden size={25} weight="regular" className="shrink-0" />
                  <span className="hidden max-w-48 min-w-0 lg:block">
                    <span className="block truncate text-xs font-semibold">{currentUser.fullName}</span>
                    <span className={[
                      "block truncate text-[10px]",
                      isLanding ? "text-white/60" : "text-[var(--text-muted)]",
                    ].join(" ")}>{currentUser.workUnit}</span>
                  </span>
                  <CaretDown aria-hidden size={14} className={[
                    "hidden shrink-0 transition-transform duration-150 lg:block motion-reduce:transition-none",
                    accountMenuOpen ? "rotate-180" : "",
                  ].join(" ")} />
                </button>

                {accountMenuOpen ? (
                  <div
                    role="menu"
                    aria-label="Tài khoản"
                    className="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-64 overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-1.5 text-[var(--text-primary)] shadow-[var(--shadow-panel)]"
                  >
                    <div className="border-b border-[var(--border)] px-3 py-2.5 lg:hidden">
                      <p className="truncate text-sm font-semibold">{currentUser.fullName}</p>
                      <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{currentUser.workUnit}</p>
                    </div>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={openPasswordDialog}
                      className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]"
                    >
                      <Password aria-hidden size={19} /> Đổi mật khẩu
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={signOut}
                      disabled={signingOut}
                      className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium text-[var(--danger)] hover:bg-[var(--color-danger-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--danger)] disabled:opacity-50"
                    >
                      <SignOut aria-hidden size={19} />
                      {signingOut ? "Đang đăng xuất..." : "Đăng xuất"}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--accent)] px-3 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
              >
                <UserCircle aria-hidden size={18} /> Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </header>

      {isSimulatorDetail ? (
        <div className="border-b border-[var(--border)] bg-[var(--surface-subtle)] print:hidden">
          <div className="mx-auto flex min-h-12 max-w-[1600px] items-center px-4 sm:px-5 lg:px-8">
            <button
              type="button"
              onClick={goBackFromSimulator}
              aria-label="Quay lại trang trước"
              title="Quay lại trang trước"
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--text-primary)] transition-[background-color,border-color,color] duration-150 hover:border-[var(--accent-border)] hover:bg-[var(--accent-muted)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 motion-reduce:transition-none"
            >
              <ArrowLeft aria-hidden size={16} weight="regular" />
              Quay lại
            </button>
          </div>
        </div>
      ) : null}

      <main id="main-content" tabIndex={-1} className="min-w-0">
        <PageTransition>{children}</PageTransition>
      </main>

      {mobileNavigationOpen ? (
        <div
          className="fixed inset-0 top-[4.5rem] z-40 xl:hidden"
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
              <MobileNavigation
                role={currentUser?.role}
                onNavigate={() => setMobileNavigationOpen(false)}
              />
              {currentUser ? (
                <div className="mt-4 grid gap-2 border-t border-[var(--border-strong)] pt-4">
                  <div className="flex items-center gap-3 px-1 pb-1">
                    <UserCircle aria-hidden size={28} className="shrink-0 text-[var(--accent)]" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{currentUser.fullName}</p>
                      <p className="truncate text-xs text-[var(--text-muted)]">{currentUser.workUnit}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={openPasswordDialog}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  >
                    <Password aria-hidden size={18} /> Đổi mật khẩu
                  </button>
                  <button
                    type="button"
                    onClick={signOut}
                    disabled={signingOut}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)] disabled:opacity-50"
                  >
                    <SignOut aria-hidden size={18} />{" "}
                    {signingOut ? "Đang đăng xuất..." : "Đăng xuất"}
                  </button>
                </div>
              ) : null}
              <p className="mt-auto border-t border-[var(--border-strong)] pt-4 text-xs text-[var(--text-muted)]">
                Công cụ đào tạo CNS
              </p>
            </div>
          </aside>
        </div>
      ) : null}

      {currentUser ? (
        <ChangeOwnPasswordDialog
          open={passwordDialogOpen}
          onClose={() => setPasswordDialogOpen(false)}
        />
      ) : null}
    </div>
  );
}
