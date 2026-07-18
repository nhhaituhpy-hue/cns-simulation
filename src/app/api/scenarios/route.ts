import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import { mapRowToScenario } from "@/lib/supabase/scenarios";
import type { Scenario } from "@/lib/types";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

function isE2eTestMode(): boolean {
  return process.env.E2E_TEST_MODE === "1";
}

function toRow(scenario: Scenario) {
  return {
    id: scenario.id,
    title: scenario.title,
    description: scenario.description,
    difficulty: scenario.difficulty,
    sites_json: JSON.stringify(scenario.sites),
    target_sensor_id: scenario.targetSensorId,
    target_login_user: scenario.targetLoginUser,
    expected_actions_json: JSON.stringify(scenario.expectedActions),
    hardware_fault_json: scenario.hardwareFault
      ? JSON.stringify(scenario.hardwareFault)
      : null,
    event_log_json: scenario.eventLog ? JSON.stringify(scenario.eventLog) : null,
    created_at: scenario.createdAt || new Date().toISOString(),
    updated_at: scenario.updatedAt ?? null,
  };
}

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  if (isE2eTestMode()) {
    return NextResponse.json([]);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("scenarios")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json((data ?? []).map(mapRowToScenario));
  } catch (error: unknown) {
    console.error("Supabase scenario fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch scenarios from Supabase", details: errorMessage(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  if (profile.role !== "admin") return NextResponse.json({ error: "Không có quyền quản lý kịch bản." }, { status: 403 });

  try {
    const scenario = (await request.json()) as Scenario;

    if (!scenario.id || !scenario.title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (isE2eTestMode()) {
      return NextResponse.json({ success: true, scenario, testMode: true });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("scenarios")
      .upsert(toRow(scenario), { onConflict: "id" })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, scenario: mapRowToScenario(data) });
  } catch (error: unknown) {
    console.error("Supabase scenario write error:", error);
    return NextResponse.json(
      { error: "Failed to save scenario to Supabase", details: errorMessage(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  if (profile.role !== "admin") return NextResponse.json({ error: "Không có quyền quản lý kịch bản." }, { status: 403 });

  try {
    const id = new URL(request.url).searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing scenario ID" }, { status: 400 });
    }

    if (isE2eTestMode()) {
      return NextResponse.json({ success: true, testMode: true });
    }

    const supabase = await createClient();
    const { error } = await supabase.from("scenarios").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Supabase scenario delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete scenario from Supabase", details: errorMessage(error) },
      { status: 500 },
    );
  }
}
