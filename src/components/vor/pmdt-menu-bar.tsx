"use client";

import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import { useEffect, useRef, useState } from "react";
import {
  disabledMenuTooltip,
  vorMenuStructure,
} from "@/lib/vor-menu-structure";
import type { VorMenuGroup, VorMenuItem } from "@/lib/vor-types";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

interface MenuItemRowProps {
  group: VorMenuGroup;
  item: VorMenuItem;
  closeMenu: () => void;
}

function MenuItemRow({
  group,
  item,
  closeMenu,
}: MenuItemRowProps) {
  const openScreen = useVorPmdtStore((state) => state.openScreen);
  const openView = useVorPmdtStore((state) => state.openView);
  const setConfigPanelOpen = useVorPmdtStore((state) => state.setConfigPanelOpen);
  const setAboutDialogOpen = useVorPmdtStore((state) => state.setAboutDialogOpen);
  const openLogin = useVorPmdtStore((state) => state.openLogin);
  const logout = useVorPmdtStore((state) => state.logout);
  const restoreDefaultConfig = useVorPmdtStore((state) => state.restoreDefaultConfig);
  const backupConfig = useVorPmdtStore((state) => state.backupConfig);
  const setTransmitterMode = useVorPmdtStore((state) => state.setTransmitterMode);
  const securityLevel = useVorPmdtStore((state) => state.securityLevel);
  const local = useVorPmdtStore((state) => state.config.simulation.local);
  const needBackup = useVorPmdtStore((state) => state.needBackup);
  const isTransmitterCommand = item.action === "set-transmitter-mode";
  const isMainTransmitterCommand = isTransmitterCommand && item.transmitterMode === "main";
  const isMaintenanceTransmitterCommand = isTransmitterCommand && !isMainTransmitterCommand;
  const canOperateTransmitter = securityLevel >= 3
    && (isMainTransmitterCommand || local);
  const isRestoreCommand = item.action === "config-restore";
  const isBackupCommand = item.action === "config-backup";
  const unavailable = !item.enabled
    || (isTransmitterCommand && !canOperateTransmitter)
    || (isRestoreCommand && (securityLevel < 3 || !local))
    || (isBackupCommand && (securityLevel < 3 || !needBackup));
  const hasChildren = Boolean(item.children?.length);

  function selectItem() {
    if (unavailable || hasChildren) return;
    if (item.action === "open-config") {
      setAboutDialogOpen(false);
      setConfigPanelOpen(true);
      closeMenu();
      return;
    }
    if (item.action === "open-about") {
      setConfigPanelOpen(false);
      setAboutDialogOpen(true);
      closeMenu();
      return;
    }
    if (item.action === "open-login") {
      openLogin();
      closeMenu();
      return;
    }
    if (item.action === "logoff") {
      logout();
      closeMenu();
      return;
    }
    if (item.action === "config-restore") {
      if (restoreDefaultConfig()) closeMenu();
      return;
    }
    if (item.action === "config-backup") {
      if (backupConfig()) closeMenu();
      return;
    }
    if (item.action === "set-transmitter-mode") {
      if (!item.transmitterId || !item.transmitterMode) return;
      if (setTransmitterMode(item.transmitterId, item.transmitterMode)) closeMenu();
      return;
    }
    if (!item.screenId) return;
    if (item.viewId) {
      openView(item.screenId, item.viewId, [group.label, item.label], item.label);
    } else {
      openScreen(item.screenId, [group.label, item.label], item.label);
    }
    closeMenu();
  }

  return (
    <li className="pmdt-vor-menu-item-row" role="none">
      <button
        type="button"
        role="menuitem"
        aria-disabled={unavailable || undefined}
        aria-haspopup={hasChildren ? "menu" : undefined}
        title={
          !item.enabled
            ? disabledMenuTooltip
            : isRestoreCommand && securityLevel < 3
              ? "Yêu cầu đăng nhập SEC3 hoặc SEC4"
              : isRestoreCommand && !local
                ? "Bật Local để khôi phục cấu hình"
            : isBackupCommand && securityLevel < 3
              ? "Yêu cầu đăng nhập SEC3 hoặc SEC4"
              : isBackupCommand && !needBackup
                ? "Chưa có cấu hình cần backup"
                : isTransmitterCommand && securityLevel < 3
                  ? "GUEST chỉ được xem tham số"
                  : isMaintenanceTransmitterCommand && !local
                    ? "Bật Local để điều khiển transmitter"
              : undefined
        }
        onClick={selectItem}
        className={`pmdt-menu-item ${
          unavailable
            ? "pmdt-menu-item--disabled"
            : "pmdt-menu-item--enabled"
        }`}
      >
        <span className="pmdt-menu-check" aria-hidden>{item.checked ? "•" : ""}</span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {hasChildren ? <CaretRight aria-hidden size={12} /> : null}
      </button>

      {hasChildren ? (
        <ul
          role="menu"
          aria-label={item.label}
          className="pmdt-submenu absolute top-0 left-full z-50"
        >
          {item.children?.map((child) => (
            <MenuItemRow
              key={child.id}
              group={group}
              item={child}
              closeMenu={closeMenu}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function PmdtMenuBar() {
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnOutsidePointer(event: MouseEvent) {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        setOpenGroupId(null);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenGroupId(null);
    }

    document.addEventListener("mousedown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="pmdt-menubar"
    >
      <nav aria-label="Menu PMDT" className="flex items-stretch">
        {vorMenuStructure.map((group) => {
          const open = openGroupId === group.id;
          return (
            <div
              key={group.id}
              className="relative"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setOpenGroupId(null);
                }
              }}
            >
              <button
                type="button"
                aria-expanded={open}
                aria-haspopup="menu"
                onClick={() => setOpenGroupId(open ? null : group.id)}
                className={`pmdt-menu-root ${open ? "pmdt-menu-root--open" : ""}`}
              >
                {group.label}
              </button>

              {open ? (
                <ul
                  role="menu"
                  aria-label={group.label}
                  className="pmdt-menu-dropdown absolute left-0 top-full z-50"
                >
                  {group.items.map((item) => (
                    <MenuItemRow
                      key={item.id}
                      group={group}
                      item={item}
                      closeMenu={() => setOpenGroupId(null)}
                    />
                  ))}
                </ul>
              ) : null}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
