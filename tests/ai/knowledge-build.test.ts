// @vitest-environment node
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { retrieveDeviceKnowledge } from "@/lib/ai/knowledge/retrieve";
import { validateEvidenceDocuments } from "@/lib/ai/scenario-generation/validation";
const roots: string[]=[];
afterEach(async()=>{for(const root of roots.splice(0))await rm(root,{recursive:true,force:true});});
async function temporary(){const root=await mkdtemp("/opt/data/cache/scratch/cns-kb-build-test-");roots.push(root);return root;}

it("extracts actual PDF pages with hashes and original page locators, not invented semantic facts",async()=>{
 const { extractPdfReference }=await import("../../scripts/build-device-knowledge.mjs");
 const root=await temporary();
 const { default: PDFDocument }=await import("pdfkit");
 const data=await new Promise<Buffer>(resolve=>{const pdf=new PDFDocument({autoFirstPage:false});const chunks:Buffer[]=[];pdf.on("data",(chunk:Buffer)=>chunks.push(chunk));pdf.on("end",()=>resolve(Buffer.concat(chunks)));pdf.addPage().text("DVOR 1150A\nTX1 output power nominal 70 W");pdf.addPage();pdf.end();});
 const path=join(root,"manual.pdf");await writeFile(path,data);
 const result=await extractPdfReference({id:"manual",path,sourceKind:"manufacturer-manual",revision:null});
 expect(result.document.sha256).toBe(createHash("sha256").update(data).digest("hex"));
 expect(result.document.pageCount).toBe(2);expect(result.document.segments).toHaveLength(1);
 expect(result.document.segments[0]).toMatchObject({page:1,label:"PDF page 1",printedPage:null});
 expect(result.document.segments[0].text).toContain("TX1 output power nominal 70 W");
 expect(result.document.segments[0].textSha256).toBe(createHash("sha256").update(result.document.segments[0].text).digest("hex"));
 expect(result.coverage).toMatchObject({pagesTotal:2,pagesWithText:1,pagesWithoutText:[2],ocrPerformed:false});
 expect(result.document).not.toHaveProperty("tolerances");expect(result.document).not.toHaveProperty("scenario_bank");
});

it("fails closed for an invalid input identity before writing corpus",async()=>{
 const { validateKnowledgeSources }=await import("../../scripts/build-device-knowledge.mjs");
 expect(()=>validateKnowledgeSources({version:1,modules:[{moduleId:"../../else",documents:[]}]})).toThrow();
 expect(()=>validateKnowledgeSources({version:1,modules:[]})).toThrow();
});

it("writes only reference-only artifacts, extracts DOCX text sections, and reports legacy DOC as skipped",async()=>{
 const { buildKnowledgeCorpus }=await import("../../scripts/build-device-knowledge.mjs");
 const root=await temporary();const input=join(root,"manual.md");await writeFile(input,"# Operator-authored training reference\nOnly a test fixture.");
 const docxPath=join(process.cwd(),"public/templates/ai-scenario-ads-b.docx");
 const legacyDoc=join(root,"legacy.doc");await writeFile(legacyDoc,"legacy binary doc stub");
 const modules=["dvor-1150","dvor-1150a","dme-1119a","dvor-220","dme-320","ads-b"].map(moduleId=>({moduleId,documents:moduleId==="ads-b"?[{id:"reference",path:input,sourceKind:"simulation-reference",revision:null},{id:"docx-guide",path:docxPath,sourceKind:"operating-procedure",revision:null},{id:"legacy",path:legacyDoc,sourceKind:"operating-procedure",revision:null}]:[{id:"reference",path:input,sourceKind:"simulation-reference",revision:null}]}));
 const output=join(root,"out");const report=await buildKnowledgeCorpus({version:1,modules},output);
 const manifest=JSON.parse(await readFile(join(output,"manifest.json"),"utf8"));
 expect(manifest.mode).toBe("reference-only");expect(manifest.modules).toHaveLength(6);
 const adsb=JSON.parse(await readFile(join(output,"ads-b.json"),"utf8"));
 expect(adsb.documents.map((d:{id:string})=>d.id)).toEqual(["reference","docx-guide"]);
 const adsbReport=report.modules.find((m:{moduleId:string})=>m.moduleId==="ads-b")!;
 expect(adsbReport.coverage).toContainEqual(expect.objectContaining({skipped:true,name:"legacy.doc",reason:"UNSUPPORTED_FORMAT_REQUIRES_SEPARATE_EXTRACTION"}));
 for(const entry of manifest.modules){
  const bytes=await readFile(join(output,entry.file));expect(createHash("sha256").update(bytes).digest("hex")).toBe(entry.sha256);
  const retrieved=await retrieveDeviceKnowledge(entry.moduleId,"training reference ADS-B",{root:output});
  expect(retrieved.available).toBe(true);
  validateEvidenceDocuments(retrieved.documents);
 }
});
