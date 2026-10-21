"use client";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import type { FieldSource, JsonValue, ValueSchema } from "@/lib/ai/scenario-authoring/types";
import { resolveValueVariant } from "@/lib/ai/scenario-authoring/forms/helpers";

export const authoringInputClass = "min-w-0 w-full rounded-lg border border-[var(--cns-btn-ghost-border)] bg-[var(--cns-surface-card)] px-3 py-2 text-sm text-[var(--cns-text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7] disabled:opacity-60";
export const authoringCardClass = "max-w-full break-words min-w-0 rounded-xl border border-[var(--cns-border-subtle)] bg-[var(--cns-surface-card)]/90 p-4 backdrop-blur-md";
export function initialValue(schema: ValueSchema): JsonValue {
  if (schema.initial !== undefined) return structuredClone(schema.initial);
  if (schema.nullable) return null;
  if (schema.type === "object" && schema.variants?.length) return structuredClone(schema.variants[0].initial);
  if (schema.type === "object") return Object.fromEntries(Object.entries(schema.properties ?? {}).map(([key, child]) => [key, initialValue(child)]));
  if (schema.type === "array") return [];
  if (schema.type === "boolean") return false;
  if (schema.type === "number") return schema.min ?? 0;
  if (schema.type === "select") return schema.options?.[0]?.value ?? "";
  return "";
}
export function valueLabel(value: JsonValue | undefined, schema?: ValueSchema): string {
  if (value === undefined || value === null) return "Chưa đặt";
  if (Array.isArray(value)) return value.length ? value.map((item) => valueLabel(item, schema?.item)).join("; ") : "Chưa có mục";
  if (typeof value === "object") return Object.entries(value).map(([key, item]) => `${schema?.properties?.[key]?.label ?? key}: ${valueLabel(item, schema?.properties?.[key])}`).join(" · ");
  const label = typeof value === "boolean" ? (value ? "Có" : "Không") : schema?.options?.find((option) => option.value === String(value))?.label ?? String(value);
  return `${label}${schema?.unit ? ` ${schema.unit}` : ""}`;
}
export function sourceLabel(source?: FieldSource): string {
  if (source?.kind === "user") return "Bạn đã chỉnh";
  if (source?.kind === "document") return `Từ tài liệu${source.documentName ? ` · ${source.documentName}` : ""}${source.segmentLabel ? ` · ${source.segmentLabel}` : ""}`;
  if (source?.kind === "ai-suggestion") return "AI đề xuất · Cần đối chiếu";
  return "Mặc định simulator";
}
/** Every native structure uses typed controls. No paths or JSON entry. */
export function AiAuthoringField({ schema, value, onChange, disabled = false }: {
  schema: ValueSchema; value: JsonValue; onChange: (value: JsonValue) => void; disabled?: boolean;
}) {
  const id = useId();
  const helpId = `${id}-help`;
  const listId = schema.type === "text" && schema.options?.length ? `${id}-options` : undefined;
  const locked = disabled || schema.readOnly;
  const help = <p id={helpId} className="text-xs leading-relaxed text-[var(--cns-text-secondary)]">{schema.help}{schema.unit ? ` Đơn vị: ${schema.unit}.` : ""}{schema.min !== undefined ? ` Tối thiểu: ${schema.min}.` : ""}{schema.max !== undefined ? ` Tối đa: ${schema.max}.` : ""}{schema.readOnly ? " Trường chỉ đọc của simulator." : ""}</p>;
  if (schema.nullable && (schema.type === "object" || schema.type === "array")) {
    return <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={locked} checked={value !== null} onChange={(event) => onChange(event.currentTarget.checked ? initialValue({ ...schema, nullable: false }) : null)} />Sử dụng {schema.label}</label>{value === null ? <p className="text-xs text-[var(--cns-text-secondary)]">Không áp dụng. {schema.help}</p> : <AiAuthoringField schema={{...schema,nullable:false}} value={value} onChange={onChange} disabled={locked} />}</div>;
  }
  if (schema.type === "object") {
    const object = value && !Array.isArray(value) && typeof value === "object" ? value : {};
    if (schema.variants) {
      const discriminator = schema.discriminator ?? "kind";
      const variant = resolveValueVariant(schema, value);
      const selector = schema.properties?.[discriminator];
      return <fieldset disabled={locked} aria-describedby={helpId} className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 rounded-lg border border-[var(--cns-border-subtle)] p-3"><legend className="px-1 font-medium">{schema.label}</legend>{help}
        <AiAuthoringField schema={{ ...selector, type: "select", label: selector?.label ?? `Loại ${schema.label}`, help: selector?.help ?? schema.help, required: true, options: schema.variants.map(({ value, label }) => ({ value, label })) }} value={variant?.value ?? ""} disabled={locked} onChange={(next) => {
          const selected = schema.variants!.find(option => option.value === next);
          if (selected) onChange(structuredClone(selected.initial));
        }} />
        {variant ? <AiAuthoringField schema={{ ...variant.schema, properties: Object.fromEntries(Object.entries(variant.schema.properties ?? {}).filter(([key]) => key !== discriminator)) }} value={value} disabled={locked} onChange={onChange} /> : <p role="alert">Chưa có mô tả trường cho loại này. Không thể chỉnh an toàn.</p>}
      </fieldset>;
    }
    return <fieldset disabled={locked} aria-describedby={helpId} className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 rounded-lg border border-[var(--cns-border-subtle)] p-3"><legend className="px-1 font-medium">{schema.label}</legend>{help}
      {Object.entries(schema.properties ?? {}).map(([key, child]) => <AiAuthoringField key={key} schema={child} value={object[key] ?? null} disabled={locked} onChange={(next) => onChange({ ...object, [key]: next })} />)}
    </fieldset>;
  }
  if (schema.type === "array") {
    const items = Array.isArray(value) ? value : [];
    const variants = schema.variants;
    const replace = (index: number, next: JsonValue) => onChange(items.map((item, i) => i === index ? next : item));
    return <fieldset disabled={locked} aria-describedby={helpId} className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 rounded-lg border border-[var(--cns-border-subtle)] p-3"><legend className="px-1 font-medium">{schema.label}</legend>{help}
      {!items.length ? <p className="text-xs">Chưa có mục. Thêm nếu bài tập cần; không tự chọn lỗi.</p> : null}
      {items.map((item, index) => {
        const variant = resolveValueVariant(schema, item);
        const kind = variant?.value;
        return <div key={index} className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 rounded-lg border border-[var(--cns-border-subtle)] p-3">
          {variants ? <label className="grid gap-1 text-sm">Loại {schema.label} {index + 1}<select disabled={locked} className={authoringInputClass} value={String(kind ?? "")} onChange={(event) => { const selected = variants.find((option) => option.value === event.currentTarget.value); if (selected) replace(index, structuredClone(selected.initial)); }}><option disabled value="">Chọn loại được hỗ trợ</option>{variants.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label> : null}
          {variant || schema.item ? <AiAuthoringField schema={variant?.schema ?? schema.item!} value={item} disabled={locked} onChange={(next) => replace(index, next)} /> : <p role="alert">Chưa có mô tả trường cho loại này. Không thể chỉnh an toàn.</p>}
          <Button disabled={locked} size="sm" className="h-auto min-h-9 max-w-full whitespace-normal py-2" onClick={() => onChange(items.filter((_, i) => i !== index))} aria-label={`Xóa ${schema.label} ${index + 1}`}>Xóa mục</Button>
        </div>;
      })}
      <Button disabled={locked || (schema.maxItems !== undefined && items.length >= schema.maxItems) || (!variants?.length && !schema.item)} size="sm" className="h-auto min-h-9 max-w-full whitespace-normal py-2" onClick={() => onChange([...items, variants?.length ? structuredClone(variants[0].initial) : initialValue(schema.item!)])}>Thêm {schema.label}</Button>
    </fieldset>;
  }
  return <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1.5">
    <label htmlFor={id} className="text-sm font-medium">{schema.label}</label>
    {schema.nullable ? <label className="flex items-center gap-2 text-xs"><input type="checkbox" disabled={locked} checked={value !== null} onChange={(event) => onChange(event.currentTarget.checked ? initialValue({ ...schema, nullable: false }) : null)} />Đặt giá trị {schema.label}</label> : null}
    {schema.type === "select" ? <select id={id} aria-describedby={helpId} disabled={locked || (schema.nullable && value === null)} required={schema.required} value={String(value ?? "")} className={authoringInputClass} onChange={(event) => onChange(event.currentTarget.value)}><option value="" disabled>Chọn giá trị</option>{schema.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : schema.type === "boolean" ? <input id={id} aria-describedby={helpId} type="checkbox" disabled={locked || (schema.nullable && value === null)} checked={value === true} onChange={(event) => onChange(event.currentTarget.checked)} className="h-4 w-4" /> : <input id={id} aria-describedby={helpId} list={listId} className={authoringInputClass} type={schema.type === "number" ? "number" : "text"} disabled={locked || (schema.nullable && value === null)} value={value === null ? "" : String(value)} required={schema.required} min={schema.min} max={schema.max} step={schema.step ?? "any"} maxLength={schema.maxLength} onChange={(event) => onChange(schema.type === "number" ? event.currentTarget.value === "" ? null : Number(event.currentTarget.value) : event.currentTarget.value)} />}
    {listId ? <datalist id={listId} aria-label={`Gợi ý ${schema.label}`}>{schema.options!.map((option, index) => <option key={`${option.value}-${index}`} value={option.value} label={option.label}>{option.label}</option>)}</datalist> : null}
    {help}
  </div>;
}
