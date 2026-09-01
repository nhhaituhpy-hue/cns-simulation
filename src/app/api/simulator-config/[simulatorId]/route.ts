import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import { queryDatabase } from "@/lib/db";
import { getSimulatorConfigAdapter } from "@/lib/simulator-config/registry";
import {
  SIMULATOR_CONFIG_SCHEMA_VERSION,
  type SimulatorConfigAction,
  type SimulatorConfigHistoryAction,
  type SimulatorConfigHistoryRecord,
  type SimulatorConfigRecord,
  type SupportedSimulatorConfigId,
} from "@/lib/simulator-config/types";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ simulatorId: string }> };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown simulator configuration error";
}

function unwrapRecord(value: unknown): SimulatorConfigRecord {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || typeof candidate !== "object") {
    throw new Error("PostgreSQL returned an empty simulator configuration record.");
  }
  return candidate as SimulatorConfigRecord;
}

function responseFromRecord(
  record: SimulatorConfigRecord,
  simulatorId: SupportedSimulatorConfigId,
  adapter: ReturnType<typeof getSimulatorConfigAdapter>,
) {
  if (!adapter) throw new Error(`Unsupported simulator: ${simulatorId}`);
  if (Number(record.schema_version) !== adapter.schemaVersion) {
    throw new Error(`Stored ${simulatorId} configuration uses an unsupported schema version.`);
  }
  const initialConfig = adapter.parseConfig(record.initial_config);
  const appliedConfig = adapter.parseConfig(record.applied_config);
  const backupConfig = adapter.parseConfig(record.backup_config ?? record.applied_config);
  if (!initialConfig || !appliedConfig || !backupConfig) {
    throw new Error(`Stored ${simulatorId} configuration is invalid or outdated.`);
  }

  return {
    simulatorId,
    schemaVersion: Number(record.schema_version),
    initialConfig,
    appliedConfig,
    backupConfig,
    preferences: record.preferences ?? {},
    revision: Number(record.revision),
    persisted: true,
    history: [],
  };
}

function parseHistoryRows(value: unknown): SimulatorConfigHistoryRecord[] {
  if (!Array.isArray(value)) return [];
  const actions: SimulatorConfigHistoryAction[] = ["initialize", "apply", "restore", "backup", "flash-save"];
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const row = candidate as Record<string, unknown>;
    const action = row.action;
    if (typeof row.id !== "string" || typeof action !== "string" || !actions.includes(action as SimulatorConfigHistoryAction)) {
      return [];
    }
    const changedFields = Array.isArray(row.changed_fields)
      ? row.changed_fields.filter((field): field is string => typeof field === "string")
      : [];
    return [{
      id: row.id,
      action: action as SimulatorConfigHistoryAction,
      changedFields,
      operatorUserId: typeof row.operator_user_id === "string" ? row.operator_user_id : null,
      sessionId: typeof row.session_id === "string" ? row.session_id : null,
      revision: Number(row.revision),
      createdAt: typeof row.created_at === "string" ? row.created_at : "",
    }];
  });
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function GET(_request: Request, context: RouteContext) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const { simulatorId: rawSimulatorId } = await context.params;
  const simulatorId = rawSimulatorId.trim();
  const adapter = getSimulatorConfigAdapter(simulatorId);
  if (!adapter) {
    return NextResponse.json({ error: "Simulator chưa có persistence adapter." }, { status: 404 });
  }

  try {
    const configResult = await queryDatabase<SimulatorConfigRecord>(
      `select * from public.user_simulator_configs
       where user_id = $1 and simulator_id = $2
       limit 1`,
      [profile.id, simulatorId],
    );
    const data = configResult.rows[0];

    if (!data) {
      const defaultConfig = adapter.getDefaultConfig();
      return NextResponse.json({
        simulatorId,
        schemaVersion: SIMULATOR_CONFIG_SCHEMA_VERSION,
        initialConfig: defaultConfig,
        appliedConfig: defaultConfig,
        backupConfig: defaultConfig,
        preferences: {},
        revision: 0,
        persisted: false,
        history: [],
      });
    }

    const historyResult = await queryDatabase(
      `select id, action, changed_fields, operator_user_id, session_id, revision, created_at
       from public.user_simulator_config_history
       where user_id = $1 and simulator_id = $2
       order by created_at desc
       limit 200`,
      [profile.id, simulatorId],
    );

    return NextResponse.json({
      ...responseFromRecord(unwrapRecord(data), simulatorId as SupportedSimulatorConfigId, adapter),
      history: parseHistoryRows(historyResult.rows),
    });
  } catch (error) {
    console.error("Simulator configuration fetch failed:", error);
    return NextResponse.json(
      { error: "Không thể tải cấu hình simulator.", details: errorMessage(error) },
      { status: 500 },
    );
  }
}

