import { NextResponse } from "next/server";
import {
  isVorSubmission,
  mapRowToVorSubmission,
  vorSubmissionToRow,
} from "@/lib/vor-submission-storage";
import type { VorSubmissionStatus } from "@/lib/vor-types";
import { createClient } from "@/lib/supabase/server";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown VOR submission error";
}

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const scenarioId = searchParams.get("scenarioId")?.trim();
    const status = searchParams.get("status")?.trim() as VorSubmissionStatus | undefined;
    if (status && !["draft", "submitted", "reviewed"].includes(status)) {
      return NextResponse.json({ error: "Trạng thái bài nộp không hợp lệ." }, { status: 400 });
    }

    const supabase = createClient();
    let query = supabase.from("vor_submissions").select("*");
    if (scenarioId) query = query.eq("scenario_id", scenarioId);
    if (status) query = query.eq("status", status);
    const { data, error } = await query.order("submitted_at", {
      ascending: false,
      nullsFirst: false,
    });

    if (error) throw error;
    return NextResponse.json((data ?? []).map(mapRowToVorSubmission));
  } catch (error: unknown) {
    console.error("VOR submission fetch failed:", error);
    return NextResponse.json(
      { error: "Không thể tải bài nộp VOR.", details: errorMessage(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as unknown;
    if (!isVorSubmission(payload)) {
      return NextResponse.json({ error: "Dữ liệu bài nộp VOR không hợp lệ." }, { status: 400 });
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("vor_submissions")
      .upsert(vorSubmissionToRow(payload), { onConflict: "id" })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(mapRowToVorSubmission(data));
  } catch (error: unknown) {
    console.error("VOR submission write failed:", error);
    return NextResponse.json(
      { error: "Không thể lưu bài nộp VOR.", details: errorMessage(error) },
      { status: 500 },
    );
  }
}
