import { finalizeAuthoringResponse } from "@/lib/ai/scenario-authoring/api-service";
export const dynamic="force-dynamic";
export async function POST(request:Request,context:{params:Promise<{sessionId:string}>}){return finalizeAuthoringResponse(request,(await context.params).sessionId);}
