import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { Info } from "@phosphor-icons/react/dist/csr/Info";
import { WarningCircle } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { XCircle } from "@phosphor-icons/react/dist/csr/XCircle";
import type { Icon } from "@phosphor-icons/react/dist/lib/types";
import type { StepComparison, StepComparisonStatus } from "@/lib/types";

const STATUS_META: Record<
  StepComparisonStatus,
  { label: string; icon: Icon; className: string }
> = {
  correct: {
    label: "Đúng",
    icon: CheckCircle,
    className: "border-emerald-600 bg-emerald-50 text-emerald-800",
  },
  incorrect: {
    label: "Sai",
    icon: XCircle,
    className: "border-red-600 bg-red-50 text-red-800",
  },
  missing: {
    label: "Thiếu",
    icon: WarningCircle,
    className: "border-amber-600 bg-amber-50 text-amber-900",
  },
  redundant: {
    label: "Thừa",
    icon: Info,
    className: "border-sky-700 bg-sky-50 text-sky-900",
  },
};

function ActionCell({
  action,
  fallback,
}: {
  action: StepComparison["expected"];
  fallback: string;
}) {
  if (!action) {
    return <span className="text-[var(--text-muted)]">{fallback}</span>;
  }

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <code className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 font-mono text-xs font-semibold text-[var(--text-primary)]">
          {action.input === "" ? "RETURN" : action.input}
        </code>
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {action.resultLabel}
        </span>
      </div>
      <p className="mt-1 truncate font-mono text-xs text-[var(--text-muted)]">
        {action.menuTitle}
      </p>
    </div>
  );
}

export function StepDiff({ comparisons }: { comparisons: StepComparison[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <caption className="sr-only">
            So sánh từng bước giữa đáp án chuẩn và bài nộp
          </caption>
          <thead className="bg-[var(--surface-muted)] text-xs font-semibold text-[var(--text-secondary)]">
            <tr>
              <th className="w-16 px-4 py-3" scope="col">
                Bước
              </th>
              <th className="px-4 py-3" scope="col">
                Đáp án chuẩn
              </th>
              <th className="px-4 py-3" scope="col">
                Bài nộp
              </th>
              <th className="w-32 px-4 py-3" scope="col">
                Kết quả
              </th>
            </tr>
          </thead>
          <tbody>
            {comparisons.map((comparison, index) => {
              const meta = STATUS_META[comparison.status];
              const StatusIcon = meta.icon;

              return (
                <tr
                  key={`${comparison.stepNumber}-${comparison.status}`}
                  className="grade-row border-t border-[var(--border)] align-top"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <th
                    className="px-4 py-4 font-mono text-xs font-semibold text-[var(--text-secondary)]"
                    scope="row"
                  >
                    {comparison.stepNumber}
                  </th>
                  <td className="px-4 py-4">
                    <ActionCell action={comparison.expected} fallback="Không có" />
                  </td>
                  <td className="px-4 py-4">
                    <ActionCell action={comparison.submitted} fallback="Chưa thực hiện" />
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded border-l-2 px-2 py-1 text-xs font-semibold ${meta.className}`}
                    >
                      <StatusIcon aria-hidden size={16} weight="fill" />
                      {meta.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
