import { NextResponse } from "next/server";
import { getDb, mapRowToScenario } from "@/lib/db";
import type { Scenario } from "@/lib/types";

export const runtime = "edge";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export async function GET() {
  try {
    const db = getDb();
    // Thực thi câu lệnh SQL lấy toàn bộ kịch bản
    const { results } = await db
      .prepare("SELECT * FROM Scenarios ORDER BY created_at DESC")
      .bind()
      .all();

    const scenarios = (results || []).map(mapRowToScenario);
    return NextResponse.json(scenarios);
  } catch (error: unknown) {
    console.error("D1 Fetch Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch scenarios from D1 database", details: errorMessage(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const scenario: Scenario = await request.json();

    if (!scenario.id || !scenario.title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = getDb();
    
    // Lưu các trường phức tạp dưới dạng JSON string trong D1
    const sitesJson = JSON.stringify(scenario.sites);
    const expectedActionsJson = JSON.stringify(scenario.expectedActions);
    const createdAt = scenario.createdAt || new Date().toISOString();
    const updatedAt = scenario.updatedAt || null;

    await db
      .prepare(
        "INSERT INTO Scenarios (id, title, description, difficulty, sites_json, target_sensor_id, target_login_user, expected_actions_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(
        scenario.id,
        scenario.title,
        scenario.description,
        scenario.difficulty,
        sitesJson,
        scenario.targetSensorId,
        scenario.targetLoginUser,
        expectedActionsJson,
        createdAt,
        updatedAt
      )
      .run();

    return NextResponse.json({ success: true, scenario });
  } catch (error: unknown) {
    console.error("D1 Insert Error:", error);
    return NextResponse.json(
      { error: "Failed to save scenario to D1 database", details: errorMessage(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing scenario ID" }, { status: 400 });
    }

    const db = getDb();
    await db.prepare("DELETE FROM Scenarios WHERE id = ?").bind(id).run();

    return NextResponse.json({ success: true, message: `Scenario ${id} deleted successfully` });
  } catch (error: unknown) {
    console.error("D1 Delete Error:", error);
    return NextResponse.json(
      { error: "Failed to delete scenario from D1 database", details: errorMessage(error) },
      { status: 500 }
    );
  }
}
