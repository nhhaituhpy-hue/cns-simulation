import { downloadAuthoringResponse } from "@/lib/ai/scenario-authoring/api-service";
export const dynamic="force-dynamic";
export async function GET(_request:Request,context:{params:Promise<{sessionId:string}>}){return downloadAuthoringResponse((await context.params).sessionId);}
