"use client";

import { useEffect, useRef } from "react";
import type { SensorState, SiteState } from "@/lib/types";

export type SiteContextAction =
  | "monitoring"
  | "configuration"
  | "status"
  | "statistics"
  | "settings";

type SiteContextMenuProps = {
  site: SiteState;
  x: number;
  y: number;
  trigger: HTMLButtonElement;
  onClose: () => void;
  onSelect: (
    action: SiteContextAction,
    site: SiteState,
    sensor: SensorState | null,
    trigger: HTMLButtonElement,
  ) => void;
};

type MenuActionButtonProps = {
  label: string;
  disabled?: boolean;
  onClick: () => void;
};

function MenuActionButton({
  label,
  disabled = false,
  onClick,
}: MenuActionButtonProps) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-7 w-full items-center px-2 text-left font-mono text-[10px] text-[#202325] hover:bg-[#304a86] hover:text-white focus-visible:bg-[#304a86] focus-visible:text-white focus-visible:outline-none disabled:cursor-not-allowed disabled:text-[#777b7d] disabled:hover:bg-transparent disabled:hover:text-[#777b7d]"
    >
      {label}
    </button>
  );
}

export function SiteContextMenu({
  site,
  x,
  y,
  trigger,
  onClose,
  onSelect,
}: SiteContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const firstEnabled = menuRef.current?.querySelector<HTMLButtonElement>(
      'button:not([disabled])',
    );
    firstEnabled?.focus();

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target)
      ) {
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        trigger.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", onClose);
    window.addEventListener("scroll", onClose, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose, trigger]);

  function select(
    action: SiteContextAction,
    sensor: SensorState | null,
  ) {
    onSelect(action, site, sensor, trigger);
    onClose();
  }

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={"T\u00e1c v\u1ee5 " + site.name}
      className="fixed z-50 w-64 border-2 border-[#202a64] bg-[#c8cacc] p-1 shadow-[6px_8px_0_rgb(28_31_34/0.3)]"
      style={{ left: x, top: y }}
    >
      <MenuActionButton
        label="Sensor A Monitoring"
        disabled={!site.sensorA}
        onClick={() => select("monitoring", site.sensorA)}
      />
      <MenuActionButton
        label="Sensor A Configuration"
        disabled={!site.sensorA}
        onClick={() => select("configuration", site.sensorA)}
      />
      <MenuActionButton
        label="Sensor A Status"
        disabled={!site.sensorA}
        onClick={() => select("status", site.sensorA)}
      />

      <div role="separator" className="my-1 border-t border-[#777b7d] shadow-[0_1px_0_#eceeef]" />

      <MenuActionButton
        label="Sensor B Monitoring"
        disabled={!site.sensorB}
        onClick={() => select("monitoring", site.sensorB)}
      />
      <MenuActionButton
        label="Sensor B Configuration"
        disabled={!site.sensorB}
        onClick={() => select("configuration", site.sensorB)}
      />
      <MenuActionButton
        label="Sensor B Status"
        disabled={!site.sensorB}
        onClick={() => select("status", site.sensorB)}
      />

      <div role="separator" className="my-1 border-t border-[#777b7d] shadow-[0_1px_0_#eceeef]" />

      <MenuActionButton
        label="Site Statistics"
        onClick={() => select("statistics", null)}
      />
      <MenuActionButton
        label="Site Settings"
        onClick={() => select("settings", null)}
      />
    </div>
  );
}
