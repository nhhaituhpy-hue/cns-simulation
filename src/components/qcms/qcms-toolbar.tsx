import {
  Buildings,
  CloudSun,
  Export,
  Gear,
  ListBullets,
  MapTrifold,
  Rewind,
  SignOut,
  SlidersHorizontal,
} from "@phosphor-icons/react";

export type QcmsPanel = "sites" | "log" | "replay" | "general";

type QcmsToolbarProps = {
  activePanel: QcmsPanel;
  onSelect: (panel: QcmsPanel) => void;
  onExit: () => void;
};

const toolbarItems = [
  {
    label: "MAPS",
    icon: MapTrifold,
    disabled: true,
    tooltip: "Kh\u00f4ng kh\u1ea3 d\u1ee5ng trong ch\u1ebf \u0111\u1ed9 m\u00f4 ph\u1ecfng",
  },
  { label: "SITES", icon: Buildings, panel: "sites" as const },
  {
    label: "MET",
    icon: CloudSun,
    disabled: true,
    tooltip: "Kh\u00f4ng kh\u1ea3 d\u1ee5ng trong ch\u1ebf \u0111\u1ed9 m\u00f4 ph\u1ecfng",
  },
  { label: "LOG", icon: ListBullets, panel: "log" as const },
  { label: "REPLAY", icon: Rewind, panel: "replay" as const },
  {
    label: "EXPORT",
    icon: Export,
    disabled: true,
    tooltip: "Kh\u00f4ng kh\u1ea3 d\u1ee5ng trong ch\u1ebf \u0111\u1ed9 m\u00f4 ph\u1ecfng",
  },
  {
    label: "CONF",
    icon: SlidersHorizontal,
    disabled: true,
    tooltip: "Kh\u00f4ng kh\u1ea3 d\u1ee5ng trong ch\u1ebf \u0111\u1ed9 m\u00f4 ph\u1ecfng",
  },
  { label: "GEN", icon: Gear, panel: "general" as const },
  { label: "EXIT", icon: SignOut, exit: true },
] as const;

export function QcmsToolbar({
  activePanel,
  onSelect,
  onExit,
}: QcmsToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="QCMS controls"
      className="flex min-w-0 gap-1 overflow-x-auto border-b border-[#40566b] bg-[#263748] p-2"
    >
      {toolbarItems.map((item) => {
        const Icon = item.icon;
        const active = "panel" in item && item.panel === activePanel;
        const disabled = "disabled" in item && item.disabled;
        const tooltip = "tooltip" in item ? item.tooltip : undefined;

        return (
          <button
            key={item.label}
            type="button"
            disabled={disabled}
            title={tooltip}
            aria-pressed={"panel" in item ? active : undefined}
            onClick={() => {
              if ("exit" in item && item.exit) {
                onExit();
              } else if ("panel" in item) {
                onSelect(item.panel);
              }
            }}
            className={
              "inline-flex min-h-14 min-w-[4.75rem] shrink-0 flex-col items-center justify-center gap-1 rounded px-3 py-2 text-[11px] font-semibold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#263748] " +
              (active
                ? "bg-[#e8f2fb] text-[#17324a] shadow-sm"
                : disabled
                  ? "cursor-not-allowed text-[#8293a2] opacity-60"
                  : "text-[#f4f7fa] hover:bg-[#344b60] active:bg-[#1d2c3a]")
            }
          >
            <Icon aria-hidden size={20} weight={active ? "fill" : "regular"} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
