"use client";

import { useMemo, useState } from "react";
import {
  MopiensBeveledButton,
  MopiensStatusIndicator,
  MopiensTable,
  type MopiensVisualTone,
} from "@/modules/operations/mopiens-pmdt";
import type { Dme320LogCategory } from "../domain/types";
import { DME320_SCREEN_LABELS } from "./navigation";
import { formatStatus } from "./presentation";
import type { Dme320ScreenProps } from "./screen-types";
import styles from "./dme320-ui.module.css";

const LOG_CATEGORIES: Dme320LogCategory[] = [
  "alarm",
  "control",
  "event",
  "authentication",
  "configuration",
  "maintenance",
];

function dateTimeLocal(timestampMs: number): string {
  const date = new Date(timestampMs);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(timestampMs - offsetMs).toISOString().slice(0, 16);
}

function logTone(category: Dme320LogCategory): MopiensVisualTone | undefined {
  if (category === "alarm") return "alarm";
  if (category === "control") return "info";
  if (category === "maintenance") return "warning";
  return undefined;
}

interface HistoryFilter {
  from: string;
  to: string;
  categories: Dme320LogCategory[];
  text: string;
}

function Dme320EventHistoryScreen(props: Dme320ScreenProps) {
  const isLmi = props.screenId === "history-lmi";
  const initialCategories = isLmi
    ? (["alarm", "control", "event", "maintenance"] as Dme320LogCategory[])
    : [...LOG_CATEGORIES];
  const initialFilter: HistoryFilter = {
    from: dateTimeLocal(props.simulation.nowMs - 24 * 60 * 60 * 1_000),
    to: dateTimeLocal(props.simulation.nowMs + 60_000),
    categories: initialCategories,
    text: "",
  };
  const [draft, setDraft] = useState<HistoryFilter>(initialFilter);
  const [applied, setApplied] = useState<HistoryFilter>(initialFilter);

  const rows = useMemo(() => {
    const fromMs = new Date(applied.from).getTime();
    const toMs = new Date(applied.to).getTime();
    const needle = applied.text.trim().toLocaleLowerCase();
    return [...props.simulation.logs]
      .filter((entry) => Number.isFinite(fromMs) ? entry.timestampMs >= fromMs : true)
      .filter((entry) => Number.isFinite(toMs) ? entry.timestampMs <= toMs : true)
      .filter((entry) => applied.categories.includes(entry.category))
      .filter((entry) => !needle || entry.message.toLocaleLowerCase().includes(needle) || entry.userId.toLocaleLowerCase().includes(needle))
      .reverse();
  }, [applied, props.simulation.logs]);

  function toggleCategory(category: Dme320LogCategory, checked: boolean) {
    setDraft((current) => ({
      ...current,
      categories: checked
        ? [...new Set([...current.categories, category])]
        : current.categories.filter((item) => item !== category),
    }));
  }

  return (
    <div className={styles.screenStack}>
      <header className={styles.screenHeader}>
        <div>
          <h2>{DME320_SCREEN_LABELS[props.screenId]}</h2>
          <p>{isLmi ? "Equipment-side control, alarm, and maintenance history" : "Complete PMDT event history for the active simulator session"}</p>
        </div>
        <MopiensStatusIndicator compact label="RESULTS" detail={`${rows.length} records`} tone={rows.some((entry) => entry.category === "alarm") ? "warning" : "normal"} />
      </header>

      <section className={styles.historyFilters} aria-label="History search filters">
        <label><span>From</span><input type="datetime-local" value={draft.from} onChange={(event) => setDraft({ ...draft, from: event.currentTarget.value })} /></label>
        <label><span>To</span><input type="datetime-local" value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.currentTarget.value })} /></label>
        <fieldset>
          <legend>Search Class</legend>
          {LOG_CATEGORIES.map((category) => (
            <label key={category} className={styles.checkField}>
              <input type="checkbox" checked={draft.categories.includes(category)} onChange={(event) => toggleCategory(category, event.currentTarget.checked)} />
              <span>{formatStatus(category)}</span>
            </label>
          ))}
        </fieldset>
        <label><span>Contains</span><input value={draft.text} placeholder="Detail or User ID" onChange={(event) => setDraft({ ...draft, text: event.currentTarget.value })} /></label>
        <div className={styles.actionRow}>
          <MopiensBeveledButton tone="primary" disabled={!draft.categories.length} onClick={() => setApplied(draft)}>Search</MopiensBeveledButton>
          <MopiensBeveledButton onClick={() => { setDraft(initialFilter); setApplied(initialFilter); }}>Reset Filters</MopiensBeveledButton>
        </div>
      </section>

      <MopiensTable
        caption={isLmi ? "LMI history log" : "PMDT history log"}
        rows={rows}
        dense
        emptyLabel="No history records match the selected time and class filters"
        getRowId={(row) => `${row.sequence}`}
        rowTone={(row) => logTone(row.category)}
        columns={[
          { id: "sequence", label: "No.", width: "8%", align: "right", render: (row) => row.sequence },
          { id: "time", label: "Time Tag", width: "22%", render: (row) => new Date(row.timestampMs).toLocaleString("en-GB", { hour12: false }) },
          { id: "class", label: "Class", width: "15%", render: (row) => formatStatus(row.category) },
          { id: "detail", label: "Detail", render: (row) => row.message },
          { id: "user", label: "User ID", width: "15%", render: (row) => row.userId },
        ]}
      />
    </div>
  );
}

function Dme320ParameterChangeHistoryScreen(props: Dme320ScreenProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const rows = props.simulation.parameterChangeLogs.filter((row) =>
    !normalizedQuery
    || `${row.userName} ${row.file} ${row.parameter} ${row.state}`.toLocaleLowerCase().includes(normalizedQuery),
  );

  return (
    <div className={styles.screenStack}>
      <header className={styles.screenHeader}>
        <div>
          <h2>Parameter Change</h2>
          <p>Configuration changes recorded when the running profile is saved to non-volatile flash.</p>
        </div>
        <MopiensStatusIndicator compact label="RESULTS" detail={`${rows.length} records`} tone="normal" />
      </header>
      <section className={styles.historyFilters} aria-label="Parameter change history filter">
        <label><span>Contains</span><input value={query} placeholder="Parameter or User ID" onChange={(event) => setQuery(event.currentTarget.value)} /></label>
      </section>
      <MopiensTable
        caption="Parameter change history"
        rows={rows}
        dense
        emptyLabel="No parameter change records"
        getRowId={(row) => row.id}
        columns={[
          { id: "time", label: "Time Tag", width: "20%", render: (row) => row.timeTag },
          { id: "file", label: "File", width: "16%", render: (row) => row.file },
          { id: "parameter", label: "Parameter", render: (row) => row.parameter },
          { id: "state", label: "State", width: "12%", render: (row) => row.state === "normal" ? "Normal" : row.state === "warning" ? "Alert Low" : "Alarm" },
          { id: "user", label: "User ID", width: "14%", render: (row) => row.userName },
        ]}
      />
    </div>
  );
}

export function Dme320HistoryScreen(props: Dme320ScreenProps) {
  if (props.screenId === "history-parameter-change") {
    return <Dme320ParameterChangeHistoryScreen {...props} />;
  }
  return <Dme320EventHistoryScreen {...props} />;
}
