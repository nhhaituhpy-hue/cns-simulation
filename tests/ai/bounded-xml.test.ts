// @vitest-environment node
import { expect, it } from "vitest";
import { inspectBoundedDocxXml, DOCX_XML_LIMITS, type DocxXmlBudget } from "@/lib/ai/documents/bounded-xml";
const budget = (): DocxXmlBudget => ({ nodes: 0, textCharacters: 0, attributeCharacters: 0 });
const check = (xml: string, current = budget(), relationships = false) => inspectBoundedDocxXml(Buffer.from(xml), current, relationships);

it("counts quoted attributes, escaped characters and CDATA without treating their contents as markup", () => {
  const current = budget();
  check('<?xml version="1.0"?><x a="&quot; > / &amp;"><!-- <y/> --><![CDATA[<y/>]]>&#x1F680;&amp;</x>', current);
  expect(current.textCharacters).toBe(7);
  expect(current.nodes).toBeLessThan(10);
});

it.each([
  '<x><y></x></y>', '<x/><y/>', '<x a="1" a="2"/>', '<x>&undefined;</x>',
  '<x>&#0;</x>', '<x>&#xD800;</x>', '<x>&#x110000;</x>', '<x><!-- bad -- comment --></x>',
  '<x><![CDATA[unterminated</x>', '<x a="unterminated/>', '<x><!DOCTYPE x></x>',
  '<x>&#000000000000000000000000000000000065;</x>',
])("rejects malformed or unsupported XML without passing it to a tree parser: %s", (xml) => {
  expect(() => check(xml)).toThrow();
});

it("accepts the exact text/depth bounds and charges decoded non-BMP characters as UTF-16 units", () => {
  check(`<x>${"a".repeat(120_000)}</x>`);
  expect(() => check(`<x>${"a".repeat(119_999)}&#x1F680;</x>`)).toThrow();
  check(`${"<x>".repeat(64)}text${"</x>".repeat(64)}`);
  expect(() => check(`${"<x>".repeat(65)}text${"</x>".repeat(65)}`)).toThrow();
});

it("limits comments and processing instructions as nodes, even though they contain no visible text", () => {
  expect(() => check(`<x>${"<!-- -->".repeat(DOCX_XML_LIMITS.partNodes)}</x>`)).toThrow();
  expect(() => check(`<x>${"<?p ?>".repeat(DOCX_XML_LIMITS.partNodes)}</x>`)).toThrow();
});

it("rejects encoded external relationship targets and permits local package references", () => {
  check('<Relationships><Relationship Target="media/image1.png" TargetMode="Internal"/></Relationships>', budget(), true);
  for (const target of ["&#104;ttps://evil.invalid", "&#47;&#47;evil.invalid", "../outside.xml"]) {
    expect(() => check(`<Relationships><Relationship Target="${target}"/></Relationships>`, budget(), true)).toThrow();
  }
});
