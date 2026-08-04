import { NextResponse } from "next/server";
import {
  isVorSubmission,
  mapRowToVorSubmission,
  vorSubmissionToRow,
} from "@/modules/devices/dvor-1150a/server";
import type { VorSubmissionStatus } from "@/modules/devices/dvor-1150a/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/profile";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown VOR submission error";
}

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  try {
    const searchParams = new URL(request.url).searchParams;
    const scenarioId = searchParams.get("scenarioId")?.trim();
    const status = searchParams.get("status")?.trim() as VorSubmissionStatus | undefined;
    if (status && !["draft", "submitted", "reviewed"].includes(status)) {
      return NextResponse.json({ error: "Trạng thái bài nộp không hợp lệ." }, { status: 400 });
    }

    const supabase = await createClient();
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
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  try {
    const payload = (await request.json()) as unknown;
    if (!isVorSubmission(payload)) {
      return NextResponse.json({ error: "Dữ liệu bài nộp VOR không hợp lệ." }, { status: 400 });
    }

    const securedPayload = profile.role === "admin"
      ? payload
      : {
          ...payload,
          userId: profile.id,
          studentName: profile.fullName,
          workUnit: profile.workUnit,
          status: "submitted" as const,
          reviewedAt: undefined,
          score: undefined,
          examinerComment: undefined,
        };
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("vor_submissions")
      .upsert(vorSubmissionToRow(securedPayload), { onConflict: "id" })
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
