import { createGenerationResponse, listGenerationResponse } from "@/lib/ai/scenario-generation/api-service";
export const runtime = "nodejs";
export async function POST(request: Request) { return createGenerationResponse(request); }
export async function GET(request: Request) { return listGenerationResponse(request); }
