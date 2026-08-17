"use client";

import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import { useEffect, useRef, useState } from "react";
import { dvor1150DisabledMenuTooltip, dvor1150MenuStructure } from "@/lib/dvor1150/menu-structure";
import type { Dvor1150MenuGroup, Dvor1150MenuItem } from "@/lib/dvor1150";
import { useDvor1150PmdtStore } from "@/stores/dvor1150-pmdt-store";

function MenuItemRow({ group, item, closeMenu, depth = 0 }: { group: Dvor1150MenuGroup; item: Dvor1150MenuItem; closeMenu: () => void; depth?: number }) {
  const openScreen = useDvor1150PmdtStore((state) => state.openScreen);
  const openView = useDvor1150PmdtStore((state) => state.openView);
  const openLogin = useDvor1150PmdtStore((state) => state.openLogin);
  const logout = useDvor1150PmdtStore((state) => state.logout);
  const setSimulationParametersOpen = useDvor1150PmdtStore((state) => state.setSimulationParametersOpen);
  const restoreConfig = useDvor1150PmdtStore((state) => state.restoreConfig);
  const backupConfig = useDvor1150PmdtStore((state) => state.backupConfig);
  const setBypass = useDvor1150PmdtStore((state) => state.setMonitorBypass);
  const setTransmitterMode = useDvor1150PmdtStore((state) => state.setTransmitterMode);
  const executeCommand = useDvor1150PmdtStore((state) => state.executeCommand);
  const security = useDvor1150PmdtStore((state) => state.securityLevel);
  const local = useDvor1150PmdtStore((state) => state.config.simulation.local);
  const needBackup = useDvor1150PmdtStore((state) => state.needBackup);
  const hasChildren = Boolean(item.children?.length);
  const isTx = item.action === "set-transmitter-mode";
  const isMaintenanceTx = isTx && item.transmitterMode !== "main";
  const unavailable = !item.enabled
    || (isTx && security < 3)
    || (isMaintenanceTx && !local)
    || (item.action === "config-restore" && (security < 3 || !local))
    || (item.action === "config-backup" && (security < 3 || !needBackup))
    || (item.action === "set-bypass" && (security < 3 || !local))
    || (item.action === "execute-command" && ((item.commandId === "enable-command-mode" || item.commandId === "disable-command-mode") ? security < 3 : security < 2));

  function selectItem() {
    if (unavailable || hasChildren) return;
    if (item.action === "open-config") { setSimulationParametersOpen(true); closeMenu(); return; }
    if (item.action === "open-login") { openLogin(); closeMenu(); return; }
    if (item.action === "logoff") { logout(); closeMenu(); return; }
    if (item.action === "config-restore") { if (restoreConfig()) closeMenu(); return; }
    if (item.action === "config-backup") { if (backupConfig()) closeMenu(); return; }
    if (item.action === "set-bypass") { if (setBypass("mon1", item.id.endsWith("on"))) closeMenu(); return; }
    if (item.action === "execute-command") { if (item.commandId && executeCommand(item.commandId)) closeMenu(); return; }
    if (item.action === "set-transmitter-mode") {
      if (item.transmitterId && item.transmitterMode && setTransmitterMode(item.transmitterId, item.transmitterMode)) closeMenu();
      return;
    }
    if (item.screenId) {
      if (item.viewId) openView(item.screenId, item.viewId, [group.label, item.label]);
      else openScreen(item.screenId, [group.label, item.label]);
      closeMenu();
    }
  }

  return <li className={`pmdt-vor-menu-item-row pmdt-vor-menu-item-row--depth-${depth}`} role="none">
    <button type="button" role="menuitem" aria-disabled={unavailable || undefined} aria-haspopup={hasChildren ? "menu" : undefined} title={unavailable ? dvor1150DisabledMenuTooltip : undefined} onClick={selectItem} className={`pmdt-menu-item ${unavailable ? "pmdt-menu-item--disabled" : "pmdt-menu-item--enabled"}`}>
      <span className="pmdt-menu-check" aria-hidden>{item.checked ? "•" : ""}</span>
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {hasChildren ? <CaretRight size={12} /> : null}
    </button>
    {hasChildren ? <ul role="menu" aria-label={item.label} className="pmdt-submenu absolute z-50">{item.children?.map((child) => <MenuItemRow key={child.id} group={group} item={child} closeMenu={closeMenu} depth={depth + 1} />)}</ul> : null}
  </li>;
}

export function Dvor1150MenuBar() {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (containerRef.current && event.target instanceof Node && !containerRef.current.contains(event.target)) setOpenGroup(null);
    };
    const closeEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpenGroup(null); };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => { document.removeEventListener("mousedown", closeOutside); document.removeEventListener("keydown", closeEscape); };
  }, []);
  return <div ref={containerRef} className="pmdt-menubar"><nav aria-label="Menu PMDT" className="flex items-stretch">
    {dvor1150MenuStructure.map((group) => <div key={group.id} className="relative" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpenGroup(null); }}>
      <button type="button" aria-expanded={openGroup === group.id} aria-haspopup="menu" onClick={() => setOpenGroup(openGroup === group.id ? null : group.id)} className={`pmdt-menu-root ${openGroup === group.id ? "pmdt-menu-root--open" : ""}`}>{group.label}</button>
      {openGroup === group.id ? <ul role="menu" aria-label={group.label} className="pmdt-menu-dropdown absolute left-0 top-full z-50">{group.items.map((item) => <MenuItemRow key={item.id} group={group} item={item} closeMenu={() => setOpenGroup(null)} depth={0} />)}</ul> : null}
    </div>)}
  </nav></div>;
}
