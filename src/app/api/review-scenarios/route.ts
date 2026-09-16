import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import { queryDatabase, withDatabaseTransaction } from "@/lib/db";
import {
  isScenarioParametersModuleId,
  type ScenarioParametersModuleId,
} from "@/lib/scenario-parameters";
import { mapRowToStoredScenarioParameters } from "@/lib/scenario-parameters-storage";
import { mapRowToAssignedReviewScenario } from "@/lib/review-scenarios";

const MAX_ASSIGNED_SCENARIOS = 100;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isE2eTestMode() {
  return process.env.E2E_TEST_MODE === "1";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Không thể xử lý danh sách ôn tập.";
}

function requestedModuleId(request: Request) {
  return new URL(request.url).searchParams.get("moduleId")?.trim() ?? "";
}

function invalidModuleResponse() {
  return NextResponse.json(
    { error: "Thiết bị chưa hỗ trợ phân bổ kịch bản ôn tập." },
    { status: 400 },
  );
}

async function assignedRows(moduleId: ScenarioParametersModuleId) {
  return queryDatabase(
    `select sp.*, a.sort_order, a.assigned_at
     from public.simulator_review_scenario_assignments a
     join public.simulator_scenario_parameters sp
       on sp.id = a.scenario_parameters_id
      and sp.module_id = a.module_id
     where a.module_id = $1
     order by a.sort_order asc`,
    [moduleId],
  );
}

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  const moduleId = requestedModuleId(request);
  if (!isScenarioParametersModuleId(moduleId)) return invalidModuleResponse();
  if (isE2eTestMode()) {
    return NextResponse.json({ assigned: [], available: [], canManage: profile.role === "admin" });
  }

  try {
    const assigned = (await assignedRows(moduleId)).rows.map(
      mapRowToAssignedReviewScenario,
    );
    if (profile.role !== "admin") {
      return NextResponse.json({ assigned, canManage: false });
    }
    const availableResult = await queryDatabase(
      `select * from public.simulator_scenario_parameters
       where module_id = $1
       order by updated_at desc, created_at desc`,
      [moduleId],
    );
    return NextResponse.json({
      assigned,
      available: availableResult.rows.map(mapRowToStoredScenarioParameters),
      canManage: true,
    });
  } catch (error) {
    console.error("Review scenarios fetch failed:", error);
    return NextResponse.json(
      { error: "Không thể tải danh sách ôn tập.", details: errorMessage(error) },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  if (profile.role !== "admin") {
    return NextResponse.json(
      { error: "Không có quyền phân bổ kịch bản ôn tập." },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const moduleId = typeof body.moduleId === "string" ? body.moduleId.trim() : "";
    if (!isScenarioParametersModuleId(moduleId)) return invalidModuleResponse();
    if (!Array.isArray(body.scenarioIds)) {
      return NextResponse.json({ error: "Danh sách kịch bản không hợp lệ." }, { status: 400 });
    }
    const scenarioIds = body.scenarioIds.filter(
      (value): value is string => typeof value === "string",
    );
    if (
      scenarioIds.length !== body.scenarioIds.length ||
      scenarioIds.length > MAX_ASSIGNED_SCENARIOS ||
      scenarioIds.some((id) => !UUID_PATTERN.test(id)) ||
      new Set(scenarioIds).size !== scenarioIds.length
    ) {
      return NextResponse.json({ error: "Danh sách kịch bản không hợp lệ." }, { status: 400 });
    }
    if (isE2eTestMode()) {
      return NextResponse.json({ success: true, assignedCount: scenarioIds.length });
    }

    await withDatabaseTransaction(async (client) => {
      if (scenarioIds.length > 0) {
        const selected = await client.query<{ id: string; module_id: string }>(
          `select id, module_id
           from public.simulator_scenario_parameters
           where id = any($1::uuid[])
           for share`,
          [scenarioIds],
        );
        if (
          selected.rows.length !== scenarioIds.length ||
          selected.rows.some((row) => row.module_id !== moduleId)
        ) {
          throw new Error("Một hoặc nhiều kịch bản không thuộc thiết bị đã chọn.");
        }
      }

      await client.query(
        "delete from public.simulator_review_scenario_assignments where module_id = $1",
        [moduleId],
      );
      for (const [index, scenarioParametersId] of scenarioIds.entries()) {
        await client.query(
          `insert into public.simulator_review_scenario_assignments
             (module_id, scenario_parameters_id, sort_order, assigned_by)
           values ($1, $2, $3, $4)`,
          [moduleId, scenarioParametersId, index + 1, profile.id],
        );
      }
    });

    return NextResponse.json({ success: true, assignedCount: scenarioIds.length });
  } catch (error) {
    const message = errorMessage(error);
    const isSelectionError = message.includes("không thuộc thiết bị");
    console.error("Review scenarios assignment failed:", error);
    return NextResponse.json(
      {
        error: isSelectionError ? message : "Không thể lưu danh sách ôn tập.",
        ...(!isSelectionError ? { details: message } : {}),
      },
      { status: isSelectionError ? 400 : 500 },
    );
  }
}
