import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { WarningCircle } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { useId } from "react";
import {
  describeScenarioActionTransition,
  type ScenarioActionEvent,
} from "@/lib/scenario-evidence";

function actorLabel(actor: ScenarioActionEvent["actor"]) {
  if (actor === "system") return "Hệ thống";
  if (actor === "instructor") return "Giám khảo";
  return "Thí sinh";
}

function formatInput(value: ScenarioActionEvent["input"]) {
  if (value === undefined) return null;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return "[không hiển thị]";
  }
}

export function ScenarioActionTimeline({
  events,
  title = "Nhật ký kỹ thuật PMDT",
}: {
  events: readonly ScenarioActionEvent[];
  title?: string;
}) {
  const titleId = `scenario-action-timeline-title-${useId().replaceAll(":", "")}`;
  const technicalEvents = events.filter((event) => event.kind !== "view");

  return (
    <section aria-labelledby={titleId} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id={titleId} className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">Ghi nhận cả thao tác được chấp nhận và lệnh bị từ chối để đối chiếu cách xử lý cảnh báo.</p>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--surface-muted)] px-2.5 py-1 font-mono text-xs text-[var(--text-secondary)]">{technicalEvents.length}</span>
      </div>
      {technicalEvents.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-[var(--border-strong)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-muted)]">Chưa có thao tác kỹ thuật được ghi nhận.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {technicalEvents.map((event) => {
            const transitions = describeScenarioActionTransition(event);
            const input = formatInput(event.input);
            return (
              <li key={event.id} className="rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  {event.accepted ? <CheckCircle aria-label="Được chấp nhận" size={19} weight="fill" className="mt-0.5 shrink-0 text-[#16a34a]" /> : <WarningCircle aria-label="Bị từ chối" size={19} weight="fill" className="mt-0.5 shrink-0 text-[#dc2626]" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="font-mono text-xs font-bold text-[var(--accent)]">#{String(event.sequence).padStart(2, "0")}</span>
                      <p className="font-semibold text-[var(--text-primary)]">{event.label}</p>
                      <span className="text-[11px] text-[var(--text-muted)]">· {actorLabel(event.actor)} · {event.kind}</span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{event.menuPath.join(" › ") || "PMDT"} · {new Date(event.occurredAt).toLocaleTimeString("vi-VN")}</p>
                    {input ? <p className="mt-2 break-all font-mono text-[11px] text-[var(--text-secondary)]">Input: {input}</p> : null}
                    {event.reason ? <p className={`mt-2 text-xs leading-5 ${event.accepted ? "text-[var(--text-secondary)]" : "text-[#b91c1c]"}`}>{event.reason}</p> : null}
                    {transitions.length > 0 ? <ul className="mt-2 space-y-1 font-mono text-[11px] text-[var(--accent)]">{transitions.map((transition) => <li key={transition}>↳ {transition}</li>)}</ul> : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
