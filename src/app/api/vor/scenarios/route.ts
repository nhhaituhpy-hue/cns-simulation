import { NextResponse } from "next/server";
import {
  isVorScenario,
  mapRowToVorScenario,
  vorScenarioToRow,
} from "@/modules/devices/dvor-1150a/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import { queryDatabase, upsertDatabaseRow } from "@/lib/db";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown VOR scenario error";
}

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  try {
    const result = await queryDatabase("select * from public.vor_scenarios order by created_at desc");
    return NextResponse.json(result.rows.map(mapRowToVorScenario));
  } catch (error: unknown) {
    console.error("VOR scenario fetch failed:", error);
    return NextResponse.json(
      { error: "Không thể tải kịch bản VOR.", details: errorMessage(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  if (profile.role !== "admin") return NextResponse.json({ error: "Không có quyền quản lý kịch bản." }, { status: 403 });

  try {
    const payload = (await request.json()) as unknown;
    if (!isVorScenario(payload)) {
      return NextResponse.json(
        { error: "Dữ liệu kịch bản VOR không hợp lệ." },
        { status: 400 },
      );
    }

    const result = await upsertDatabaseRow("vor_scenarios", vorScenarioToRow(payload));
    return NextResponse.json(mapRowToVorScenario(result.rows[0]));
  } catch (error: unknown) {
    console.error("VOR scenario write failed:", error);
    return NextResponse.json(
      { error: "Không thể lưu kịch bản VOR.", details: errorMessage(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  if (profile.role !== "admin") return NextResponse.json({ error: "Không có quyền quản lý kịch bản." }, { status: 403 });

  try {
    const scenarioId = new URL(request.url).searchParams.get("id")?.trim();
    if (!scenarioId) {
      return NextResponse.json({ error: "Thiếu mã kịch bản VOR." }, { status: 400 });
    }

    await queryDatabase("delete from public.vor_scenarios where id = $1", [scenarioId]);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("VOR scenario delete failed:", error);
    return NextResponse.json(
      { error: "Không thể xóa kịch bản VOR.", details: errorMessage(error) },
      { status: 500 },
    );
  }
}
