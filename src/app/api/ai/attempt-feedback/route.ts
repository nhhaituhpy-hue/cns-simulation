import { attemptFeedbackResponse } from "@/lib/ai/feedback/submission-api";
export async function GET(request: Request) { return attemptFeedbackResponse(request); }
