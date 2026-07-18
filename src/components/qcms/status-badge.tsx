import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { MinusCircle } from "@phosphor-icons/react/dist/csr/MinusCircle";
import { Warning } from "@phosphor-icons/react/dist/csr/Warning";
import { WarningCircle } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { XCircle } from "@phosphor-icons/react/dist/csr/XCircle";
import type { Icon } from "@phosphor-icons/react/dist/lib/types";
import type { SensorStatus } from "@/lib/types";
import { SENSOR_STATUS_DETAILS } from "./qcms-utils";

const STATUS_ICONS: Record<SensorStatus, Icon> = {
  green: CheckCircle,
  orange: Warning,
  yellow: WarningCircle,
  red: XCircle,
  turquoise: CheckCircle,
  magenta: XCircle,
  grey: MinusCircle,
};

type StatusBadgeProps = {
  status: SensorStatus;
  compact?: boolean;
};

export function StatusBadge({ status, compact = false }: StatusBadgeProps) {
  const details = SENSOR_STATUS_DETAILS[status];
  const StatusIcon = STATUS_ICONS[status];

  return (
    <span
      className={`inline-flex min-w-0 shrink-0 items-center gap-1.5 rounded border font-semibold ${
        compact ? "px-2 py-1 text-xs" : "px-2.5 py-1.5 text-sm"
      }`}
      style={{
        color: details.textColor,
        borderColor: details.borderColor,
        backgroundColor: details.backgroundColor,
      }}
      aria-label={`Trạng thái: ${details.label}`}
      title={details.description}
    >
      <StatusIcon aria-hidden size={compact ? 15 : 17} weight="fill" />
      <span className="truncate">{details.label}</span>
    </span>
  );
}
