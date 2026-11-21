"use client";

import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import { useEffect, useRef, useState } from "react";
import {
  disabledMenuTooltip,
  unavailableVorCommandReason,
  vorMenuStructure,
} from "@/lib/vor-menu-structure";
import type { VorMenuGroup, VorMenuItem } from "@/lib/vor-types";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import { dvorConfigurationLoadBlock } from "@/lib/dvor1150a/configuration-file";
import { choosePmdtConfiguration, printPmdtConfiguration, savePmdtConfiguration } from "./pmdt-file-commands";

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
  const loadBlock = useVorPmdtStore(dvorConfigurationLoadBlock);
  const openScreen = useVorPmdtStore((state) => state.openScreen);
  const openView = useVorPmdtStore((state) => state.openView);
  const setConfigPanelOpen = useVorPmdtStore((state) => state.setConfigPanelOpen);
  const setAboutDialogOpen = useVorPmdtStore((state) => state.setAboutDialogOpen);
  const openLogin = useVorPmdtStore((state) => state.openLogin);
  const logout = useVorPmdtStore((state) => state.logout);
  const restoreBackupConfig = useVorPmdtStore((state) => state.restoreBackupConfig);
  const backupConfig = useVorPmdtStore((state) => state.backupConfig);
  const setTransmitterMode = useVorPmdtStore((state) => state.setTransmitterMode);
  const transferTransmitter = useVorPmdtStore((state) => state.transferTransmitter);
  const setConfigValue = useVorPmdtStore((state) => state.setConfigValue);
  const integralBypass = useVorPmdtStore((state) => state.config.simulation.integralMonitorBypass);
  const securityLevel = useVorPmdtStore((state) => state.securityLevel);
  const local = useVorPmdtStore((state) => state.config.simulation.local);
  const needBackup = useVorPmdtStore((state) => state.needBackup);
  const hasConfigurationBackup = useVorPmdtStore((state) => state.hasConfigurationBackup);
  const scenarioActive = useVorPmdtStore((state) => state.scenario.active);
  const isFileLoad = item.id === "system-config-load";
  const isFileRead = item.id === "system-config-save" || item.id === "system-config-print";
  const fileReason = isFileLoad ? loadBlock : isFileRead && (scenarioActive || securityLevel < 1)
    ? "Đăng nhập để xuất cấu hình; không xuất cấu hình trong scenario." : undefined;
  const isTransferCommand = item.id === "tx-command-transfer";
  const isTransmitterCommand = item.action === "set-transmitter-mode" || isTransferCommand;
  const isMainTransmitterCommand = isTransferCommand || (isTransmitterCommand && item.transmitterMode === "main");
  const isMaintenanceTransmitterCommand = isTransmitterCommand && !isMainTransmitterCommand;
  const canOperateTransmitter = securityLevel >= 3
    && (isMainTransmitterCommand || local);
  const isRestoreCommand = item.action === "config-restore";
  const isBackupCommand = item.action === "config-backup";
  const isIntegralBypassCommand = item.id === "monitor-command-integral-bypass-on" || item.id === "monitor-command-integral-bypass-off";
  const bypassValue = item.id === "monitor-command-integral-bypass-on";
  const unavailableReason = unavailableVorCommandReason(item.id);
  const unavailable = !item.enabled || Boolean(fileReason)
    || Boolean(unavailableReason)
    || (isIntegralBypassCommand && (securityLevel < 3 || (bypassValue && !local)))
    || (isTransmitterCommand && !canOperateTransmitter)
    || (isRestoreCommand && (securityLevel < 3 || !local || !hasConfigurationBackup || scenarioActive))
    || (isBackupCommand && (securityLevel < 3 || (hasConfigurationBackup && !needBackup) || scenarioActive));
  const hasChildren = Boolean(item.children?.length);

  function selectItem() {
    if (unavailable || hasChildren) return;
    if (isFileLoad) { choosePmdtConfiguration(); closeMenu(); return; }
    if (item.id === "system-config-save") {
      if (window.confirm("Lưu cấu hình applied bằng file training JSON (không phải file SELEX). Nháp chưa Apply không được lưu. Theo HDCV, lưu hai bản tại ổ máy tính và bộ nhớ ngoài.")) savePmdtConfiguration();
      closeMenu(); return;
    }
    if (item.id === "system-config-print") { printPmdtConfiguration(); closeMenu(); return; }
    if (isIntegralBypassCommand) {
      setConfigValue("simulation.integralMonitorBypass", bypassValue);
      closeMenu();
      return;
    }
    if (isTransferCommand) {
      transferTransmitter();
      closeMenu();
      return;
    }
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
      if (restoreBackupConfig()) closeMenu();
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
          fileReason ?? unavailableReason ?? (!item.enabled
            ? disabledMenuTooltip
            : isIntegralBypassCommand && securityLevel < 3
              ? "Yêu cầu đăng nhập SEC3 hoặc SEC4"
            : isIntegralBypassCommand && bypassValue && !local
              ? "Bật Local trước khi bật Integral Monitor Bypass"
            : (isRestoreCommand || isBackupCommand) && scenarioActive
              ? "Không dùng backup/restore profile trong scenario"
            : isRestoreCommand && !hasConfigurationBackup
              ? "Chưa có backup — hãy dùng Config Backup trước"
            : isRestoreCommand && securityLevel < 3
              ? "Yêu cầu đăng nhập SEC3 hoặc SEC4"
              : isRestoreCommand && !local
                ? "Bật Local để khôi phục cấu hình"
            : isBackupCommand && securityLevel < 3
              ? "Yêu cầu đăng nhập SEC3 hoặc SEC4"
              : isBackupCommand && hasConfigurationBackup && !needBackup
                ? "Chưa có cấu hình cần backup"
                : isTransmitterCommand && securityLevel < 3
                  ? "GUEST chỉ được xem tham số"
                  : isMaintenanceTransmitterCommand && !local
                    ? "Bật Local để điều khiển transmitter"
              : undefined)
        }
        onClick={selectItem}
        className={`pmdt-menu-item ${
          unavailable
            ? "pmdt-menu-item--disabled"
            : "pmdt-menu-item--enabled"
        }`}
      >
        <span className="pmdt-menu-check" aria-hidden>{(isIntegralBypassCommand ? integralBypass === bypassValue : item.checked) ? "•" : ""}</span>
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
