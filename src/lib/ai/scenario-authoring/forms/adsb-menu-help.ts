import { getMenuDefinition } from "@/lib/menu-data";
import type { ValueOption } from "../types";
/** Native tree is the sole catalog: labels, paths and workflow constraints are not presets. */
export function adsbMenuHelp():{help:string;options:ValueOption[]} {
 const lines:string[]=[],options:ValueOption[]=[];
 for(const role of ["sysadmin","maintenance"] as const){
  const {menus,rootMenuId}=getMenuDefinition(role),paths=new Map<string,string[]>([[rootMenuId,[]]]),queue=[rootMenuId];
  while(queue.length){
   const id=queue.shift()!;
   // TerminalEngine exposes the -maintenance sibling when operating mode changes.
   const alternate=`${id}-maintenance`;
   if(menus[alternate]&&!paths.has(alternate)){paths.set(alternate,paths.get(id)!);queue.push(alternate);}
   for(const item of menus[id].items)if(item.action.type==="navigate"&&!paths.has(item.action.targetMenuId)){paths.set(item.action.targetMenuId,[...paths.get(id)!,String(item.number)]);queue.push(item.action.targetMenuId);}
  }
  for(const menu of Object.values(menus))for(const item of menu.items){
   const action=item.action;if(action.type==="input"&&action.sensitive)continue;
   const path=[...(paths.get(menu.id)??[]),String(item.number)].join(" → ");
   const title=`${role} / ${menu.title}${menu.id.includes("maintenance")?" (operation mode MAINTENANCE)":""} / ${path}: ${item.label}`;
   options.push({value:String(item.number),label:title});
   let detail="";
   if(action.type==="workflow")detail=action.steps.map(step=>`${step.prompt.split("\n").filter(Boolean).at(-1)}${step.options?" ["+step.options.map(o=>`${o.number}=${o.label}`).join("; ")+"]":""}${step.validation?` (${step.validation}, ${step.min??"—"}..${step.max??"—"})`:""}${step.when?` khi ${step.when.key}=${step.when.value}`:""}`).join(" → ");
   else if(action.type==="input")detail=action.prompt;
   else if(action.type==="toggle")detail=action.prompt+" ["+action.options.map(o=>`${o.number}=${o.label}`).join("; ")+"]";
   lines.push(`${title}${detail?" — "+detail:""}`);
  }
 }
 return {help:"Tra theo vai trò và tên menu bên dưới; đường số bắt đầu từ menu gốc. Trong phiên đang mở, 0 quay lại, X đăng xuất. Chuyển sang maintenance bằng menu Change Actual Operation Mode nếu thao tác yêu cầu. Sau đường menu nhập từng giá trị theo prompt; giá trị nhập tự do phải đúng giới hạn native, không bị khóa vào ví dụ. Không nhập credential.\n"+lines.join("\n"),options};
}
