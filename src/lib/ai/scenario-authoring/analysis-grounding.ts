import { templateRowSupports } from "./analysis-template";
import type { AuthoringField, JsonValue, ValueSchema } from "./types";

const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase().replace(/[^a-z0-9%°µ.+-]+/g, " ").trim();
const targetsIn = (text: string) => normalize(text).replace(/\b(?:transmitter|may phat)\s*([12])\b/g, "tx$1").replace(/\bmonitor\s*([12])\b/g, "mon$1").replace(/\bsensor[ _-]*([ab])\b/g, "sensor$1");
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const matchesTarget = (text: string, target: string) => new RegExp(`(?:^|[^a-z0-9])${escape(target)}(?:$|[^a-z0-9])`).test(targetsIn(text));
const nonNominal = /\b(?:example|placeholder|fault|injection|inject|restore|recovery|recover|repair|troubleshooting|hypothetical|exercise|test case|vi du|minh hoa|loi dua vao|khoi phuc|gia dinh)\b/;
const nominal = /\b(?:nominal|normal|default|baseline|setpoint|recommended|binh thuong|dinh muc|mac dinh|thong so nen|gia tri chuan)\b/;
const uncertain = /\b(?:not|never|unknown|unspecified|unclassified|if|might|could|perhaps|either|khong|chua xac dinh)\b|\?/;
type Phase = "normal" | "other" | "unknown";
interface Assertion { text: string; start: number; end: number; phase: Phase }
function phaseOf(text: string): Phase {
  const normalized = normalize(text);
  if (nonNominal.test(normalized)) return "other";
  if (uncertain.test(normalized) || text.includes("?")) return "unknown";
  return nominal.test(normalized) ? "normal" : "unknown";
}
/** Preserve original offsets and heading scope, including negative parent sections.
 * A model-selected substring cannot erase an example/fault/restore qualifier.
 */
function assertions(source: string): Assertion[] {
  const result: Assertion[] = [], headings: Array<{level: number; phase: Phase}> = [];
  for (const match of source.matchAll(/[^\n]+/g)) {
    const line = match[0], trimmed = line.trim(), markdown = /^(#{1,6})\s+/.exec(trimmed);
    const numbered = /^\d+(?:\.\d+)*[.)]?\s+/.exec(trimmed);
    const headingText = trimmed.slice(numbered?.[0].length ?? 0);
    const plainHeading = headingText.length < 160 && !/\d|[=;|.!?]/.test(headingText.replace(/[.:]$/, ""));
    if (markdown || plainHeading) {
      const level = markdown ? markdown[1].length : numbered ? numbered[0].split(".").filter(s => /\d/.test(s)).length : headings.some(h => h.phase === "other") ? headings.at(-1)!.level + 1 : 1;
      while (headings.length && headings.at(-1)!.level >= level) headings.pop();
      headings.push({level, phase: phaseOf(trimmed)});
      continue;
    }
    const inherited = headings.some(h => h.phase === "other") || nonNominal.test(normalize(line)) ? "other" : headings.at(-1)?.phase ?? "unknown";
    // Semicolon-connected fields share one assertion phase, but not numerical values.
    for (const sentence of line.matchAll(/.+?(?:\.(?=\s|$)|$)/g)) {
      const text = sentence[0], local = phaseOf(text);
      const phase = inherited === "other" || local === "other" ? "other" : uncertain.test(normalize(text)) || text.includes("?") ? "unknown" : local === "normal" ? "normal" : inherited;
      const start = match.index! + sentence.index!;
      result.push({text, start, end: start + text.length, phase});
    }
  }
  return result;
}
function citedAssertions(source: string, quote: string, template = false): Assertion[] | null {
  if (!quote) return null;
  const all = assertions(source), cited: Assertion[] = [];
  let occurrences = 0;
  for (let from = 0; from < source.length;) {
    const start = source.indexOf(quote, from);
    if (start < 0) break;
    // Without a source offset we cannot choose between repeated, differently scoped quotes.
    const overlapping = all.filter(a => a.start < start + quote.length && a.end > start);
    if (!overlapping.length || overlapping.some(a => a.phase === "other" || (!template && a.phase !== "normal"))) return null;
    cited.push(...overlapping); occurrences++;
    from = start + quote.length;
  }
  return occurrences ? cited : null;
}

/** Conservative lexical verifier: unknown phase or subject/unit ambiguity stays native.
 * evidenceText may veto conflicts; only the cited original source can affirm a claim.
 */
