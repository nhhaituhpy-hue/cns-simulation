// @vitest-environment node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { extractDocumentBytes } from "@/lib/ai/documents/extract";
import { explicitParameterRows, validateParameterProposal } from "@/lib/ai/scenario-generation/parameter-proposal";
import { createTemplateDefinition } from "@/lib/ai/scenario-generation/capabilities";
import { DOCUMENT_LIMITS } from "@/lib/ai/documents/validation";

it("ships an editable Vietnamese template that the production DOCX extractor accepts", async () => {
  const name = "mau-tai-lieu-tao-kich-ban-ai.docx";
  const bytes = await readFile(resolve("public/templates", name));
  expect(bytes.length).toBeGreaterThan(0);
  expect(bytes.length).toBeLessThanOrEqual(DOCUMENT_LIMITS.fileBytes);
  const document = await extractDocumentBytes({ id: "9cd64c3c-62fd-4e8f-bc37-0cbce22a9157", name,
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"), storageKey: "template-test" }, bytes);
  const text = document.segments.map(segment => segment.text).join("\n");
  for (const content of [/mẫu trống/i, /ví dụ/i, /mục tiêu/i, /nguồn/i, /trang/i, /carrier-9960/, /không phải/i]) expect(text).toMatch(content);
  for (const moduleLabel of ["DVOR 1150", "DVOR 1150A", "DME 1119A", "DVOR 220", "DME 320", "ADS-B"]) expect(text).toContain(moduleLabel);
  expect(document.segments.length).toBeGreaterThan(0);
});


it.each(["dvor-1150", "dvor-1150a", "dme-1119a", "dvor-220", "dme-320", "ads-b"] as const)("ships a readable %s parameter template with executable settings rows", async moduleId => {
  const name=`ai-scenario-${moduleId}.docx`;
  const bytes=await readFile(resolve("public/templates",name));
  const document=await extractDocumentBytes({id:"9cd64c3c-62fd-4e8f-bc37-0cbce22a9157",name,mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",bytes:bytes.length,sha256:createHash("sha256").update(bytes).digest("hex"),storageKey:"module-template-test"},bytes);
  const text=document.segments.map(s=>s.text).join("\n");
  for(const word of ["SET ","RECOVER ","Trạng thái khởi động","Điều kiện đạt","Quyền sửa","Chẩn đoán","đơn vị"])expect(text).toContain(word);
  expect(text).toMatch(/configuration\.|targetSensor\./);
  expect(text).not.toContain("API_KEY");
});

it.each(["dvor-1150", "dvor-1150a", "dme-1119a", "dvor-220", "dme-320", "ads-b"] as const)("round-trips the edited %s example through extraction, requirements and native proposal validation", async moduleId=>{
 const name=`ai-scenario-${moduleId}.docx`;const bytes=await readFile(resolve("public/templates",name));
 const document=await extractDocumentBytes({id:"9cd64c3c-62fd-4e8f-bc37-0cbce22a9157",name,mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",bytes:bytes.length,sha256:createHash("sha256").update(bytes).digest("hex"),storageKey:"native-example-test"},bytes);
 const input={moduleId,name:"Edited module parameter example",description:"Use the supported native exercise example and its explicitly stated SET and RECOVER values.",difficulty:"intermediate" as const};
 const rows=explicitParameterRows(input,[document]);
 const templateId=moduleId==="dme-1119a"?"tx1-delay-drift":moduleId==="dme-320"?"low-power":moduleId==="ads-b"?"adsb-11-configure-e2e-thresholds":"carrier-9960";
 const citations=rows.map(row=>{
  const text=`${row.phase==="initial"?"SET":"RECOVER"} ${row.fieldId} = ${row.rawValue}`;
  const segment=document.segments.find(segment=>segment.text.includes(text));expect(segment).toBeDefined();
  return{documentId:document.id,segmentLabel:segment!.label,quote:text};
 });
 const assignments=rows.map((row,citation)=>{
  const match=/^(true|false|-?\d+(?:\.\d+)?)(?: (.+))?$/.exec(row.rawValue)!;expect(match).not.toBeNull();
  return{fieldId:row.fieldId,value:JSON.parse(match[1]),...(match[2]?{unit:match[2]}:{}),citation};
 });
 const value={version:2,status:"supported",moduleId,templateId,explanation:"Materialize every actual parameter row from the module example.",initial:assignments.filter((_,index)=>rows[index].phase==="initial"),recovery:assignments.filter((_,index)=>rows[index].phase==="recovery"),citations,unhandledRequirements:[]};
 const result=validateParameterProposal(input,[document],createTemplateDefinition(moduleId,templateId),templateId,value);
 expect(result.provenance).toMatchObject({mode:"native-parameter-generation",parameters:{verification:{recoveryVerified:true}}});
});
