import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import { queryDatabase, upsertDatabaseRow } from "@/lib/db";
import {
  isScenarioParametersModuleId,
  parseScenarioParameters,
  scenarioParametersMetadata,
} from "@/lib/scenario-parameters";
import {
  mapRowToStoredScenarioParameters,
  storedScenarioParametersToRow,
} from "@/lib/scenario-parameters-storage";

const MAX_SCENARIO_BYTES = 750_000;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Không thể xử lý Scenario Parameters.";
}

function isE2eTestMode() {
  return process.env.E2E_TEST_MODE === "1";
}

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (profile.role !== "admin" && !id) {
    return NextResponse.json({ error: "Không có quyền quản lý kịch bản." }, { status: 403 });
  }
  if (isE2eTestMode()) return NextResponse.json([]);

  try {
    const result = id && profile.role !== "admin"
      ? await queryDatabase(
        `select sp.*
         from public.simulator_scenario_parameters sp
         where sp.id = $1
           and exists (
             select 1
             from public.simulator_review_scenario_assignments a
             where a.scenario_parameters_id = sp.id
               and a.module_id = sp.module_id
           )`,
        [id],
      )
      : id
        ? await queryDatabase("select * from public.simulator_scenario_parameters where id = $1", [id])
        : await queryDatabase("select * from public.simulator_scenario_parameters order by updated_at desc, created_at desc");
    if (id && result.rows.length === 0) {
      return NextResponse.json({ error: "Không tìm thấy Scenario Parameters." }, { status: 404 });
    }
    return NextResponse.json(result.rows.map(mapRowToStoredScenarioParameters));
  } catch (error) {
    console.error("Scenario Parameters fetch failed:", error);
    return NextResponse.json({ error: "Không thể tải Scenario Parameters.", details: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  if (profile.role !== "admin") return NextResponse.json({ error: "Không có quyền quản lý kịch bản." }, { status: 403 });

  try {
    const body = await request.json() as Record<string, unknown>;
    const moduleId = typeof body.moduleId === "string" ? body.moduleId.trim() : "";
    if (!isScenarioParametersModuleId(moduleId)) {
      return NextResponse.json({ error: "Simulation chưa có adapter Scenario Parameters." }, { status: 400 });
    }

    const definition = parseScenarioParameters(moduleId, body.definition);
    if (!definition) {
      return NextResponse.json({ error: `JSON không đúng schema Scenario Parameters của ${moduleId}.` }, { status: 400 });
    }
    const serialized = JSON.stringify(definition);
    if (Buffer.byteLength(serialized, "utf8") > MAX_SCENARIO_BYTES) {
      return NextResponse.json({ error: "Scenario Parameters vượt quá giới hạn 750 KB." }, { status: 413 });
    }

    const row = storedScenarioParametersToRow({
      moduleId,
      definition,
      sourceFileName: typeof body.sourceFileName === "string" ? body.sourceFileName : undefined,
      createdBy: profile.id,
    });
    const replaced = isE2eTestMode()
      ? false
      : (await queryDatabase(
        "select 1 from public.simulator_scenario_parameters where module_id = $1 and scenario_id = $2",
        [row.module_id, row.scenario_id],
      )).rows.length > 0;
    const result = isE2eTestMode()
      ? null
      : await upsertDatabaseRow("simulator_scenario_parameters", row, ["module_id", "scenario_id"]);
    const metadata = scenarioParametersMetadata(definition);
    return NextResponse.json({
      success: true,
      replaced,
      metadata,
      ...(result ? { scenario: mapRowToStoredScenarioParameters(result.rows[0]) } : { scenario: { ...metadata, moduleId, definition } }),
    });
  } catch (error) {
    console.error("Scenario Parameters write failed:", error);
    return NextResponse.json({ error: "Không thể lưu Scenario Parameters.", details: errorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  if (profile.role !== "admin") return NextResponse.json({ error: "Không có quyền quản lý kịch bản." }, { status: 403 });

  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "Thiếu mã Scenario Parameters." }, { status: 400 });
  if (isE2eTestMode()) return NextResponse.json({ success: true });

  try {
    const result = await queryDatabase("delete from public.simulator_scenario_parameters where id = $1 returning id", [id]);
    if (result.rows.length === 0) return NextResponse.json({ error: "Không tìm thấy Scenario Parameters." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Scenario Parameters delete failed:", error);
    return NextResponse.json({ error: "Không thể xóa Scenario Parameters.", details: errorMessage(error) }, { status: 500 });
  }
}
