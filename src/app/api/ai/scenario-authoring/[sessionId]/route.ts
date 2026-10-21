import { getAuthoringResponse, updateAuthoringResponse } from "@/lib/ai/scenario-authoring/api-service";
export const dynamic="force-dynamic";
type Context={params:Promise<{sessionId:string}>};
export async function GET(_request:Request,context:Context){return getAuthoringResponse((await context.params).sessionId);}
export async function PATCH(request:Request,context:Context){return updateAuthoringResponse(request,(await context.params).sessionId);}
