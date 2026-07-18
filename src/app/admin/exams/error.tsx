"use client";

import { ExamRouteError } from "@/components/exams/route-error";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ExamRouteError reset={reset} />;
}
