import { practiceFeedbackResponse } from "@/lib/ai/feedback/api-service";

export async function POST(request: Request) {
  return practiceFeedbackResponse(request);
}
