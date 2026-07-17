"use client";

import { CaretDown, CaretRight } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import {
  disabledMenuTooltip,
  dmeMenuStructure,
} from "@/lib/dme-menu-structure";
import type { DmeMenuGroup, DmeMenuItem } from "@/lib/dme-types";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";

interface MenuItemRowProps {
  group: DmeMenuGroup;
  item: DmeMenuItem;
  closeMenu: () => void;
  depth?: number;
}

function MenuItemRow({
  group,
  item,
  closeMenu,
  depth = 0,
}: MenuItemRowProps) {
  const openScreen = useDmePmdtStore((state) => state.openScreen);
  const unavailable = !item.enabled;
  const hasChildren = Boolean(item.children?.length);

  function selectItem() {
    if (unavailable || hasChildren || !item.screenId) return;
    openScreen(item.screenId, [group.label, item.label], item.label);
    closeMenu();
  }

  return (
    <li className="group/item relative" role="none">
      <button
        type="button"
        role="menuitem"
        aria-disabled={unavailable || undefined}
        aria-haspopup={hasChildren ? "menu" : undefined}
        title={unavailable ? disabledMenuTooltip : undefined}
        onClick={selectItem}
        className={`flex min-h-8 w-full min-w-52 items-center gap-3 px-3 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#60a5fa] ${
          unavailable
            ? "cursor-not-allowed text-[#94a3b8] opacity-50"
            : "cursor-default text-[#e2e8f0] hover:bg-[#1e40af]"
        }`}
      >
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {hasChildren ? <CaretRight aria-hidden size={12} /> : null}
      </button>

      {hasChildren ? (
        <ul
          role="menu"
          aria-label={item.label}
          className={`absolute top-0 z-50 hidden border border-[#475569] bg-[#0f172a] py-1 shadow-xl group-hover/item:block group-focus-within/item:block ${
            depth === 0 ? "left-full" : "right-full"
          }`}
        >
          {item.children?.map((child) => (
            <MenuItemRow
              key={child.id}
              group={group}
              item={child}
              closeMenu={closeMenu}
              depth={depth + 1}
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
      className="relative z-40 flex h-9 items-stretch border-b border-[#334155] bg-[#1e293b] px-1"
    >
      <nav aria-label="Menu PMDT" className="flex items-stretch">
        {dmeMenuStructure.map((group) => {
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
                className={`flex h-full items-center gap-1 px-3 text-xs font-medium text-[#e2e8f0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#93c5fd] ${
                  open ? "bg-[#1e40af]" : "hover:bg-[#334155]"
                }`}
              >
                {group.label}
                <CaretDown aria-hidden size={10} />
              </button>

              {open ? (
                <ul
                  role="menu"
                  aria-label={group.label}
                  className="absolute left-0 top-full z-50 border border-[#475569] bg-[#0f172a] py-1 shadow-xl"
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

