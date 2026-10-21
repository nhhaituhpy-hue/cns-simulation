import { analyzeAuthoringResponse } from "@/lib/ai/scenario-authoring/api-service";
export const dynamic="force-dynamic";
export async function POST(request:Request,context:{params:Promise<{sessionId:string}>}){return analyzeAuthoringResponse(request,(await context.params).sessionId);}
