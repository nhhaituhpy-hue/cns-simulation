/** Offline, credential-free text-layer extraction. Never imports generated facts or scenarios. */
import { constants } from "node:fs";
import { mkdir, open, readFile, writeFile, lstat, realpath } from "node:fs/promises";
import { basename, extname, isAbsolute, join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
/** @typedef {{label:string,page:number|null,printedPage:string|null,text:string,textSha256:string}} TextSegment */
/** @typedef {{id:string,name:string,sha256:string,mediaType:string,sourceKind:string,revision:string|null,pageCount:number|null,segments:TextSegment[]}} ReferenceDocument */
/** @typedef {{mode:"reference-only",modules:Array<{moduleId:string,coverage:Array<Record<string,unknown>>}>,notices:string[]}} CorpusBuildReport */
const MODULES=["dvor-1150","dvor-1150a","dme-1119a","dvor-220","dme-320","ads-b"];
const KINDS=["manufacturer-manual","operating-procedure","simulation-reference"];
const digest=value=>createHash("sha256").update(value).digest("hex");
const plain=v=>v!==null&&typeof v==="object"&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const exact=(v,keys)=>plain(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
export function validateKnowledgeSources(input){
 if(!exact(input,["version","modules"])||input.version!==1||!Array.isArray(input.modules)||input.modules.length!==MODULES.length)throw new Error("Expected six explicitly scoped source modules");
 const ids=new Set();
 for(const m of input.modules){
  if(!exact(m,["moduleId","documents"])||!MODULES.includes(m.moduleId)||ids.has(m.moduleId)||!Array.isArray(m.documents)||!m.documents.length||m.documents.length>10)throw new Error("Invalid module source manifest");ids.add(m.moduleId);
  const docs=new Set();
  for(const d of m.documents){
   if(!exact(d,["id","path","sourceKind","revision"])||typeof d.id!=="string"||!/^[a-z0-9][a-z0-9_-]{0,79}$/.test(d.id)||docs.has(d.id)||typeof d.path!=="string"||!isAbsolute(d.path)||!KINDS.includes(d.sourceKind)||(d.revision!==null&&(typeof d.revision!=="string"||d.revision.length>200)))throw new Error("Invalid document source manifest");docs.add(d.id);
  }
 }
 return input;
}
async function sourceBytes(path){
 if(!isAbsolute(path)||await realpath(path)!==path)throw new Error("Source must be an absolute regular path without aliases");
 const handle=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW);
 try{const stat=await handle.stat();if(!stat.isFile()||stat.size<1||stat.size>64*1024*1024)throw new Error("Source size out of bounds");const data=await handle.readFile();if(data.length!==stat.size)throw new Error("Source changed during extraction");return data;}finally{await handle.close();}
}
/** @returns {ReferenceDocument} */
function baseDocument(source,data,mediaType,pageCount){return {id:source.id,name:basename(source.path),sha256:digest(data),mediaType,sourceKind:source.sourceKind,revision:source.revision,pageCount,segments:[]};}
export async function extractPdfReference(source){
 const data=await sourceBytes(source.path);if(!data.subarray(0,1024).includes(Buffer.from("%PDF-")))throw new Error("Source is not a PDF");
 const { getDocumentProxy,extractText }=await import("unpdf");
 const pdf=await getDocumentProxy(new Uint8Array(data),{isEvalSupported:false,enableXfa:false,disableFontFace:true,useSystemFonts:false,verbosity:0});
 try{
  if(pdf.numPages<1||pdf.numPages>1000)throw new Error("PDF page budget exceeded");
  const document=baseDocument(source,data,"application/pdf",pdf.numPages),pagesWithoutText=[],pagesOverBudget=[];
  const labels=await pdf.getPageLabels();let characters=0;
  for(let n=1;n<=pdf.numPages;n++){
   const page=await pdf.getPage(n);const one=Object.create(pdf);Object.defineProperty(one,"numPages",{value:1});one.getPage=async()=>page;
   const extracted=await extractText(one,{mergePages:true});const text=extracted.text.replace(/\r\n?/g,"\n").trim();page.cleanup();
   if(!text){pagesWithoutText.push(n);continue;}
   if(text.length>40000){pagesOverBudget.push(n);continue;}
   characters+=text.length;if(characters>8000000)throw new Error("Source text budget exceeded");
   const printedPage=labels?.[n-1]&&labels[n-1]!==String(n)?labels[n-1]:null;
   document.segments.push({label:`PDF page ${n}`,page:n,printedPage,text,textSha256:digest(text)});
  }
  if(!document.segments.length)throw new Error("PDF has no usable text layer; OCR required separately");
  return {document,coverage:{pagesTotal:pdf.numPages,pagesWithText:document.segments.length,pagesWithoutText,pagesOverBudget,characters,ocrPerformed:false,technicalReviewPerformed:false}};
 }finally{await pdf.loadingTask.destroy();}
}
async function extractMarkdownReference(source){
 const bytes=await sourceBytes(source.path);const text=new TextDecoder("utf-8",{fatal:true}).decode(bytes).replace(/\r\n?/g,"\n");
 if(text.length>1000000||/[\x00-\x08\x0b\x0e-\x1f]/.test(text))throw new Error("Reference text budget or encoding invalid");
 const document=baseDocument(source,bytes,"text/markdown",null);let pending="",part=0;
 const push=()=>{if(pending.trim()){const value=pending.trim();document.segments.push({label:`Text section ${++part}`,page:null,printedPage:null,text:value,textSha256:digest(value)});}pending="";};
 for(const para of text.split(/\n(?=#{1,6}\s)|\n\s*\n/)){if(para.length>40000)throw new Error("An indivisible reference section exceeds budget");if(pending.length+para.length>6000)push();pending+=(pending?"\n\n":"")+para;}push();
 if(!document.segments.length)throw new Error("Reference has no readable text");
 return {document,coverage:{characters:text.length,segments:document.segments.length,ocrPerformed:false,technicalReviewPerformed:false}};
}
async function extractDocxReference(source){
 const bytes=await sourceBytes(source.path);
 if(bytes.length<22||bytes.length>16*1024*1024||bytes[0]!==0x50||bytes[1]!==0x4b)throw new Error("Source is not a valid bounded DOCX archive");
 const mammoth=await import("mammoth");const extracted=await mammoth.extractRawText({buffer:Buffer.from(bytes)});
 const text=extracted.value.replace(/\r\n?/g,"\n").trim();
 if(!text||text.length>1000000||/[\x00-\x08\x0b\x0e-\x1f]/.test(text))throw new Error("DOCX text budget or encoding invalid");
 const document=baseDocument(source,bytes,"application/vnd.openxmlformats-officedocument.wordprocessingml.document",null);let pending="",part=0;
 const push=()=>{if(pending.trim()){const value=pending.trim();document.segments.push({label:`DOCX section ${++part}`,page:null,printedPage:null,text:value,textSha256:digest(value)});}pending="";};
 for(const para of text.split(/\n\s*\n|\n/)){if(para.length>40000)throw new Error("An indivisible DOCX section exceeds budget");if(pending.length+para.length>6000)push();pending+=(pending?"\n\n":"")+para;}push();
 if(!document.segments.length)throw new Error("DOCX has no readable text");
 return {document,coverage:{characters:text.length,segments:document.segments.length,ocrPerformed:false,technicalReviewPerformed:false}};
}
async function extractReference(source){
 const ext=extname(source.path).toLowerCase();
 if(ext===".pdf")return extractPdfReference(source);
 if(ext===".docx")return extractDocxReference(source);
 if(ext===".md"||ext===".txt")return extractMarkdownReference(source);
 return {skipped:true,name:basename(source.path),reason:"UNSUPPORTED_FORMAT_REQUIRES_SEPARATE_EXTRACTION"};
}
function isolatedExtract(source){
 return new Promise((resolvePromise,reject)=>{
  const child=spawn(process.execPath,["--max-old-space-size=384",fileURLToPath(import.meta.url),"--extract-child"],{stdio:["pipe","pipe","pipe"],env:{PATH:process.env.PATH??"",LANG:"C.UTF-8",TMPDIR:process.env.TMPDIR??"/opt/data/cache/scratch"}});
  const chunks=[];let length=0,stderr="",done=false;
  const finish=(err,value)=>{if(done)return;done=true;clearTimeout(timer);if(err)reject(err);else resolvePromise(value);};
  const timer=setTimeout(()=>{child.kill("SIGKILL");finish(new Error("Document extraction timeout"));},120000);
  child.stdout.on("data",chunk=>{length+=chunk.length;if(length>16*1024*1024){child.kill("SIGKILL");finish(new Error("Document extraction output too large"));}else chunks.push(chunk);});
  child.stderr.on("data",chunk=>{stderr=(stderr+chunk.toString()).slice(0,2000);});
  child.on("error",err=>finish(err));child.on("close",code=>{if(code!==0)return finish(new Error(`Document extraction failed (${code}); ${stderr.slice(0,300)}`));try{finish(null,JSON.parse(Buffer.concat(chunks).toString("utf8")));}catch{finish(new Error("Invalid extraction response"));}});
  child.stdin.on("error",err=>finish(err));child.stdin.end(JSON.stringify(source));
 });
}
/** @returns {Promise<CorpusBuildReport>} */
export async function buildKnowledgeCorpus(input,out,{isolate=false}={}){
 validateKnowledgeSources(input);if(!isAbsolute(out)||resolve(out)===resolve("/"))throw new Error("Choose an absolute private output directory");
 await mkdir(out,{recursive:false,mode:0o700});if((await lstat(out)).isSymbolicLink()||await realpath(out)!==out)throw new Error("Output root must not be an alias");
 const manifest={version:1,mode:"reference-only",modules:[]},report={mode:"reference-only",modules:[],notices:["Text layer extraction only; not OCR, technical approval, scenario generation or grading certification.","Blank pages and over-budget pages are listed, never silently counted as extracted.","Page label comes only from embedded PDF labels, not an inferred printed footer."]};
 for(const m of input.modules){
  const documents=[],coverage=[];for(const source of m.documents){const result=await(isolate?isolatedExtract(source):extractReference(source));if(result.skipped)coverage.push(result);else{documents.push(result.document);coverage.push({id:source.id,name:result.document.name,sha256:result.document.sha256,...result.coverage});}}
  if(!documents.length)throw new Error(`No supported source for ${m.moduleId}`);
  const corpus={version:1,moduleId:m.moduleId,mode:"reference-only",documents},bytes=Buffer.from(JSON.stringify(corpus));if(bytes.length>12*1024*1024)throw new Error("Module artifact exceeds byte budget");
  const segmentCount=documents.reduce((n,d)=>n+d.segments.length,0);if(segmentCount>3000)throw new Error("Module segment budget exceeded");
  const file=`${m.moduleId}.json`;await writeFile(join(out,file),bytes,{flag:"wx",mode:0o600});
  manifest.modules.push({moduleId:m.moduleId,file,sha256:digest(bytes),documentCount:documents.length,segmentCount});report.modules.push({moduleId:m.moduleId,coverage});
 }
 await writeFile(join(out,"extraction-report.json"),JSON.stringify(report,null,2),{flag:"wx",mode:0o600});
 await writeFile(join(out,"manifest.json"),JSON.stringify(manifest,null,2),{flag:"wx",mode:0o600});return report;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv[2]==="--extract-child"){const input=[];let n=0;for await(const c of process.stdin){n+=c.length;if(n>8192)throw new Error("Input too large");input.push(c);}process.stdout.write(JSON.stringify(await extractReference(JSON.parse(Buffer.concat(input).toString("utf8")))));}
  else {const [manifestPath,out]=process.argv.slice(2);if(!manifestPath||!out)throw new Error("Usage: node scripts/build-device-knowledge.mjs /absolute/sources.json /absolute/new-private-directory");const input=await readFile(manifestPath);if(input.length>32768)throw new Error("Manifest too large");const report=await buildKnowledgeCorpus(JSON.parse(input.toString("utf8")),out,{isolate:true});console.log(JSON.stringify(report,null,2));}
 }catch(error){console.error(error instanceof Error?error.message:"Extraction failed");process.exitCode=1;}
}
