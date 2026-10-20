import "server-only";
import type { AuthProfile } from "@/lib/auth/profile";
import { queryDatabase, withDatabaseTransaction } from "@/lib/db";
import { scenarioOwnerPredicate } from "@/lib/scenario-authorization";
import { normalizeScenario } from "@/lib/scenario-normalization";
import { isScenario } from "@/lib/storage";
import { mapRowToScenario } from "@/lib/supabase/scenarios";
import type { Scenario } from "@/lib/types";
import { parseAdsbScenarioDefinition } from "@/modules/devices/adsb/scenario-parameters";

export class ScenarioWriteError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

export function validateLegacyScenario(value: unknown): Scenario {
  const normalized = normalizeScenario(value);
  if (!isScenario(normalized) || normalized.id.length > 200 || normalized.title.length > 200 || normalized.description.length > 2000) {
    throw new ScenarioWriteError(400, "Kịch bản ADS-B không hợp lệ.");
  }
  if (Buffer.byteLength(JSON.stringify(normalized), "utf8") > 750_000) {
    throw new ScenarioWriteError(413, "Kịch bản vượt quá giới hạn 750 KB.");
  }
  return normalized;
}

function legacyRow(scenario: Scenario) {
  return {
    id: scenario.id, title: scenario.title, description: scenario.description,
    difficulty: scenario.difficulty, sites_json: JSON.stringify(scenario.sites),
    target_sensor_id: scenario.targetSensorId, target_login_user: scenario.targetLoginUser,
    expected_actions_json: JSON.stringify(scenario.expectedActions),
    hardware_fault_json: scenario.hardwareFault ? JSON.stringify(scenario.hardwareFault) : null,
    event_log_json: scenario.eventLog ? JSON.stringify(scenario.eventLog) : null,
    created_at: scenario.createdAt, updated_at: scenario.updatedAt ?? null,
  };
}

function definitionToLegacy(row: Record<string, unknown>): Scenario {
  const definition = parseAdsbScenarioDefinition(row.definition_json);
  if (!definition) throw new Error("Invalid ADS-B source definition.");
  const scenario: Scenario = {
    id: definition.id, title: definition.name, description: definition.description,
    difficulty: {basic: "easy", intermediate: "medium", advanced: "hard"}[definition.difficulty] as Scenario["difficulty"],
    sites: definition.sites, targetSensorId: definition.targetSensorId,
    targetLoginUser: definition.targetLoginUser, expectedActions: definition.expectedActions,
    ...(definition.hardwareFault ? { hardwareFault: definition.hardwareFault } : {}),
    ...(definition.eventLog ? { eventLog: definition.eventLog } : {}),
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
  if (!isScenario(scenario)) throw new Error("Invalid ADS-B legacy projection.");
  return scenario;
}

export async function listLegacyScenarios(profile: AuthProfile): Promise<Scenario[]> {
  if (profile.role === "student") {
    const result = await queryDatabase(`select definition_json, published_at as created_at, published_at as updated_at
      from public.simulator_scenario_library_memberships
      where module_id = 'ads-b' and library_kind = 'practice' and archived_at is null
      order by sort_order`);
    return result.rows.map(definitionToLegacy);
  }
  const ownership = scenarioOwnerPredicate({ profile, sourceAlias: "sp", parameterStart: 1 });
  const result = await queryDatabase(`select s.*, sp.definition_json, sp.revision,
      sp.created_at as source_created_at, sp.updated_at as source_updated_at
    from public.scenarios s
    left join public.simulator_scenario_parameters sp on sp.module_id = 'ads-b' and sp.scenario_id = s.id
    where (sp.id is null or sp.archived_at is null) and ${ownership.sql}
    order by s.created_at desc`, ownership.values);
  return result.rows.map(row => row.definition_json
    ? { ...definitionToLegacy({ ...row, created_at: row.source_created_at, updated_at: row.source_updated_at }), revision: row.revision }
    : mapRowToScenario(row));
}

/** Only the mutable source and its legacy projection change; never snapshots. */
export async function saveLegacyScenario(actorId: string, scenario: Scenario, expectedRevision: unknown): Promise<Scenario> {
  return withDatabaseTransaction(async client => {
    const actor = await client.query("select id from public.users where id = $1 and role = 'admin' and is_active for share", [actorId]);
    if (!actor.rows.length) throw new ScenarioWriteError(403, "Không có quyền quản lý kịch bản.");
    await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [scenario.id]);
    const source = (await client.query("select * from public.simulator_scenario_parameters where module_id = 'ads-b' and scenario_id = $1 for update", [scenario.id])).rows[0];
    let revision: number | undefined;
    if (source) {
      if (source.archived_at) throw new ScenarioWriteError(409, "Kịch bản đã được lưu trữ.");
      if (typeof expectedRevision !== "number" || !Number.isInteger(expectedRevision) || expectedRevision < 1) throw new ScenarioWriteError(400, "Cần expectedRevision khi cập nhật kịch bản.");
      if (expectedRevision !== source.revision) throw new ScenarioWriteError(409, "Kịch bản đã thay đổi ở phiên khác.");
      const definition = parseAdsbScenarioDefinition({ ...scenario, name: scenario.title });
      if (!definition) throw new ScenarioWriteError(400, "Kịch bản ADS-B không hợp lệ.");
      const updated = await client.query(`update public.simulator_scenario_parameters
        set name=$1, description=$2, difficulty=$3, schema_version=$4, definition_json=$5,
            revision=revision+1, updated_at=now()
        where id=$6 and revision=$7 and archived_at is null returning revision`,
      [definition.name, definition.description, definition.difficulty, definition.schemaVersion, JSON.stringify(definition), source.id, expectedRevision]);
      if (!updated.rows.length) throw new ScenarioWriteError(409, "Kịch bản đã thay đổi ở phiên khác.");
      revision = updated.rows[0].revision;
    }
    const row = legacyRow({ ...scenario, updatedAt: new Date().toISOString() });
    const keys = Object.keys(row) as (keyof typeof row)[];
    const result = await client.query(`insert into public.scenarios (${keys.join(",")})
      values (${keys.map((_, i) => `$${i + 1}`).join(",")})
      on conflict (id) do update set ${keys.filter(key => key !== "id" && key !== "created_at").map(key => `${key}=excluded.${key}`).join(",")}
      returning *`, keys.map(key => row[key]));
    return { ...mapRowToScenario(result.rows[0]), ...(revision === undefined ? {} : { revision }) };
  });
}

/** Match canonical source deletion semantics without breaking durable AI job FKs. */
export async function deleteLegacyScenario(actorId: string, scenarioId: string): Promise<void> {
  await withDatabaseTransaction(async client => {
    const actor = await client.query("select id from public.users where id = $1 and role = $2 and is_active for share", [actorId, "admin"]);
    if (!actor.rows.length) throw new ScenarioWriteError(403, "Không có quyền quản lý kịch bản.");
    await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [scenarioId]);
    await client.query("update public.simulator_scenario_parameters set archived_at=now(), revision=revision+1, updated_at=now() where module_id=$1 and scenario_id=$2 and archived_at is null", ["ads-b", scenarioId]);
    await client.query("delete from public.scenarios where id=$1", [scenarioId]);
  });
}
