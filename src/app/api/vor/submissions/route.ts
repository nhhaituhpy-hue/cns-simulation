import { NextResponse } from "next/server";
import {
  isVorSubmission,
  mapRowToVorSubmission,
  vorSubmissionToRow,
} from "@/modules/devices/dvor-1150a/server";
import type { VorSubmissionStatus } from "@/modules/devices/dvor-1150a/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import { insertDatabaseRow, queryDatabase, upsertDatabaseRow } from "@/lib/db";

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

    const conditions: string[] = [];
    const values: unknown[] = [];
    if (profile.role !== "admin") { values.push(profile.id); conditions.push(`user_id = $${values.length}`); }
    if (scenarioId) { values.push(scenarioId); conditions.push(`scenario_id = $${values.length}`); }
    if (status) { values.push(status); conditions.push(`status = $${values.length}`); }
    const where = conditions.length ? `where ${conditions.join(" and ")}` : "";
    const result = await queryDatabase(`select * from public.vor_submissions ${where} order by submitted_at desc nulls last`, values);
    return NextResponse.json(result.rows.map(mapRowToVorSubmission));
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
    const row = vorSubmissionToRow(securedPayload);
    const result = profile.role === "admin"
      ? await upsertDatabaseRow("vor_submissions", row)
      : await insertDatabaseRow("vor_submissions", row);
    return NextResponse.json(mapRowToVorSubmission(result.rows[0]));
  } catch (error: unknown) {
    console.error("VOR submission write failed:", error);
    return NextResponse.json(
      { error: "Không thể lưu bài nộp VOR.", details: errorMessage(error) },
      { status: 500 },
    );
  }
}
