import { AiScenarioError } from "../scenario-generation/types";
import { DOCUMENT_LIMITS } from "./validation";

export interface DocxXmlBudget { nodes: number; textCharacters: number; attributeCharacters: number }
export const DOCX_XML_LIMITS = Object.freeze({ partNodes: 20_000, totalNodes: 50_000, depth: 64, attributes: 128, tokenCharacters: 16_384, attributeCharacters: 512_000 });
const activeContent = /macroEnabled|vbaProject|altChunk|oleObject/i;
function reject(): never { throw new AiScenarioError("INVALID_DOCUMENT", "DOCX XML complexity exceeds safety limits or XML contains unsupported content."); }
function whitespace(char: string | undefined): boolean { return char === " " || char === "\t" || char === "\r" || char === "\n"; }
function xmlCharacter(code: number): boolean {
  return code === 9 || code === 10 || code === 13 || (code >= 0x20 && code <= 0xd7ff) || (code >= 0xe000 && code <= 0xfffd) || (code >= 0x10000 && code <= 0x10ffff);
}

/**
 * Single-pass, non-tree XML preflight. Only a depth-bounded name stack and
 * bounded scalar tokens are retained; no entity substitution runs on the
 * entire part. All parts share one budget before Mammoth sees any archive.
 * This is deliberately a conservative XML subset, not a replacement for the
 * downstream OOXML parser. DTDs and user-defined entities are never allowed.
 */
export function inspectBoundedDocxXml(data: Uint8Array, budget: DocxXmlBudget, relationships = false): void {
  if (data.length > 8 * 1024 * 1024) reject();
  const xml = new TextDecoder("utf-8", { fatal: true }).decode(data);
  let position = 0, nodes = 0, roots = 0;
  const stack: string[] = [];
  const node = () => { if (++nodes > DOCX_XML_LIMITS.partNodes || ++budget.nodes > DOCX_XML_LIMITS.totalNodes) reject(); };
  const skipWhitespace = () => { while (whitespace(xml[position])) position++; };
  const name = () => {
    const start = position;
    while (position < xml.length && !whitespace(xml[position]) && !"/>=?".includes(xml[position])) {
      if (position - start >= 256) reject();
      position++;
    }
    const value = xml.slice(start, position);
    if (!/^[:_\p{L}][:_\p{L}\p{N}\p{M}.\-\u00b7]*$/u.test(value) || activeContent.test(value)) reject();
    return value;
  };
  const scalar = (stop: number, attribute: boolean, entities: boolean): string => {
    let value = "";
    while (position < stop) {
      let char: string;
      if (entities && xml[position] === "&") {
        const start = ++position;
        while (position < stop && xml[position] !== ";") { if (position - start >= 16) reject(); position++; }
        if (position === stop) reject();
        const entity = xml.slice(start, position++);
        const predefined: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
        if (Object.hasOwn(predefined, entity)) char = predefined[entity];
        else {
          if (!/^#(?:[0-9]+|x[0-9a-fA-F]+)$/.test(entity)) reject();
          const code = parseInt(entity.slice(entity[1] === "x" ? 2 : 1), entity[1] === "x" ? 16 : 10);
          if (!xmlCharacter(code)) reject();
          char = String.fromCodePoint(code);
        }
      } else {
        const code = xml.codePointAt(position)!;
        if (!xmlCharacter(code) || (entities && attribute && xml[position] === "<")) reject();
        char = String.fromCodePoint(code); position += char.length;
      }
      // Charge the decoded character before allocating its retained string.
      if (attribute) {
        budget.attributeCharacters += char.length;
        if (budget.attributeCharacters > DOCX_XML_LIMITS.attributeCharacters || value.length + char.length > DOCX_XML_LIMITS.tokenCharacters) reject();
      } else {
        budget.textCharacters += char.length;
        if (budget.textCharacters > DOCUMENT_LIMITS.textCharacters) reject();
      }
      value += char;
    }
    if (activeContent.test(value)) reject();
    return value;
  };
  while (position < xml.length) {
    if (xml[position] !== "<") {
      const end = xml.indexOf("<", position), stop = end < 0 ? xml.length : end;
      node();
      const value = scalar(stop, false, true);
      if ((!stack.length && value.trim()) || value.includes("]]>")) reject();
      continue;
    }
    node();
    if (xml.startsWith("<!--", position) || xml.startsWith("<?", position)) {
      const comment = xml.startsWith("<!--", position), start = position + (comment ? 4 : 2);
      const end = xml.indexOf(comment ? "-->" : "?>", start);
      if (end < 0 || end - start > DOCX_XML_LIMITS.tokenCharacters || (comment && xml.slice(start, end).includes("--"))) reject();
      position = end + (comment ? 3 : 2);
      continue;
    }
    if (xml.startsWith("<![CDATA[", position)) {
      if (!stack.length) reject();
      const end = xml.indexOf("]]>", position + 9);
      if (end < 0) reject();
      position += 9; scalar(end, false, false); position = end + 3;
      continue;
    }
    if (xml.startsWith("<!", position)) reject();
    position++;
    if (xml[position] === "/") {
      position++; const closing = name(); skipWhitespace();
      if (xml[position++] !== ">" || stack.pop() !== closing) reject();
      continue;
    }
    const opening = name();
    if (!stack.length && ++roots !== 1) reject();
    if (stack.length + 1 > DOCX_XML_LIMITS.depth) reject();
    const attributes = new Set<string>();
    while (position < xml.length) {
      const before = position; skipWhitespace();
      if (xml[position] === ">" || xml[position] === "/") break;
      if (position === before || attributes.size >= DOCX_XML_LIMITS.attributes) reject();
      node(); const attribute = name();
      if (attributes.has(attribute)) reject();
      attributes.add(attribute); skipWhitespace();
      if (xml[position++] !== "=") reject();
      skipWhitespace(); const quote = xml[position++];
      if (quote !== '"' && quote !== "'") reject();
      const end = xml.indexOf(quote, position);
      if (end < 0 || end - position > DOCX_XML_LIMITS.tokenCharacters * 16) reject();
      const value = scalar(end, true, true); position++;
      const local = attribute.split(":").at(-1);
      if (relationships && ((local === "TargetMode" && /^external$/i.test(value.trim()))
        || (local === "Target" && /^(?:[a-z][a-z0-9+.-]*:|\/\/|\.\.)/i.test(value.trim())))) reject();
    }
    const empty = xml[position] === "/";
    if (empty) position++;
    if (xml[position++] !== ">") reject();
    if (!empty) stack.push(opening);
  }
  if (roots !== 1 || stack.length) reject();
}