export async function POST(_request: Request, context: RouteContext) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const { simulatorId: rawSimulatorId } = await context.params;
  const simulatorId = rawSimulatorId.trim();
  const adapter = getSimulatorConfigAdapter(simulatorId);
  if (!adapter) {
    return NextResponse.json({ error: "Simulator chưa có persistence adapter." }, { status: 404 });
  }

  try {
    const result = await queryDatabase<SimulatorConfigRecord>(
      `select (public.initialize_user_simulator_config($1, $2, $3, $4)).*`,
      [profile.id, simulatorId, adapter.schemaVersion, adapter.getDefaultConfig()],
    );

    return NextResponse.json(
      responseFromRecord(unwrapRecord(result.rows[0]), simulatorId as SupportedSimulatorConfigId, adapter),
      { status: 201 },
    );
  } catch (error) {
    console.error("Simulator configuration initialization failed:", error);
    return NextResponse.json(
      { error: "Không thể khởi tạo cấu hình simulator.", details: errorMessage(error) },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const { simulatorId: rawSimulatorId } = await context.params;
  const simulatorId = rawSimulatorId.trim();
  const adapter = getSimulatorConfigAdapter(simulatorId);
  if (!adapter) {
    return NextResponse.json({ error: "Simulator chưa có persistence adapter." }, { status: 404 });
  }

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const expectedRevision = payload.expectedRevision;
    const config = adapter.parseConfig(payload.config);
    const action = payload.action ?? "apply";
    const backupConfig = payload.backupConfig === undefined
      ? null
      : adapter.parseConfig(payload.backupConfig);
    const changedFields = payload.changedFields;
    const operatorUserId = payload.operatorUserId;
    const sessionId = payload.sessionId;

    if (
      typeof expectedRevision !== "number" ||
      !Number.isInteger(expectedRevision) ||
      expectedRevision < 1 ||
      !config ||
      !["apply", "restore", "backup", "flash-save"].includes(action as SimulatorConfigAction) ||
      (payload.backupConfig !== undefined && !backupConfig) ||
      (changedFields !== undefined && (!Array.isArray(changedFields) || !changedFields.every((value) => typeof value === "string"))) ||
      (operatorUserId !== undefined && (typeof operatorUserId !== "string" || operatorUserId.length > 64)) ||
      (sessionId !== undefined && sessionId !== null && !isUuid(sessionId))
    ) {
      return NextResponse.json({ error: "Payload cấu hình simulator không hợp lệ." }, { status: 400 });
    }

    let data: SimulatorConfigRecord;
    try {
      const result = await queryDatabase<SimulatorConfigRecord>(
        `select (public.save_user_simulator_config($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)).*`,
        [profile.id, simulatorId, adapter.schemaVersion, config, expectedRevision, action, changedFields ?? [], operatorUserId ?? null, sessionId ?? null, backupConfig],
      );
      data = result.rows[0];
    } catch (error) {
      if (error instanceof Error && error.message.includes("CONFIG_REVISION_CONFLICT")) {
        return NextResponse.json(
          { error: "Cấu hình đã thay đổi ở phiên khác." },
          { status: 409 },
        );
      }
      if (error instanceof Error && error.message.includes("SIMULATOR_CONFIG_NOT_INITIALIZED")) {
        return NextResponse.json({ error: "Cấu hình simulator chưa được khởi tạo." }, { status: 409 });
      }
      throw error;
    }

    const response = responseFromRecord(
      unwrapRecord(data),
      simulatorId as SupportedSimulatorConfigId,
      adapter,
    );
    return NextResponse.json({ ...response, action: action as SimulatorConfigAction });
  } catch (error) {
    console.error("Simulator configuration write failed:", error);
    return NextResponse.json(
      { error: "Không thể lưu cấu hình simulator.", details: errorMessage(error) },
      { status: 500 },
    );
  }
}
