import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/profile";
import { queryDatabase, upsertDatabaseRow } from "@/lib/db";
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
    const result = await queryDatabase("select * from public.scenarios order by created_at desc");
    return NextResponse.json(result.rows.map(mapRowToScenario));
  } catch (error: unknown) {
    console.error("PostgreSQL scenario fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch scenarios", details: errorMessage(error) },
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

    const result = await upsertDatabaseRow("scenarios", toRow(scenario));
    return NextResponse.json({ success: true, scenario: mapRowToScenario(result.rows[0]) });
  } catch (error: unknown) {
    console.error("PostgreSQL scenario write error:", error);
    return NextResponse.json(
      { error: "Failed to save scenario", details: errorMessage(error) },
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

    await queryDatabase("delete from public.scenarios where id = $1", [id]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("PostgreSQL scenario delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete scenario", details: errorMessage(error) },
      { status: 500 },
    );
  }
}
