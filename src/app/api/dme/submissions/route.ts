import { NextResponse } from "next/server";
import {
  isDmeSubmission,
  mapRowToDmeSubmission,
  dmeSubmissionToRow,
} from "@/modules/devices/dme-1119a/server";
import type { DmeSubmissionStatus } from "@/modules/devices/dme-1119a/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import { insertDatabaseRow, queryDatabase, upsertDatabaseRow } from "@/lib/db";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown DME submission error";
}

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  try {
    const searchParams = new URL(request.url).searchParams;
    const scenarioId = searchParams.get("scenarioId")?.trim();
    const status = searchParams.get("status")?.trim() as DmeSubmissionStatus | undefined;
    if (status && !["draft", "submitted", "reviewed"].includes(status)) {
      return NextResponse.json({ error: "Trạng thái bài nộp không hợp lệ." }, { status: 400 });
    }

    const conditions: string[] = [];
    const values: unknown[] = [];
    if (profile.role !== "admin") { values.push(profile.id); conditions.push(`user_id = $${values.length}`); }
    if (scenarioId) { values.push(scenarioId); conditions.push(`scenario_id = $${values.length}`); }
    if (status) { values.push(status); conditions.push(`status = $${values.length}`); }
    const where = conditions.length ? `where ${conditions.join(" and ")}` : "";
    const result = await queryDatabase(`select * from public.dme_submissions ${where} order by submitted_at desc nulls last`, values);
    return NextResponse.json(result.rows.map(mapRowToDmeSubmission));
  } catch (error: unknown) {
    console.error("DME submission fetch failed:", error);
    return NextResponse.json(
      { error: "Không thể tải bài nộp DME.", details: errorMessage(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  try {
    const payload = (await request.json()) as unknown;
    if (!isDmeSubmission(payload)) {
      return NextResponse.json({ error: "Dữ liệu bài nộp DME không hợp lệ." }, { status: 400 });
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
    const row = dmeSubmissionToRow(securedPayload);
    const result = profile.role === "admin"
      ? await upsertDatabaseRow("dme_submissions", row)
      : await insertDatabaseRow("dme_submissions", row);
    return NextResponse.json(mapRowToDmeSubmission(result.rows[0]));
  } catch (error: unknown) {
    console.error("DME submission write failed:", error);
    return NextResponse.json(
      { error: "Không thể lưu bài nộp DME.", details: errorMessage(error) },
      { status: 500 },
    );
  }
}

