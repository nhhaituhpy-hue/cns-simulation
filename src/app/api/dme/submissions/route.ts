import { NextResponse } from "next/server";
import {
  isDmeSubmission,
  mapRowToDmeSubmission,
  dmeSubmissionToRow,
} from "@/lib/dme-submission-storage";
import type { DmeSubmissionStatus } from "@/lib/dme-types";
import { createClient } from "@/lib/supabase/server";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown DME submission error";
}

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const scenarioId = searchParams.get("scenarioId")?.trim();
    const status = searchParams.get("status")?.trim() as DmeSubmissionStatus | undefined;
    if (status && !["draft", "submitted", "reviewed"].includes(status)) {
      return NextResponse.json({ error: "Trạng thái bài nộp không hợp lệ." }, { status: 400 });
    }

    const supabase = createClient();
    let query = supabase.from("dme_submissions").select("*");
    if (scenarioId) query = query.eq("scenario_id", scenarioId);
    if (status) query = query.eq("status", status);
    const { data, error } = await query.order("submitted_at", {
      ascending: false,
      nullsFirst: false,
    });

    if (error) throw error;
    return NextResponse.json((data ?? []).map(mapRowToDmeSubmission));
  } catch (error: unknown) {
    console.error("DME submission fetch failed:", error);
    return NextResponse.json(
      { error: "Không thể tải bài nộp DME.", details: errorMessage(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as unknown;
    if (!isDmeSubmission(payload)) {
      return NextResponse.json({ error: "Dữ liệu bài nộp DME không hợp lệ." }, { status: 400 });
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("dme_submissions")
      .upsert(dmeSubmissionToRow(payload), { onConflict: "id" })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(mapRowToDmeSubmission(data));
  } catch (error: unknown) {
    console.error("DME submission write failed:", error);
    return NextResponse.json(
      { error: "Không thể lưu bài nộp DME.", details: errorMessage(error) },
      { status: 500 },
    );
  }
}

