import { NextResponse } from "next/server";
import {
  isVorScenario,
  mapRowToVorScenario,
  vorScenarioToRow,
} from "@/lib/vor-scenario-storage";
import { createClient } from "@/lib/supabase/server";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown VOR scenario error";
}

export async function GET() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("vor_scenarios")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json((data ?? []).map(mapRowToVorScenario));
  } catch (error: unknown) {
    console.error("VOR scenario fetch failed:", error);
    return NextResponse.json(
      { error: "Không thể tải kịch bản VOR.", details: errorMessage(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as unknown;
    if (!isVorScenario(payload)) {
      return NextResponse.json(
        { error: "Dữ liệu kịch bản VOR không hợp lệ." },
        { status: 400 },
      );
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("vor_scenarios")
      .upsert(vorScenarioToRow(payload), { onConflict: "id" })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(mapRowToVorScenario(data));
  } catch (error: unknown) {
    console.error("VOR scenario write failed:", error);
    return NextResponse.json(
      { error: "Không thể lưu kịch bản VOR.", details: errorMessage(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const scenarioId = new URL(request.url).searchParams.get("id")?.trim();
    if (!scenarioId) {
      return NextResponse.json({ error: "Thiếu mã kịch bản VOR." }, { status: 400 });
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("vor_scenarios")
      .delete()
      .eq("id", scenarioId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("VOR scenario delete failed:", error);
    return NextResponse.json(
      { error: "Không thể xóa kịch bản VOR.", details: errorMessage(error) },
      { status: 500 },
    );
  }
}
