import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import { queryDatabase, withDatabaseTransaction } from "@/lib/db";
import {
  canAuthorScenario,
  canManageScenarioResource,
  scenarioOwnerPredicate,
} from "@/lib/scenario-authorization";
import {
  isScenarioParametersModuleId,
  type ScenarioParametersModuleId,
} from "@/lib/scenario-parameters";
import {
  SCENARIO_LIBRARY_KINDS,
  mapRowToScenarioLibraryMembership,
  type ScenarioLibraryKind,
} from "@/lib/scenario-libraries";
import { mapRowToStoredScenarioParameters } from "@/lib/scenario-parameters-storage";

const MAX_LIBRARY_ITEMS = 100;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isE2eTestMode() {
  return process.env.E2E_TEST_MODE === "1";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Không thể xử lý thư viện kịch bản.";
}

function readModuleId(request: Request): ScenarioParametersModuleId | null {
  const value = new URL(request.url).searchParams.get("moduleId")?.trim() ?? "";
  return isScenarioParametersModuleId(value) ? value : null;
}

function readKind(value: unknown): ScenarioLibraryKind | null {
  return typeof value === "string" && SCENARIO_LIBRARY_KINDS.includes(value as ScenarioLibraryKind)
    ? value as ScenarioLibraryKind
    : null;
}

