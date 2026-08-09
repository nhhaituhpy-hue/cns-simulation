"use client";

import { LockOpen } from "@phosphor-icons/react/dist/csr/LockOpen";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import type {
  MopiensMenuBarProps,
  MopiensMenuCommand,
  MopiensNavigationItem,
  MopiensNavigationProps,
  MopiensOutputPaneProps,
  MopiensStatusBarProps,
  MopiensTabHostProps,
  MopiensTitleBarProps,
  MopiensToolbarProps,
  MopiensVisualTone,
} from "./types";
import styles from "./mopiens-pmdt.module.css";

const toneClasses: Record<MopiensVisualTone, string> = {
  normal: styles.toneNormal,
  info: styles.toneInfo,
  warning: styles.toneWarning,
  alarm: styles.toneAlarm,
  pending: styles.tonePending,
  inactive: styles.toneInactive,
};

function toneClass(tone: MopiensVisualTone | undefined): string {
  return toneClasses[tone ?? "inactive"];
}

export function MopiensTitleBar({
  title,
  brandLabel = "M",
  connection,
  user,
  onMinimize,
  onMaximize,
  onClose,
}: MopiensTitleBarProps) {
  return (
    <header className={styles.titleBar}>
      <div className={styles.titleIdentity}>
        <span className={styles.brandMark} aria-hidden>
          {brandLabel}
        </span>
        <span className={styles.windowTitle}>{title}</span>
      </div>

      <div className={styles.titleStatus} aria-label="System and login status">
        {connection ? (
          <span
            className={`${styles.titleStatusItem} ${toneClass(connection.tone)}`}
            aria-label={`Connection: ${connection.label}`}
          >
            <span className={styles.statusLamp} aria-hidden />
            {connection.label}
          </span>
        ) : null}
        {user ? (
          <span
            className={`${styles.userStatus} ${toneClass(user.tone ?? "normal")}`}
            aria-label={`User: ${user.name}${user.mode ? `, mode ${user.mode}` : ""}`}
          >
            <span className={styles.lockGlyph} aria-hidden>
              <LockOpen size={21} weight="fill" />
            </span>
            <span>
              {user.mode ? <strong>{user.mode}</strong> : null}
              <span>{user.name}</span>
              {user.securityLevel !== undefined ? (
                <small>Level {user.securityLevel}</small>
              ) : null}
            </span>
          </span>
        ) : null}
      </div>

      {onMinimize || onMaximize || onClose ? (
        <div className={styles.windowControls} aria-label="Window controls">
          {onMinimize ? (
            <button type="button" onClick={onMinimize} aria-label="Minimize window">
              <span aria-hidden>_</span>
            </button>
          ) : null}
          {onMaximize ? (
            <button type="button" onClick={onMaximize} aria-label="Maximize window">
              <span aria-hidden>□</span>
            </button>
          ) : null}
          {onClose ? (
            <button type="button" onClick={onClose} aria-label="Close window">
              <span aria-hidden>×</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}

function MenuCommandList({
  commands,
  onCommand,
  onClose,
  nested = false,
}: {
  commands: readonly MopiensMenuCommand[];
  onCommand?: (commandId: string) => void;
  onClose: (restoreTriggerFocus?: boolean) => void;
  nested?: boolean;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const pendingChildFocusRef = useRef<string | null>(null);
  const [openChildId, setOpenChildId] = useState<string | null>(null);

  useEffect(() => {
    const commandId = pendingChildFocusRef.current;
    if (!commandId || openChildId !== commandId) return;

    const parentButton = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>("[data-menu-command]") ?? [],
    ).find((button) => button.dataset.menuCommand === commandId);
    const childMenu = Array.from(parentButton?.parentElement?.children ?? []).find(
      (element): element is HTMLUListElement =>
        element instanceof HTMLUListElement && element.getAttribute("role") === "menu",
    );
    childMenu
      ?.querySelector<HTMLButtonElement>("button:not([disabled])")
      ?.focus();
    pendingChildFocusRef.current = null;
  }, [openChildId]);

  function enabledDirectButtons(): HTMLButtonElement[] {
    return Array.from(listRef.current?.children ?? [])
      .map((item) =>
        Array.from(item.children).find(
          (element): element is HTMLButtonElement => element instanceof HTMLButtonElement,
        ),
      )
      .filter((button): button is HTMLButtonElement => Boolean(button && !button.disabled));
  }

  function moveCommandFocus(current: HTMLButtonElement, direction: -1 | 1) {
    const buttons = enabledDirectButtons();
    const index = buttons.indexOf(current);
    if (index < 0 || buttons.length === 0) return;
    buttons[(index + direction + buttons.length) % buttons.length]?.focus();
  }

  function activate(command: MopiensMenuCommand) {
    if (command.disabled) return;
    if (command.children?.length) {
      pendingChildFocusRef.current = null;
      setOpenChildId((current) => (current === command.id ? null : command.id));
      return;
    }
    onCommand?.(command.id);
    onClose(true);
  }

  return (
    <ul
      ref={listRef}
      role="menu"
      className={nested ? styles.nestedMenu : styles.menuPopup}
      aria-label={nested ? "Submenu" : undefined}
    >
      {commands.map((command) => {
        const hasChildren = Boolean(command.children?.length);
        const role = command.checked === undefined ? "menuitem" : "menuitemcheckbox";
        return (
          <li
            key={command.id}
            role="none"
            className={command.dividerBefore ? styles.menuDivider : undefined}
          >
            <button
              type="button"
              role={role}
              aria-checked={role === "menuitemcheckbox" ? command.checked : undefined}
              aria-haspopup={hasChildren ? "menu" : undefined}
              aria-expanded={hasChildren ? openChildId === command.id : undefined}
              data-menu-command={command.id}
              disabled={command.disabled}
              className={`${styles.menuCommand} ${
                command.tone ? styles[`controlTone${command.tone[0].toUpperCase()}${command.tone.slice(1)}`] : ""
              }`}
              onClick={() => activate(command)}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight" && hasChildren) {
                  event.preventDefault();
                  pendingChildFocusRef.current = command.id;
                  setOpenChildId(command.id);
                  return;
                }
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  moveCommandFocus(event.currentTarget, event.key === "ArrowDown" ? 1 : -1);
                  return;
                }
                if (event.key === "Home" || event.key === "End") {
                  event.preventDefault();
                  const buttons = enabledDirectButtons();
                  (event.key === "Home" ? buttons[0] : buttons[buttons.length - 1])?.focus();
                  return;
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  onClose(true);
                }
              }}
            >
              <span className={styles.menuCheck} aria-hidden>
                {command.checked ? "✓" : ""}
              </span>
              <span className={styles.menuCommandLabel}>{command.label}</span>
              {command.shortcut ? (
                <kbd className={styles.menuShortcut}>{command.shortcut}</kbd>
              ) : null}
              {hasChildren ? (
                <span className={styles.menuCaret} aria-hidden>
                  ▸
                </span>
              ) : null}
            </button>
            {hasChildren && openChildId === command.id ? (
              <MenuCommandList
                commands={command.children ?? []}
                onCommand={onCommand}
                onClose={onClose}
                nested
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function MopiensMenuBar({
  menus,
  onCommand,
  ariaLabel = "Application menu",
}: MopiensMenuBarProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerToRestoreRef = useRef<HTMLButtonElement | null>(null);
  const keyboardOpenMenuRef = useRef<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (!openMenuId || keyboardOpenMenuRef.current !== openMenuId) return;
    const menuRoot = Array.from(
      rootRef.current?.querySelectorAll<HTMLElement>("[data-menu-root]") ?? [],
    ).find((element) => element.dataset.menuRoot === openMenuId);
    menuRoot
      ?.querySelector<HTMLButtonElement>('ul[role="menu"] button:not([disabled])')
      ?.focus();
    keyboardOpenMenuRef.current = null;
  }, [openMenuId]);

  useEffect(() => {
    if (!openMenuId) return;
    const closeFromOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        keyboardOpenMenuRef.current = null;
        setOpenMenuId(null);
      }
    };
    const closeFromEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        keyboardOpenMenuRef.current = null;
        setOpenMenuId(null);
        triggerToRestoreRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeFromOutside);
    document.addEventListener("keydown", closeFromEscape);
    return () => {
      document.removeEventListener("pointerdown", closeFromOutside);
      document.removeEventListener("keydown", closeFromEscape);
    };
  }, [openMenuId]);

  function focusSibling(currentId: string, direction: -1 | 1) {
    const buttons = Array.from(
      rootRef.current?.querySelectorAll<HTMLButtonElement>("[data-menu-trigger]") ?? [],
    );
    const index = buttons.findIndex((button) => button.dataset.menuTrigger === currentId);
    if (index < 0 || buttons.length === 0) return;
    buttons[(index + direction + buttons.length) % buttons.length]?.focus();
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>, menuId: string) {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      focusSibling(menuId, event.key === "ArrowRight" ? 1 : -1);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      triggerToRestoreRef.current = event.currentTarget;
      keyboardOpenMenuRef.current = menuId;
      setOpenMenuId(menuId);
    }
  }

  function closeMenu(restoreTriggerFocus = false) {
    keyboardOpenMenuRef.current = null;
    setOpenMenuId(null);
    if (restoreTriggerFocus) triggerToRestoreRef.current?.focus();
  }

  return (
    <div ref={rootRef} role="menubar" aria-label={ariaLabel} className={styles.menuBar}>
      {menus.map((menu) => (
        <div
          key={menu.id}
          role="none"
          data-menu-root={menu.id}
          className={styles.menuRoot}
        >
          <button
            type="button"
            role="menuitem"
            data-menu-trigger={menu.id}
            aria-haspopup="menu"
            aria-expanded={openMenuId === menu.id}
            disabled={menu.disabled}
            className={styles.menuTrigger}
            onClick={(event) => {
              triggerToRestoreRef.current = event.currentTarget;
              keyboardOpenMenuRef.current = null;
              setOpenMenuId((current) => (current === menu.id ? null : menu.id));
            }}
            onKeyDown={(event) => handleTriggerKeyDown(event, menu.id)}
          >
            {menu.label}
          </button>
          {openMenuId === menu.id ? (
            <MenuCommandList
              commands={menu.commands}
              onCommand={onCommand}
              onClose={closeMenu}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function MopiensToolbar({
  actions,
  onAction,
  ariaLabel = "Application toolbar",
}: MopiensToolbarProps) {
  return (
    <div role="toolbar" aria-label={ariaLabel} className={styles.toolbar}>
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          disabled={action.disabled}
          aria-label={action.label}
          aria-pressed={action.pressed}
          title={action.label}
          className={`${styles.toolbarButton} ${
            action.pressed ? styles.toolbarButtonPressed : ""
          } ${action.tone ? styles[`controlTone${action.tone[0].toUpperCase()}${action.tone.slice(1)}`] : ""}`}
          onClick={() => onAction?.(action.id)}
        >
          {action.icon ? <span className={styles.toolbarIcon}>{action.icon}</span> : null}
          {action.showLabel || !action.icon ? (
            <span className={styles.toolbarLabel}>{action.label}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

function NavigationTree({
  items,
  activeItemId,
  expandedIds,
  onExpandedChange,
  onItemSelect,
  depth = 0,
}: {
  items: readonly MopiensNavigationItem[];
  activeItemId?: string;
  expandedIds: ReadonlySet<string>;
  onExpandedChange: (itemId: string) => void;
  onItemSelect?: (itemId: string) => void;
  depth?: number;
}) {
  return (
    <ul role={depth === 0 ? "tree" : "group"} className={styles.navigationTree}>
      {items.map((item) => {
        const hasChildren = Boolean(item.children?.length);
        const expanded = hasChildren && expandedIds.has(item.id);
        const active = item.id === activeItemId;
        const itemStyle = { "--mopiens-tree-depth": depth } as CSSProperties;

        return (
          <li
            key={item.id}
            role="treeitem"
            aria-selected={active}
            aria-expanded={hasChildren ? expanded : undefined}
            className={styles.navigationTreeItem}
          >
            <button
              type="button"
              disabled={item.disabled}
              className={`${styles.navigationItemButton} ${
                active ? styles.navigationItemActive : ""
              }`}
              style={itemStyle}
              onClick={() => {
                if (hasChildren) onExpandedChange(item.id);
                if (!hasChildren || item.selectable !== false) onItemSelect?.(item.id);
              }}
            >
              <span className={styles.treeCaret} aria-hidden>
                {hasChildren ? (expanded ? "▾" : "▸") : ""}
              </span>
              {item.icon ? <span className={styles.navigationItemIcon}>{item.icon}</span> : null}
              <span className={styles.navigationItemLabel}>{item.label}</span>
              {item.badge !== undefined ? (
                <span className={styles.navigationBadge}>{item.badge}</span>
              ) : null}
            </button>
            {hasChildren && expanded ? (
              <NavigationTree
                items={item.children ?? []}
                activeItemId={activeItemId}
                expandedIds={expandedIds}
                onExpandedChange={onExpandedChange}
                onItemSelect={onItemSelect}
                depth={depth + 1}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function defaultExpandedIds(sections: readonly MopiensNavigationProps["sections"][number][]) {
  const expanded = new Set<string>();
  const visit = (items: readonly MopiensNavigationItem[]) => {
    for (const item of items) {
      if (item.expandedByDefault) expanded.add(item.id);
      if (item.children) visit(item.children);
    }
  };
  for (const section of sections) visit(section.items);
  return expanded;
}

export function MopiensNavigation({
  title = "Menu",
  sections,
  activeSectionId,
  activeItemId,
  onSectionChange,
  onItemSelect,
  ariaLabel = "Equipment navigation",
}: MopiensNavigationProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() =>
    defaultExpandedIds(sections),
  );
  const activeSection =
    sections.find((section) => section.id === activeSectionId) ?? sections[0];

  function toggleExpanded(itemId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  return (
    <nav aria-label={ariaLabel} className={styles.navigationPane}>
      <header className={styles.navigationHeader}>{title}</header>
      <div className={styles.navigationActiveSection}>
        <h2>{activeSection?.label ?? title}</h2>
        {activeSection ? (
          <NavigationTree
            items={activeSection.items}
            activeItemId={activeItemId}
            expandedIds={expandedIds}
            onExpandedChange={toggleExpanded}
            onItemSelect={onItemSelect}
          />
        ) : (
          <p className={styles.navigationEmpty}>No navigation items</p>
        )}
      </div>
      <div className={styles.navigationSections}>
        {sections.map((section) => {
          const active = section.id === activeSection?.id;
          return (
            <button
              key={section.id}
              type="button"
              aria-pressed={active}
              className={`${styles.navigationSectionButton} ${
                active ? styles.navigationSectionActive : ""
              }`}
              onClick={() => onSectionChange?.(section.id)}
            >
              {section.icon ? <span aria-hidden>{section.icon}</span> : null}
              <span>{section.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function MopiensTabHost({
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
  children,
  ariaLabel = "Workspace tabs",
}: MopiensTabHostProps) {
  const idBase = useId().replaceAll(":", "");

  function moveTab(event: KeyboardEvent<HTMLButtonElement>, tabId: string) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const enabledTabs = tabs.filter((tab) => !tab.disabled);
    const index = enabledTabs.findIndex((tab) => tab.id === tabId);
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const next = enabledTabs[(index + direction + enabledTabs.length) % enabledTabs.length];
    if (next) onTabChange?.(next.id);
  }

  return (
    <section className={styles.tabHost}>
      <div role="tablist" aria-label={ariaLabel} className={styles.tabList}>
        {tabs.map((tab) => {
          const active = tab.id === activeTabId;
          return (
            <div key={tab.id} className={`${styles.tab} ${active ? styles.tabActive : ""}`}>
              <button
                id={`${idBase}-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`${idBase}-panel-${tab.id}`}
                tabIndex={active ? 0 : -1}
                disabled={tab.disabled}
                onClick={() => onTabChange?.(tab.id)}
                onKeyDown={(event) => moveTab(event, tab.id)}
              >
                {tab.label}
              </button>
              {tab.closeLabel && onTabClose ? (
                <button
                  type="button"
                  className={styles.tabClose}
                  aria-label={tab.closeLabel}
                  onClick={() => onTabClose(tab.id)}
                >
                  <span aria-hidden>×</span>
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
      <div
        id={`${idBase}-panel-${activeTabId}`}
        role="tabpanel"
        aria-labelledby={`${idBase}-tab-${activeTabId}`}
        className={styles.tabPanel}
      >
        {children}
      </div>
    </section>
  );
}

export function MopiensOutputPane({
  title = "Output",
  filters = [],
  activeFilterId,
  onFilterChange,
  onClear,
  clearLabel = "Clear output",
  children,
  emptyLabel = "No output entries",
}: MopiensOutputPaneProps) {
  return (
    <section aria-label={title} className={styles.outputPane}>
      <header className={styles.outputHeader}>
        <h2>{title}</h2>
        {onClear ? (
          <button type="button" onClick={onClear} aria-label={clearLabel} title={clearLabel}>
            Clear
          </button>
        ) : null}
      </header>
      <div className={styles.outputBody}>
        {children ?? <p className={styles.outputEmpty}>{emptyLabel}</p>}
      </div>
      {filters.length ? (
        <div className={styles.outputFilters} aria-label="Output filters">
          {filters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              aria-pressed={filter.id === activeFilterId}
              className={`${filter.id === activeFilterId ? styles.outputFilterActive : ""} ${
                toneClass(filter.tone)
              }`}
              onClick={() => onFilterChange?.(filter.id)}
            >
              {filter.label}
              {filter.count !== undefined ? <span>{filter.count}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function MopiensStatusBar({
  items,
  ariaLabel = "Application status",
}: MopiensStatusBarProps) {
  return (
    <footer aria-label={ariaLabel} className={styles.statusBar}>
      {items.map((item) => (
        <span
          key={item.id}
          className={`${styles.statusBarItem} ${toneClass(item.tone)} ${
            item.grow ? styles.statusBarItemGrow : ""
          }`}
        >
          {item.tone ? <span className={styles.statusLamp} aria-hidden /> : null}
          <span className={styles.statusBarLabel}>{item.label}</span>
          {item.value !== undefined ? <strong>{item.value}</strong> : null}
        </span>
      ))}
    </footer>
  );
}
