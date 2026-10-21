import { practiceSubmissionResponse } from "@/lib/ai/feedback/submission-api";
export async function POST(request: Request) { return practiceSubmissionResponse(request); }
