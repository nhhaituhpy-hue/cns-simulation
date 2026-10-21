import { examReviewFeedbackResponse } from "@/lib/ai/feedback/api-service";

export async function POST(request: Request) {
  return examReviewFeedbackResponse(request);
}
