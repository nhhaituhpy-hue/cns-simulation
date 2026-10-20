// @vitest-environment node
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { runDocumentParser } from "@/lib/ai/documents/isolated";
let root: string | undefined;
afterEach(async()=>{vi.unstubAllEnvs();if(root)await rm(root,{recursive:true,force:true});root=undefined;});
const metadata={id:"11111111-1111-4111-8111-111111111111",name:"notes.txt",mimeType:"text/plain",bytes:5,sha256:"a".repeat(64),storageKey:"unused"};
async function script(contents:string){root=await mkdtemp("/opt/data/cache/scratch/cns-parser-test-");const path=join(root,"parser.mjs");await writeFile(path,contents);return path;}
it("starts a separate parser with no AI or database secrets and a fixed heap cap",async()=>{
 vi.stubEnv("CNS_AI_API_KEY","never-pass-this");vi.stubEnv("DATABASE_URL","never-pass-this-either");
 const path=await script(`process.once('message',({metadata})=>{process.send({ok:true,document:{id:metadata.id,name:metadata.name,sha256:metadata.sha256,segments:[{label:'text',text:JSON.stringify({secret:!!process.env.CNS_AI_API_KEY,db:!!process.env.DATABASE_URL,heap:process.execArgv})}]}});process.disconnect();});`);
 const result=await runDocumentParser(metadata,{entryPath:path,storageRoot:root!,timeoutMs:2000});
 const detail=JSON.parse(result.segments[0].text);expect(detail.secret).toBe(false);expect(detail.db).toBe(false);expect(detail.heap).toContain("--max-old-space-size=192");
});
it("kills a stalled parser and rejects only the document job",async()=>{
 const path=await script(`process.once('message',()=>{setInterval(()=>{},1000);});`);
 await expect(runDocumentParser(metadata,{entryPath:path,storageRoot:root!,timeoutMs:150})).rejects.toMatchObject({code:"DOCUMENT_TIMEOUT"});
});
it("cancels parsing without invoking a failed-job fallback",async()=>{
 const path=await script(`process.once('message',()=>{setInterval(()=>{},1000);});`);const controller=new AbortController();
 const result=runDocumentParser(metadata,{entryPath:path,storageRoot:root!,timeoutMs:2000,signal:controller.signal});controller.abort();
 await expect(result).rejects.toMatchObject({code:"CANCELLED"});
});
it("sanitizes child crashes and does not propagate parser exception content",async()=>{
 const path=await script(`process.once('message',()=>{console.error('secret manual body');process.exit(1);});`);
 await expect(runDocumentParser(metadata,{entryPath:path,storageRoot:root!,timeoutMs:2000})).rejects.toMatchObject({code:"DOCUMENT_RESOURCE_LIMIT"});
});
it("rejects a child result whose identity does not match the uploaded evidence",async()=>{
 const path=await script(`process.once('message',()=>{process.send({ok:true,document:{id:'wrong',name:'secret',sha256:'b'.repeat(64),segments:[{label:'text',text:'hello'}]}});process.disconnect();});`);
 await expect(runDocumentParser(metadata,{entryPath:path,storageRoot:root!,timeoutMs:2000})).rejects.toMatchObject({code:"INVALID_DOCUMENT"});
});

it("does not accept a parser result when that child then fails",async()=>{
 const path=await script(`process.once('message',({metadata})=>{process.send({ok:true,document:{id:metadata.id,name:metadata.name,sha256:metadata.sha256,segments:[{label:'text',text:'hello'}]}},()=>process.exit(1));});`);
 await expect(runDocumentParser(metadata,{entryPath:path,storageRoot:root!,timeoutMs:2000})).rejects.toMatchObject({code:"DOCUMENT_RESOURCE_LIMIT"});
});
it("contains parser heap exhaustion without terminating the test host",async()=>{
 const path=await script(`process.once('message',()=>{const chunks=[];for(;;)chunks.push(new Array(1000000).fill('node'));});`);
 await expect(runDocumentParser(metadata,{entryPath:path,storageRoot:root!,timeoutMs:4000})).rejects.toMatchObject({code:"DOCUMENT_RESOURCE_LIMIT"});
});

it("does not start a parser for an already-cancelled job",async()=>{
 await expect(runDocumentParser(metadata,{entryPath:"/nonexistent/parser.mjs",storageRoot:"/nonexistent",signal:AbortSignal.abort()})).rejects.toMatchObject({code:"CANCELLED"});
});
