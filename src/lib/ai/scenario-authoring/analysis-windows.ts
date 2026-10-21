import type { EvidenceDocument } from "../scenario-generation/types";
export function evidenceWindows(documents:EvidenceDocument[]):EvidenceDocument[][]{
 const windows:EvidenceDocument[][]=[];let window:EvidenceDocument[]=[],used=0;
 for(const doc of documents)for(const segment of doc.segments){
  for(let offset=0;offset<segment.text.length;){
   if(windows.length===6)return windows;
   const length=Math.min(8000-used,segment.text.length-offset);
   let target=window.find(d=>d.id===doc.id);if(!target){target={id:doc.id,name:doc.name,sha256:doc.sha256,segments:[]};window.push(target);}
   target.segments.push({label:segment.label,text:segment.text.slice(offset,offset+length)});offset+=length;used+=length;
   if(used===8000){windows.push(window);window=[];used=0;}
  }
 }
 if(window.length&&windows.length<6)windows.push(window);
 return windows.length?windows:[[]];
}