export function supportsValue(field: AuthoringField, value: JsonValue, quote: string, evidenceText: string, moduleId: string, assertionSource = evidenceText): boolean {
  if (/ignore.{0,50}(instructions|rules)|system\s+(?:prompt|instructions)|(?:send|reveal|show).{0,40}(?:credentials|secrets)|exfiltrat|api[ _-]?key|publish\s+now|bỏ qua.{0,40}(quy tắc|hướng dẫn)/i.test(evidenceText)) return false;
  const moduleNames = [...evidenceText.matchAll(/\b(?:dvor\s*[- ]?\s*(?:1150a?|220)|dme\s*[- ]?\s*(?:1119a|320)|ads\s*[- ]?\s*b)\b/gi)].map(m => normalize(m[0]).replace(/[- ]/g, ""));
  if (moduleNames.some(id => id !== moduleId.replace(/-/g, ""))) return false;
  const stations = new Set([...evidenceText.matchAll(/\b(?:station|site|trạm)\s+([\p{L}\d_-]+)\s*:/giu)].map(m => normalize(m[1])));
  const rows = evidenceText.split(/\r?\n/).filter(line => line.includes("|")).map(line => line.split("|").map(cell => cell.trim()).filter(Boolean));
  const header = rows.findIndex(cells => cells.some(cell => /^(?:site|station|tram)(?: name)?$/.test(normalize(cell))));
  if (header >= 0) {
    const column = rows[header].findIndex(cell => /^(?:site|station|tram)(?: name)?$/.test(normalize(cell)));
    for (const row of rows.slice(header + 1)) if (row.length === rows[header].length && row[column] && !/^[-: ]+$/.test(row[column])) stations.add(normalize(row[column]));
  }
  if (stations.size > 1) return false;
  const template = templateRowSupports(field, value, quote, assertionSource);
  if (template !== null) return template && !!citedAssertions(assertionSource, quote, true) && templateRowSupports(field, value, quote, evidenceText) === true;
  const cited = citedAssertions(assertionSource, quote);
  if (!cited) return false;
  const target = [...`${field.id} ${field.group} ${field.schema.label}`.matchAll(/\b(?:tx[12]|mon[12]|sensor[ _-]?[ab]|site-\d+)\b/gi)].map(m => normalize(m[0]).replace(/ /g, ""));
  const label = normalize(field.schema.label.replace(/\([^)]*\)/g, ""));
  const aliases = [label, normalize(field.id.split(".").at(-1)!.replace(/([a-z])([A-Z])/g, "$1 $2"))].filter(s => s.length > 2);
  const tails = (statement: string) => statement.split(";").flatMap(part => {
    if (/[<>≤≥≈±~]/.test(part)) return [];
    const normalized = normalize(part).replace(/\.$/, "");
    if (!target.every(id => matchesTarget(normalized, id))) return [];
    const alias = aliases.find(name => new RegExp(`(?:^| )${escape(name)}(?:$| )`).test(normalized));
    if (!alias) return [];
    const before = normalized.slice(0, normalized.indexOf(alias));
    if (!target.every(id => matchesTarget(before, id))) return [];
    const mentioned = [...targetsIn(normalized).matchAll(/\b(?:tx\d+|mon\d+|sensor[ab]|site-\d+)\b/g)].map(m => m[0]);
    if (mentioned.some(id => target.some(t => t.replace(/[0-9ab]+$/, "") === id.replace(/[0-9ab]+$/, "")) && !target.includes(id))) return [];
    // Only grammatical connectors may intervene: never borrow a threshold, TX2, or another number.
    const tail = normalized.slice(normalized.indexOf(alias) + alias.length).replace(/^(?:\s*(?:nominal|normal|default|setpoint|recommended|is|equals)\b)*\s*/, "");
    return [tail];
  });
  const numeric = (tail: string): number | undefined => {
    const first = /^[-+]?\d+(?:\.\d+)?/.exec(tail);
    if (!first) return undefined;
    const after = tail.slice(first[0].length).trim();
    if (field.schema.unit ? after !== normalize(field.schema.unit) : after !== "") return undefined;
    return Number(first[0]);
  };
  if (typeof value === "number") {
    const defaults = new Set(assertions(evidenceText).filter(a => a.phase === "normal").flatMap(a => tails(a.text).map(numeric)).filter(n => n !== undefined));
    if (defaults.size > 1) return false;
  }
  const matches = (tail: string) => {
    if (typeof value === "number") return numeric(tail) === value;
    if (typeof value === "boolean") return new RegExp(`^(?:${value ? "true|enabled|on|yes" : "false|disabled|off|no"})(?:$| )`).test(tail);
    if (typeof value === "string") {
      const options = [value, ...field.schema.options?.filter(o => o.value === value).map(o => o.label) ?? []];
      return options.some(option => new RegExp(`^${escape(normalize(option))}(?:$| )`).test(tail));
    }
    return false;
  };
  return cited.some(a => tails(a.text).some(matches)) && quote.split(/\n|\.(?=\s|$)/).some(part => tails(part).some(matches));
}

/** Every scalar of a compound claim needs its own target/quantity/value evidence. */
export function supportsValueSchema(schema: ValueSchema, value: JsonValue, field: AuthoringField, quote: string, source: string, moduleId: string, assertionSource = source): boolean {
  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    return Object.keys(value).length > 0 && Object.entries(value).every(([key, child]) => {
      const childSchema = schema.properties?.[key];
      return !!childSchema && supportsValueSchema(childSchema, child, {...field, id: `${field.id}.${key}`, schema: childSchema}, quote, source, moduleId, assertionSource);
    });
  }
  if (schema.type === "array") {
    if (!Array.isArray(value) || !value.length) return false;
    return value.every((child, index) => {
      const childSchema = schema.variants?.find(v => child && typeof child === "object" && !Array.isArray(child) && child[schema.discriminator ?? "kind"] === v.value)?.schema ?? schema.item;
      return !!childSchema && supportsValueSchema(childSchema, child, {...field, id: `${field.id}.${index}`, schema: childSchema}, quote, source, moduleId, assertionSource);
    });
  }
  return supportsValue({...field, schema}, value, quote, source, moduleId, assertionSource);
}
