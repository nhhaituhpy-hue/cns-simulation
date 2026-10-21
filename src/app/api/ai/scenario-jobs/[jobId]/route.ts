import { deleteGenerationResponse, getGenerationResponse } from "@/lib/ai/scenario-generation/api-service";
export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  return getGenerationResponse((await context.params).jobId);
}
export async function DELETE(request: Request, context: { params: Promise<{ jobId: string }> }) {
  return deleteGenerationResponse(request, (await context.params).jobId);
}
