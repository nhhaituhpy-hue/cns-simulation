import type { AuthoringField, JsonValue } from "./types";
const normalize=(text:string)=>text.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").toLowerCase().replace(/[^a-z0-9%°µ.+-]+/g," ").trim();
const targetText=(s:string)=>normalize(s).replace(/(?:transmitter|may phat)\s*([12])/g,"tx$1").replace(/monitor\s*([12])/g,"mon$1").replace(/(?:cam bien|sensor)\s*([ab])/g,"sensor$1");
/** Recognize the documented three-cell baseline form after safe DOCX text extraction.
 * The factory/default cell and limit numbers are never evidence for an author value.
 */
export function templateRowSupports(field:AuthoringField,value:JsonValue,quote:string,source:string):boolean|null{
 if(!/Mẫu thông số nền/.test(source)||!source.includes("Giá trị tài liệu / Nguồn/trang"))return null;
 const tokens=source.split(/\n\s*\n/).map(t=>t.trim()).filter(Boolean);let group="";const candidates:Array<{value:string;unit:string;span:string;target:string}>=[];
 for(let i=0;i<tokens.length;i++){
  if(tokens[i]==="Thông số / đơn vị / giới hạn"&&tokens[i+1]==="Mặc định mô phỏng"&&tokens[i+2]==="Giá trị tài liệu / Nguồn/trang"){group=tokens[i-1]??"";i+=2;continue;}
  const cell=tokens[i],match=/^Giá trị:\s*([\s\S]*?);\s*Nguồn\/trang:\s*([\s\S]*)$/.exec(cell);if(!match||i<2)continue;
  const label=tokens[i-2],wanted=normalize(field.schema.label),short=normalize(label.split(" · ")[0]);
  if(short!==wanted&&!short.endsWith(" "+wanted)&&!wanted.endsWith(" "+short))continue;
  const target=targetText(`${group} ${label}`);
  const required=[...targetText(`${field.id} ${field.group} ${field.schema.label}`).matchAll(/\b(?:tx[12]|mon[12]|sensor[ab])\b/g)].map(m=>m[0]);
  if(!required.every(t=>new RegExp(`(?:^| )${t}(?:$| )`).test(target)))continue;
  const unit=/Đơn vị:\s*([^·]+)/.exec(label)?.[1]?.trim()??"";
  const val=match[1].trim();if(!val||/^[_—-]+$/.test(val))continue;
  candidates.push({value:val,unit,span:tokens.slice(i-2,i+1).join("\n\n"),target});
 }
 const scalar=(raw:string,unit:string):unknown=>{
  if(typeof value==="number"){
   const m=/^([-+]?\d+(?:[.,]\d+)?)\s*(.*)$/.exec(raw);if(!m)return undefined;
   const declared=m[2].trim()||unit;if(field.schema.unit&&normalize(declared)!==normalize(field.schema.unit))return undefined;
   return Number(m[1].replace(",","."));
  }
  if(typeof value==="boolean"){const v=normalize(raw);return ["true","bat","co","on","enabled"].includes(v)?true:["false","tat","khong","off","disabled"].includes(v)?false:undefined;}
  return typeof value==="string"?raw:undefined;
 };
 const values=candidates.map(c=>scalar(c.value,c.unit)).filter(v=>v!==undefined);
 if(new Set(values.map(v=>JSON.stringify(v))).size!==1)return false;
 return candidates.some(c=>scalar(c.value,c.unit)===value&&source.includes(quote)&&quote.includes(c.span));
}

/** Original-row excerpts for filled reference forms. Never rewrite a source assertion. */
export function filledTemplateExcerpts(source:string):Array<{text:string;label:string;group:string}>{
 if(!source.includes("Mẫu thông số nền")||!source.includes("Giá trị tài liệu / Nguồn/trang"))return[];
 const tokens=[...source.matchAll(/[^\n]+(?:\n(?!\n)[^\n]+)*/g)];let group="";const rows:Array<{text:string;label:string;group:string}>=[];
 for(let i=0;i<tokens.length;i++){
  const text=tokens[i][0].trim();
  if(text==="Thông số / đơn vị / giới hạn"&&tokens[i+1]?.[0].trim()==="Mặc định mô phỏng"){group=tokens[i-1]?.[0].trim()??"";continue;}
  const match=/^Giá trị:\s*([\s\S]*?);\s*Nguồn\/trang:\s*([\s\S]*)$/.exec(text);
  if(match&&i>=2&&match[1].trim()&&!/^[_—-]+$/.test(match[1].trim()))rows.push({label:tokens[i-2][0].split(" · ")[0].trim(),group,text:source.slice(tokens[i-2].index!,tokens[i].index!+tokens[i][0].length)});
 }
 return rows;
}
export function templateLabelMatches(label:string,field:AuthoringField):boolean{
 const left=normalize(label),right=normalize(field.schema.label);return left===right||left.endsWith(" "+right)||right.endsWith(" "+left);
}

export function templateTargetMatches(group:string,field:AuthoringField):boolean{
 const required=[...targetText(`${field.id} ${field.group} ${field.schema.label}`).matchAll(/\b(?:tx[12]|mon[12]|sensor[ab])\b/g)].map(m=>m[0]);
 const known=targetText(group);return required.every(t=>new RegExp(`(?:^| )${t}(?:$| )`).test(known));
}
