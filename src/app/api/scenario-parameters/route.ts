import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import { insertDatabaseRow, queryDatabase } from "@/lib/db";
import {
  canAuthorScenario,
  canManageScenarioResource,
  scenarioOwnerPredicate,
} from "@/lib/scenario-authorization";
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

function isExpectedRevision(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (profile.role === "teacher" && !canAuthorScenario(profile)) {
    return NextResponse.json({ error: "Teacher authoring chưa được bật." }, { status: 403 });
  }
  if (profile.role === "student" && !id) {
    return NextResponse.json({ error: "Không có quyền quản lý kịch bản." }, { status: 403 });
  }
  if (isE2eTestMode()) return NextResponse.json([]);

  try {
    let result;
    if (id && profile.role === "student") {
      // Students resolve the immutable practice snapshot. The mutable source
      // row is intentionally not a valid read path for a training session.
      result = await queryDatabase(
        `select
           m.scenario_parameters_id as id,
           m.module_id,
           m.scenario_id,
           m.name,
           m.description,
           m.difficulty,
           m.schema_version,
           m.definition_json,
           m.source_filename,
           m.published_by as created_by,
           m.published_at as created_at,
           m.published_at as updated_at,
           m.revision_number as revision,
           m.archived_at
         from public.simulator_scenario_library_memberships m
         where m.scenario_parameters_id = $1
           and m.library_kind = 'practice'
           and m.archived_at is null`,
        [id],
      );
    } else if (id) {
      const ownership = scenarioOwnerPredicate({ profile, sourceAlias: "sp", parameterStart: 3 });
      result = await queryDatabase(
        `select sp.*,
           exists (
             select 1
             from public.simulator_scenario_parameter_permissions permission
             where permission.scenario_parameters_id = sp.id
               and permission.module_id = sp.module_id
               and permission.grantee_user_id = $2
               and permission.permission = 'manage'
           ) as has_manage_grant
         from public.simulator_scenario_parameters sp
         where sp.id = $1
           and sp.archived_at is null
           and ${ownership.sql}`,
        [id, profile.id, ...ownership.values],
      );
    } else {
      const ownership = scenarioOwnerPredicate({ profile, sourceAlias: "sp", parameterStart: 1 });
      result = await queryDatabase(
        `select sp.*
         from public.simulator_scenario_parameters sp
         where sp.archived_at is null
           and ${ownership.sql}
         order by sp.updated_at desc, sp.created_at desc`,
        ownership.values,
      );
    }
    if (id && result.rows.length === 0) {
      return NextResponse.json({ error: "Không tìm thấy Scenario Parameters." }, { status: 404 });
    }
    if (id && profile.role === "teacher") {
      const source = result.rows[0] as Record<string, unknown> | undefined;
      if (!source || !canManageScenarioResource({
        profile,
        ownerId: typeof source.created_by === "string" ? source.created_by : "",
        hasGrant: source.has_manage_grant === true,
      })) {
        return NextResponse.json({ error: "Không tìm thấy Scenario Parameters." }, { status: 404 });
      }
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
  if (!canAuthorScenario(profile)) return NextResponse.json({ error: profile.role === "teacher" ? "Teacher authoring chưa được bật." : "Không có quyền quản lý kịch bản." }, { status: 403 });

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
    const existingResult = isE2eTestMode()
      ? { rows: [] }
      : await queryDatabase<Record<string, unknown>>(
        `select sp.*,
           exists (
             select 1
             from public.simulator_scenario_parameter_permissions permission
             where permission.scenario_parameters_id = sp.id
               and permission.module_id = sp.module_id
               and permission.grantee_user_id = $3
               and permission.permission = 'manage'
           ) as has_manage_grant
         from public.simulator_scenario_parameters sp
         where sp.module_id = $1
           and sp.scenario_id = $2
           and sp.archived_at is null
         limit 1`,
        [row.module_id, row.scenario_id, profile.id],
      );
    const existing = existingResult.rows[0];
    if (existing && !canManageScenarioResource({
      profile,
      ownerId: typeof existing.created_by === "string" ? existing.created_by : "",
      hasGrant: existing.has_manage_grant === true,
    })) {
      return NextResponse.json({ error: "Không có quyền sửa kịch bản này." }, { status: 403 });
    }

    let result = null;
    if (existing) {
      if (!isExpectedRevision(body.expectedRevision)) {
        return NextResponse.json({ error: "Cần expectedRevision khi cập nhật kịch bản." }, { status: 400 });
      }
      const currentRevision = typeof existing.revision === "number" ? existing.revision : 1;
      if (body.expectedRevision !== currentRevision) {
        return NextResponse.json({ error: "Kịch bản đã thay đổi ở phiên khác." }, { status: 409 });
      }
      const updateAuthorization = profile.role === "teacher"
        ? `and (
             sp.created_by = $9
             or exists (
               select 1
               from public.simulator_scenario_parameter_permissions permission
               where permission.scenario_parameters_id = sp.id
                 and permission.module_id = sp.module_id
                 and permission.grantee_user_id = $9
                 and permission.permission = 'manage'
             )
           )`
        : "";
      const updated = await queryDatabase(
        `update public.simulator_scenario_parameters as sp
         set name = $1,
             description = $2,
             difficulty = $3,
             schema_version = $4,
             definition_json = $5,
             source_filename = $6,
             revision = revision + 1,
             updated_at = now()
         where sp.id = $7
           and sp.revision = $8
           and sp.archived_at is null
           ${updateAuthorization}
         returning *`,
        [
          row.name,
          row.description,
          row.difficulty,
          row.schema_version,
          row.definition_json,
          row.source_filename,
          existing.id,
          body.expectedRevision,
          ...(profile.role === "teacher" ? [profile.id] : []),
        ],
      );
      if (updated.rows.length === 0) {
        return NextResponse.json({ error: "Kịch bản đã thay đổi ở phiên khác." }, { status: 409 });
      }
      result = updated;
    } else if (!isE2eTestMode()) {
      // Do not use an upsert here: a concurrent create must not turn into an
      // update that changes the existing owner's resource.
      result = await insertDatabaseRow("simulator_scenario_parameters", row);
    }
    const replaced = Boolean(existing);
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
  if (!canAuthorScenario(profile)) return NextResponse.json({ error: profile.role === "teacher" ? "Teacher authoring chưa được bật." : "Không có quyền quản lý kịch bản." }, { status: 403 });

  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "Thiếu mã Scenario Parameters." }, { status: 400 });
  if (isE2eTestMode()) return NextResponse.json({ success: true });

  try {
    const current = await queryDatabase<Record<string, unknown>>(
      `select sp.*,
         exists (
           select 1
           from public.simulator_scenario_parameter_permissions permission
           where permission.scenario_parameters_id = sp.id
             and permission.module_id = sp.module_id
             and permission.grantee_user_id = $2
             and permission.permission = 'manage'
         ) as has_manage_grant
       from public.simulator_scenario_parameters sp
       where sp.id = $1 and sp.archived_at is null
       limit 1`,
      [id, profile.id],
    );
    const source = current.rows[0];
    if (!source || !canManageScenarioResource({
      profile,
      ownerId: typeof source.created_by === "string" ? source.created_by : "",
      hasGrant: source.has_manage_grant === true,
    })) {
      return NextResponse.json({ error: "Không tìm thấy Scenario Parameters." }, { status: 404 });
    }
    const archiveAuthorization = profile.role === "teacher"
      ? `and (
           sp.created_by = $2
           or exists (
             select 1
             from public.simulator_scenario_parameter_permissions permission
             where permission.scenario_parameters_id = sp.id
               and permission.module_id = sp.module_id
               and permission.grantee_user_id = $2
               and permission.permission = 'manage'
           )
         )`
      : "";
    const result = await queryDatabase(
      `update public.simulator_scenario_parameters as sp
       set archived_at = now(), revision = revision + 1, updated_at = now()
       where sp.id = $1 and sp.archived_at is null
         ${archiveAuthorization}
       returning sp.id`,
      profile.role === "teacher" ? [id, profile.id] : [id],
    );
    if (result.rows.length === 0) return NextResponse.json({ error: "Không tìm thấy Scenario Parameters." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Scenario Parameters delete failed:", error);
    return NextResponse.json({ error: "Không thể xóa Scenario Parameters.", details: errorMessage(error) }, { status: 500 });
  }
}