function isExpectedLibraryRevision(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function membershipSelect() {
  return `
    select
      m.id as membership_id,
      m.module_id,
      m.scenario_parameters_id as id,
      m.scenario_id,
      m.name,
      m.description,
      m.difficulty,
      m.schema_version,
      m.definition_json,
      m.source_filename,
      m.published_at as created_at,
      m.published_at as updated_at,
      m.library_kind,
      m.revision_number,
      m.sort_order,
      m.published_by,
      m.published_at,
      m.archived_at,
      sp.created_by as source_created_by,
      exists (
        select 1 from public.simulator_scenario_parameter_permissions permission
        where permission.scenario_parameters_id = sp.id
          and permission.module_id = sp.module_id
          and permission.grantee_user_id = $2
          and permission.permission = 'manage'
      ) as has_manage_grant
    from public.simulator_scenario_library_memberships m
    join public.simulator_scenario_parameters sp
      on sp.id = m.scenario_parameters_id
     and sp.module_id = m.module_id`;
}

function groupedMemberships(rows: readonly unknown[]) {
  const grouped: Record<ScenarioLibraryKind, ReturnType<typeof mapRowToScenarioLibraryMembership>[]> = {
    practice: [],
    exam: [],
  };
  for (const row of rows) {
    const mapped = mapRowToScenarioLibraryMembership(row);
    grouped[mapped.libraryKind].push(mapped);
  }
  return grouped;
}

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  const moduleId = readModuleId(request);
  if (!moduleId) return NextResponse.json({ error: "Thiết bị không hợp lệ." }, { status: 400 });

  if (profile.role === "teacher" && !canAuthorScenario(profile)) {
    return NextResponse.json({ error: "Teacher authoring chưa được bật." }, { status: 403 });
  }

  if (profile.role === "student") {
    if (isE2eTestMode()) return NextResponse.json({ practice: [], exam: [], available: [], libraryRevisions: { practice: 0, exam: 0 } });
    try {
      const practiceResult = await queryDatabase(
        `${membershipSelect()} where m.module_id = $1 and m.library_kind = 'practice' and m.archived_at is null order by m.sort_order`,
        [moduleId, profile.id],
      );
      return NextResponse.json({
        practice: practiceResult.rows.map(mapRowToScenarioLibraryMembership),
        exam: [],
        available: [],
        libraryRevisions: { practice: 0, exam: 0 },
      });
    } catch (error) {
      console.error("Student scenario library fetch failed:", error);
      return NextResponse.json({ error: "Không thể tải thư viện Ôn tập.", details: errorMessage(error) }, { status: 500 });
    }
  }

  if (!canAuthorScenario(profile)) {
    return NextResponse.json({ error: "Không có quyền quản lý thư viện kịch bản." }, { status: 403 });
  }
  if (isE2eTestMode()) return NextResponse.json({ practice: [], exam: [], available: [], libraryRevisions: { practice: 0, exam: 0 } });

  try {
    const ownership = scenarioOwnerPredicate({ profile, sourceAlias: "sp", parameterStart: 2 });
    const availableGrantSelect = profile.role === "teacher"
      ? `exists (
           select 1
           from public.simulator_scenario_parameter_permissions permission
           where permission.scenario_parameters_id = sp.id
             and permission.module_id = sp.module_id
             and permission.grantee_user_id = $2
             and permission.permission = 'manage'
         ) as has_manage_grant`
      : "false as has_manage_grant";
    const [availableResult, membershipResult, revisionResult] = await Promise.all([
      queryDatabase(
        `select sp.*, ${availableGrantSelect}
         from public.simulator_scenario_parameters sp
         where sp.module_id = $1
           and sp.archived_at is null
           and ${ownership.sql}
         order by sp.updated_at desc, sp.created_at desc`,
        [moduleId, ...ownership.values],
      ),
      queryDatabase(
        `${membershipSelect()}
         where m.module_id = $1
           and m.archived_at is null
           and (${profile.role === "admin" ? "true" : "(sp.created_by = $2 or exists (select 1 from public.simulator_scenario_parameter_permissions permission where permission.scenario_parameters_id = sp.id and permission.module_id = sp.module_id and permission.grantee_user_id = $2 and permission.permission = 'manage'))"})
         order by m.library_kind, m.sort_order`,
        [moduleId, profile.id],
      ),
      queryDatabase<{ library_kind: ScenarioLibraryKind; revision: number }>(
        `select library_kind, revision
         from public.simulator_scenario_library_revisions
         where module_id = $1`,
        [moduleId],
      ),
    ]);
    const accessibleMembershipRows = profile.role === "teacher"
      ? membershipResult.rows.filter((row) => {
        const candidate = row as Record<string, unknown>;
        return canManageScenarioResource({
          profile,
          ownerId: typeof candidate.source_created_by === "string" ? candidate.source_created_by : "",
          hasGrant: candidate.has_manage_grant === true,
        });
      })
      : membershipResult.rows;
    const accessibleAvailableRows = profile.role === "teacher"
      ? availableResult.rows.filter((row) => {
        const candidate = row as Record<string, unknown>;
        return canManageScenarioResource({
          profile,
          ownerId: typeof candidate.created_by === "string" ? candidate.created_by : "",
          hasGrant: candidate.has_manage_grant === true,
        });
      })
      : availableResult.rows;
    const grouped = groupedMemberships(accessibleMembershipRows);
    const libraryRevisions = { practice: 0, exam: 0 };
    for (const row of revisionResult.rows) libraryRevisions[row.library_kind] = row.revision;
    return NextResponse.json({
      available: accessibleAvailableRows.map(mapRowToStoredScenarioParameters),
      practice: grouped.practice,
      exam: grouped.exam,
      libraryRevisions,
    });
  } catch (error) {
    console.error("Scenario libraries fetch failed:", error);
    return NextResponse.json({ error: "Không thể tải thư viện kịch bản.", details: errorMessage(error) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  if (!canAuthorScenario(profile)) {
    return NextResponse.json({ error: profile.role === "teacher" ? "Teacher authoring chưa được bật." : "Không có quyền quản lý thư viện kịch bản." }, { status: 403 });
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    const moduleId = typeof body.moduleId === "string" ? body.moduleId.trim() : "";
    const libraryKind = readKind(body.libraryKind);
    const scenarioIds = Array.isArray(body.scenarioIds) ? body.scenarioIds : null;
    if (!isScenarioParametersModuleId(moduleId) || !libraryKind || !scenarioIds || !isExpectedLibraryRevision(body.expectedRevision)) {
      return NextResponse.json({ error: "Thiết bị, thư viện, expectedRevision hoặc danh sách kịch bản không hợp lệ." }, { status: 400 });
    }
    const ids = scenarioIds.filter((value): value is string => typeof value === "string");
    if (
      ids.length !== scenarioIds.length
      || ids.length > MAX_LIBRARY_ITEMS
      || ids.some((id) => !UUID_PATTERN.test(id))
      || new Set(ids).size !== ids.length
    ) {
      return NextResponse.json({ error: "Danh sách kịch bản không hợp lệ." }, { status: 400 });
    }
    if (isE2eTestMode()) return NextResponse.json({ success: true, libraryKind, publishedCount: ids.length, libraryRevision: body.expectedRevision + 1 });

    await withDatabaseTransaction(async (client) => {
      const revisionResult = await client.query<{ revision: number }>(
        `select revision
         from public.simulator_scenario_library_revisions
         where module_id = $1 and library_kind = $2
         for update`,
        [moduleId, libraryKind],
      );
      const currentRevision = revisionResult.rows[0]?.revision;
      if (currentRevision === undefined) throw new Error("LIBRARY_REVISION_NOT_INITIALIZED");
      if (body.expectedRevision !== currentRevision) throw new Error("LIBRARY_REVISION_CONFLICT");

      const ownership = scenarioOwnerPredicate({ profile, sourceAlias: "sp", parameterStart: 3 });
      const selected = ids.length === 0
        ? []
        : (await client.query<{
          id: string;
          module_id: string;
          scenario_id: string;
          name: string;
          description: string;
          difficulty: string;
          schema_version: number;
          definition_json: unknown;
          source_filename: string;
          created_by: string;
          has_manage_grant?: boolean;
        }>(
          `select sp.id, sp.module_id, sp.scenario_id, sp.name, sp.description, sp.difficulty,
                  sp.schema_version, sp.definition_json, sp.source_filename, sp.created_by,
                  exists (
                    select 1 from public.simulator_scenario_parameter_permissions permission
                    where permission.scenario_parameters_id = sp.id
                      and permission.module_id = sp.module_id
                      and permission.grantee_user_id = $3
                      and permission.permission = 'manage'
                  ) as has_manage_grant
           from public.simulator_scenario_parameters sp
           where sp.id = any($1::uuid[])
             and sp.module_id = $2
             and sp.archived_at is null
             and ${ownership.sql}
           for share`,
          [ids, moduleId, ...ownership.values],
        )).rows;
      if (
        selected.length !== ids.length
        || selected.some((scenario) => scenario.module_id !== moduleId)
        || selected.some((scenario) => profile.role === "teacher" && !canManageScenarioResource({
          profile,
          ownerId: scenario.created_by,
          hasGrant: scenario.has_manage_grant === true,
        }))
      ) {
        throw new Error(profile.role === "admin" ? "Một hoặc nhiều kịch bản không thuộc thiết bị đã chọn." : "SCENARIO_PERMISSION_DENIED");
      }

      const archiveMembershipsSql = profile.role === "teacher"
        ? `update public.simulator_scenario_library_memberships as m
           set archived_at = now()
           from public.simulator_scenario_parameters sp
           where m.module_id = $1
             and m.library_kind = $2
             and m.archived_at is null
             and sp.id = m.scenario_parameters_id
             and sp.module_id = m.module_id
             and (
               sp.created_by = $3
               or exists (
                 select 1
                 from public.simulator_scenario_parameter_permissions permission
                 where permission.scenario_parameters_id = sp.id
                   and permission.module_id = sp.module_id
                   and permission.grantee_user_id = $3
                   and permission.permission = 'manage'
               )
             )`
        : `update public.simulator_scenario_library_memberships
           set archived_at = now()
           where module_id = $1 and library_kind = $2 and archived_at is null`;
      await client.query(
        archiveMembershipsSql,
        profile.role === "teacher" ? [moduleId, libraryKind, profile.id] : [moduleId, libraryKind],
      );

      const sortOrderResult = await client.query<{ sort_order: number }>(
        `select coalesce(max(sort_order), 0) as sort_order
         from public.simulator_scenario_library_memberships
         where module_id = $1 and library_kind = $2 and archived_at is null`,
        [moduleId, libraryKind],
      );
      const sortOrderOffset = Number(sortOrderResult.rows[0]?.sort_order ?? 0);

      for (const [index, scenario] of selected.entries()) {
        const revisionResult = await client.query<{ revision_number: number }>(
          `select coalesce(max(revision_number), 0) + 1 as revision_number
           from public.simulator_scenario_library_memberships
           where scenario_parameters_id = $1 and library_kind = $2`,
          [scenario.id, libraryKind],
        );
        const revisionNumber = revisionResult.rows[0]?.revision_number ?? 1;
        await client.query(
          `insert into public.simulator_scenario_library_memberships
             (module_id, scenario_parameters_id, library_kind, revision_number,
              scenario_id, name, description, difficulty, schema_version,
              definition_json, source_filename, published_by, sort_order)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            moduleId,
            scenario.id,
            libraryKind,
            revisionNumber,
            scenario.scenario_id,
            scenario.name,
            scenario.description,
            scenario.difficulty,
            scenario.schema_version,
            scenario.definition_json,
            scenario.source_filename,
            profile.id,
            sortOrderOffset + index + 1,
          ],
        );
      }

      if (libraryKind === "practice") {
        const deleteAssignmentsSql = profile.role === "teacher"
          ? `delete from public.simulator_review_scenario_assignments as a
             using public.simulator_scenario_parameters sp
             where a.module_id = $1
               and sp.id = a.scenario_parameters_id
               and sp.module_id = a.module_id
               and (
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
          : "delete from public.simulator_review_scenario_assignments where module_id = $1";
        await client.query(
          deleteAssignmentsSql,
          profile.role === "teacher" ? [moduleId, profile.id] : [moduleId],
        );
        for (const [index, scenarioId] of ids.entries()) {
          await client.query(
            `insert into public.simulator_review_scenario_assignments
               (module_id, scenario_parameters_id, sort_order, assigned_by)
             values ($1, $2, $3, $4)`,
            [moduleId, scenarioId, index + 1, profile.id],
          );
        }
      }

      await client.query(
        `update public.simulator_scenario_library_revisions
         set revision = revision + 1, updated_by = $3, updated_at = now()
         where module_id = $1 and library_kind = $2`,
        [moduleId, libraryKind, profile.id],
      );
    });

    return NextResponse.json({ success: true, libraryKind, publishedCount: ids.length, libraryRevision: body.expectedRevision + 1 });
  } catch (error) {
    const message = errorMessage(error);
    console.error("Scenario library write failed:", error);
    if (message === "LIBRARY_REVISION_CONFLICT") return NextResponse.json({ error: "Thư viện đã thay đổi ở phiên khác." }, { status: 409 });
    if (message === "SCENARIO_PERMISSION_DENIED") return NextResponse.json({ error: "Không có quyền công bố một hoặc nhiều kịch bản." }, { status: 403 });
    if (message === "LIBRARY_REVISION_NOT_INITIALIZED") return NextResponse.json({ error: "Thư viện chưa được khởi tạo revision." }, { status: 409 });
    const isSelectionError = message.includes("không thuộc thiết bị");
    return NextResponse.json(
      {
        error: isSelectionError ? message : "Không thể cập nhật thư viện kịch bản.",
        ...(!isSelectionError ? { details: message } : {}),
      },
      { status: isSelectionError ? 400 : 500 },
    );
  }
}
