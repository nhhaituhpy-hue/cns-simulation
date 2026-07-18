import { NextResponse } from "next/server";
import {
  isDmeScenario,
  mapRowToDmeScenario,
  dmeScenarioToRow,
} from "@/lib/dme-scenario-storage";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/profile";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown DME scenario error";
}

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("dme_scenarios")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json((data ?? []).map(mapRowToDmeScenario));
  } catch (error: unknown) {
    console.error("DME scenario fetch failed:", error);
    return NextResponse.json(
      { error: "Không thể tải kịch bản DME.", details: errorMessage(error) },
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
    if (!isDmeScenario(payload)) {
      return NextResponse.json(
        { error: "Dữ liệu kịch bản DME không hợp lệ." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("dme_scenarios")
      .upsert(dmeScenarioToRow(payload), { onConflict: "id" })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(mapRowToDmeScenario(data));
  } catch (error: unknown) {
    console.error("DME scenario write failed:", error);
    return NextResponse.json(
      { error: "Không thể lưu kịch bản DME.", details: errorMessage(error) },
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
      return NextResponse.json({ error: "Thiếu mã kịch bản DME." }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("dme_scenarios")
      .delete()
      .eq("id", scenarioId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("DME scenario delete failed:", error);
    return NextResponse.json(
      { error: "Không thể xóa kịch bản DME.", details: errorMessage(error) },
      { status: 500 },
    );
  }
}

