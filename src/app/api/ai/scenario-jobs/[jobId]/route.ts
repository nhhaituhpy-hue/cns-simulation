import { getGenerationResponse } from "@/lib/ai/scenario-generation/api-service";
export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  return getGenerationResponse((await context.params).jobId);
}
