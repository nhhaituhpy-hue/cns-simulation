import type { CSSProperties } from "react";
import type {
  MopiensLimitGridProps,
  MopiensPropertyGridProps,
  MopiensTableProps,
  MopiensVisualTone,
} from "./types";
import styles from "./mopiens-pmdt.module.css";

const toneClasses: Record<MopiensVisualTone, string> = {
  normal: styles.toneNormal,
  info: styles.toneInfo,
  warning: styles.toneWarning,
  alarm: styles.toneAlarm,
  pending: styles.tonePending,
  inactive: styles.toneInactive,
};

export function MopiensPropertyGrid({
  sections,
  ariaLabel,
  labelWidth = "42%",
  emptyLabel = "No properties",
}: MopiensPropertyGridProps) {
  const gridStyle = { "--mopiens-property-label-width": labelWidth } as CSSProperties;
  const hasRows = sections.some((section) => section.rows.length > 0);

  return (
    <div className={styles.propertyGridFrame} style={gridStyle}>
      <table className={styles.propertyGrid}>
        <caption>{ariaLabel}</caption>
        <colgroup>
          <col className={styles.propertyLabelColumn} />
          <col />
        </colgroup>
        {!hasRows ? (
          <tbody>
            <tr>
              <td colSpan={2} className={styles.gridEmptyCell}>
                {emptyLabel}
              </td>
            </tr>
          </tbody>
        ) : null}
        {sections.map((section) => (
          <tbody key={section.id}>
            {section.title ? (
              <tr className={styles.propertySectionRow}>
                <th colSpan={2} scope="colgroup">
                  {section.title}
                </th>
              </tr>
            ) : null}
            {section.rows.map((row) => (
              <tr
                key={row.id}
                className={`${row.disabled ? styles.gridRowDisabled : ""} ${
                  row.tone ? toneClasses[row.tone] : ""
                }`}
              >
                <th scope="row">
                  <span>{row.label}</span>
                  {row.description !== undefined ? <small>{row.description}</small> : null}
                </th>
                <td>{row.value}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

export function MopiensTable<TRow>({
  caption,
  columns,
  rows,
  getRowId,
  emptyLabel = "No data",
  dense = false,
  rowTone,
}: MopiensTableProps<TRow>) {
  return (
    <div className={styles.dataTableFrame}>
      <table className={`${styles.dataTable} ${dense ? styles.dataTableDense : ""}`}>
        <caption>{caption}</caption>
        <colgroup>
          {columns.map((column) => (
            <col key={column.id} style={column.width ? { width: column.width } : undefined} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.id}
                scope="col"
                className={styles[`align${(column.align ?? "left")[0].toUpperCase()}${(
                  column.align ?? "left"
                ).slice(1)}`]}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={styles.gridEmptyCell}>
                {emptyLabel}
              </td>
            </tr>
          ) : null}
          {rows.map((row, rowIndex) => {
            const tone = rowTone?.(row, rowIndex);
            return (
              <tr key={getRowId(row, rowIndex)} className={tone ? toneClasses[tone] : undefined}>
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={styles[`align${(column.align ?? "left")[0].toUpperCase()}${(
                      column.align ?? "left"
                    ).slice(1)}`]}
                  >
                    {column.render(row, rowIndex)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function MopiensLimitGrid({
  caption,
  rows,
  emptyLabel = "No limits",
}: MopiensLimitGridProps) {
  return (
    <MopiensTable
      caption={caption}
      rows={rows}
      getRowId={(row) => row.id}
      emptyLabel={emptyLabel}
      dense
      rowTone={(row) => row.tone}
      columns={[
        { id: "parameter", label: "Parameter", width: "25%", render: (row) => row.label },
        { id: "alarm-low", label: "Alarm Low", align: "right", render: (row) => row.alarmLow ?? "" },
        { id: "warning-low", label: "Warning Low", align: "right", render: (row) => row.warningLow ?? "" },
        { id: "nominal", label: "Nominal", align: "right", render: (row) => row.nominal ?? "" },
        { id: "value", label: "Value", align: "right", render: (row) => <strong>{row.value}</strong> },
        { id: "warning-high", label: "Warning High", align: "right", render: (row) => row.warningHigh ?? "" },
        { id: "alarm-high", label: "Alarm High", align: "right", render: (row) => row.alarmHigh ?? "" },
        { id: "unit", label: "Unit", align: "center", render: (row) => row.unit ?? "" },
      ]}
    />
  );
}
