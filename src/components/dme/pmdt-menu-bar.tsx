"use client";

import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import { useEffect, useRef, useState } from "react";
import { disabledMenuTooltip, dmeMenuStructure } from "@/lib/dme-menu-structure";
import type { DmeMenuGroup, DmeMenuItem } from "@/lib/dme-types";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";

interface MenuItemRowProps {
  group: DmeMenuGroup;
  item: DmeMenuItem;
  closeMenu: () => void;
}

function MenuItemRow({ group, item, closeMenu }: MenuItemRowProps) {
  const openScreen = useDmePmdtStore((state) => state.openScreen);
  const openView = useDmePmdtStore((state) => state.openView);
  const setConfigPanelOpen = useDmePmdtStore((state) => state.setConfigPanelOpen);
  const setAboutDialogOpen = useDmePmdtStore((state) => state.setAboutDialogOpen);
  const setPasswordDialogOpen = useDmePmdtStore((state) => state.setPasswordDialogOpen);
  const openLogin = useDmePmdtStore((state) => state.openLogin);
  const logout = useDmePmdtStore((state) => state.logout);
  const backupConfig = useDmePmdtStore((state) => state.backupConfig);
  const saveConfig = useDmePmdtStore((state) => state.saveConfig);
  const loadConfig = useDmePmdtStore((state) => state.loadConfig);
  const restoreConfig = useDmePmdtStore((state) => state.restoreConfig);
  const setTransmitterMode = useDmePmdtStore((state) => state.setTransmitterMode);
  const setDelayMode = useDmePmdtStore((state) => state.setDelayMode);
  const setMonitorBypass = useDmePmdtStore((state) => state.setMonitorBypass);
  const executeRmsCommand = useDmePmdtStore((state) => state.executeRmsCommand);
  const securityLevel = useDmePmdtStore((state) => state.securityLevel);
  const loginDialogOpen = useDmePmdtStore((state) => state.loginDialogOpen);
  const local = useDmePmdtStore((state) => state.data.local);
  const needBackup = useDmePmdtStore((state) => state.needBackup);
  const hasSavedConfiguration = useDmePmdtStore((state) => state.savedConfiguration !== null);
  const hasChildren = Boolean(item.children?.length);
  const isCommandModeToggle = item.action === "rms-command"
    && (item.id === "rms-command-enable-mode" || item.id === "rms-command-disable-mode");
  const isTransmitterTransfer = item.action === "rms-command" && item.id === "tx-command-transfer";
  const isDeviceCommand = item.action === "set-transmitter-mode"
    || item.action === "set-delay-mode"
    || item.action === "set-monitor-bypass";

  // The PMDT keeps the menu visible in Remote mode, but disables operations
  // that would change the station.  This mirrors the 1119A manual: viewing
  // screens is allowed after logon, while configuration and RMS commands
  // require the appropriate security level and Local control.  The TX
  // Transfer relay command is the documented exception: it remains available
  // in Remote without requiring monitor Bypass.
  const unavailable = !item.enabled || (
    !hasChildren && (
      (item.action === "config-save" && (loginDialogOpen || securityLevel < 1))
      || (item.action === "config-load" && (loginDialogOpen || securityLevel < 3 || !local || !hasSavedConfiguration))
      || (item.action === "config-print" && loginDialogOpen)
      || (item.action === "open-password-dialog" && (loginDialogOpen || securityLevel < 1 || !local))
      || (item.action === "config-backup" && (loginDialogOpen || securityLevel < 3 || !local || !needBackup))
      || (item.action === "config-restore" && (loginDialogOpen || securityLevel < 3 || !local))
      || (isDeviceCommand
        && (loginDialogOpen || securityLevel < 2 || !local))
      || (item.action === "rms-command"
        && (loginDialogOpen || securityLevel < (isCommandModeToggle ? 3 : 2) || (!isCommandModeToggle && !isTransmitterTransfer && !local)))
    )
  );

  const disabledReason = !item.enabled
    ? disabledMenuTooltip
    : loginDialogOpen
      ? "Đăng nhập RMS để sử dụng mục này"
      : item.action === "config-save" && securityLevel < 1
        ? "Yêu cầu đăng nhập RMS"
        : item.action === "config-load" && securityLevel < 3
          ? "Yêu cầu đăng nhập SEC3 hoặc SEC4"
        : item.action === "config-load" && !local
          ? "Bật Local để load cấu hình"
          : item.action === "config-load" && !hasSavedConfiguration
            ? "Chưa có file cấu hình đã Save"
        : item.action === "open-password-dialog" && securityLevel < 1
          ? "Yêu cầu đăng nhập RMS"
          : item.action === "open-password-dialog" && !local
            ? "Bật Local để đổi password"
        : item.action === "config-backup" && securityLevel < 3
          ? "Yêu cầu đăng nhập SEC3 hoặc SEC4"
          : item.action === "config-backup" && !local
            ? "Bật Local để backup cấu hình"
            : item.action === "config-backup" && !needBackup
              ? "Chưa có cấu hình cần backup"
              : (item.action === "config-restore" && securityLevel < 3)
                ? "Yêu cầu đăng nhập SEC3 hoặc SEC4"
                : (item.action === "config-restore" && !local)
                  ? "Bật Local để restore cấu hình"
                : (isDeviceCommand && securityLevel < 2)
                  ? "Yêu cầu đăng nhập SEC2 trở lên"
                : (isDeviceCommand && !local)
                    ? "Bật Local trước khi điều khiển thiết bị"
                    : (item.action === "rms-command" && securityLevel < (isCommandModeToggle ? 3 : 2))
                      ? `Yêu cầu đăng nhập SEC${isCommandModeToggle ? 3 : 2} trở lên`
                      : (item.action === "rms-command" && !isCommandModeToggle && !isTransmitterTransfer && !local)
                        ? "Bật Local trước khi thực hiện RMS command"
                        : undefined;

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
    if (item.action === "open-password-dialog") {
      setPasswordDialogOpen(true);
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
    if (item.action === "config-backup") {
      backupConfig();
      closeMenu();
      return;
    }
    if (item.action === "config-save") {
      saveConfig();
      closeMenu();
      return;
    }
    if (item.action === "config-load") {
      if (loadConfig()) closeMenu();
      return;
    }
    if (item.action === "config-print") {
      if (typeof window !== "undefined") window.print();
      closeMenu();
      return;
    }
    if (item.action === "config-restore") {
      restoreConfig();
      closeMenu();
      return;
    }
    if (item.action === "set-transmitter-mode") {
      if (item.transmitterId && item.transmitterMode) setTransmitterMode(item.transmitterId, item.transmitterMode);
      closeMenu();
      return;
    }
    if (item.action === "set-delay-mode") {
      if (item.transmitterId && item.delayMode) setDelayMode(item.transmitterId, item.delayMode);
      closeMenu();
      return;
    }
    if (item.action === "set-monitor-bypass") {
      if (item.monitorId !== undefined && item.bypassEnabled !== undefined) setMonitorBypass(item.monitorId, item.bypassEnabled);
      closeMenu();
      return;
    }
    if (item.action === "rms-command") {
      executeRmsCommand(item.id);
      closeMenu();
      return;
    }
    if (item.screenId && item.viewId) {
      openView(item.screenId, item.viewId, [group.label, item.label], item.label);
    } else if (item.screenId) {
      openScreen(item.screenId, [group.label, item.label], item.label);
    }
    closeMenu();
  }

  return (
    <li className="pmdt-dme-menu-item-row" role="none">
      <button
        type="button"
        role="menuitem"
        aria-disabled={unavailable || undefined}
        aria-haspopup={hasChildren ? "menu" : undefined}
        title={unavailable ? disabledReason : undefined}
        onClick={selectItem}
        className={`pmdt-menu-item ${unavailable ? "pmdt-menu-item--disabled" : "pmdt-menu-item--enabled"}`}
      >
        <span className="pmdt-menu-check" aria-hidden>{item.checked ? "•" : ""}</span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {hasChildren ? <CaretRight aria-hidden size={12} /> : null}
      </button>

      {hasChildren ? (
        <ul
          role="menu"
          aria-label={item.label}
          className="pmdt-submenu absolute left-full top-0 z-50"
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
      if (containerRef.current && event.target instanceof Node && !containerRef.current.contains(event.target)) {
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
    <div ref={containerRef} className="pmdt-menubar">
      <nav aria-label="Menu PMDT" className="flex items-stretch">
        {dmeMenuStructure.map((group) => {
          const open = openGroupId === group.id;
          return (
            <div
              key={group.id}
              className="relative"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setOpenGroupId(null);
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
                <ul role="menu" aria-label={group.label} className="pmdt-menu-dropdown absolute left-0 top-full z-50">
                  {group.items.map((item) => (
                    <MenuItemRow key={item.id} group={group} item={item} closeMenu={() => setOpenGroupId(null)} />
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
