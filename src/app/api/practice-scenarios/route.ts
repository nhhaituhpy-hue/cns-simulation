import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import { queryDatabase } from "@/lib/db";
import { isScenarioParametersModuleId } from "@/lib/scenario-parameters";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
/** The practice route always resolves a published snapshot, including for admins. */
export async function GET(request: Request) {
  const actor = await getCurrentProfile();
  if (!actor || actor.mustChangePassword) return json({ error: "Chưa đăng nhập hoặc cần đổi mật khẩu." }, 401);
  const params = new URL(request.url).searchParams;
  const moduleId = params.get("moduleId"), id = params.get("id");
  if (!moduleId || !isScenarioParametersModuleId(moduleId) || !id || !UUID.test(id)) return json({ error: "Kịch bản ôn tập không hợp lệ." }, 400);
  try {
    const result = await queryDatabase(`select m.scenario_parameters_id as id,m.module_id,m.scenario_id,m.id as membership_id,
      m.revision_number,m.name,m.description,m.difficulty,m.definition_json
      from public.simulator_scenario_library_memberships m join public.users actor on actor.id=$3
      where m.scenario_parameters_id=$1 and m.module_id=$2 and m.library_kind='practice'
        and m.archived_at is null and actor.is_active and not actor.must_change_password`, [id, moduleId, actor.id]);
    const row = result.rows[0];
    if (!row) return json({ error: "Kịch bản chưa được công bố cho Ôn tập." }, 404);
    return json({ id: row.id, moduleId: row.module_id, scenarioId: row.scenario_id, membershipId: row.membership_id,
      revision: row.revision_number, name: row.name, description: row.description, difficulty: row.difficulty, definition: row.definition_json });
  } catch { return json({ error: "Không thể tải kịch bản ôn tập." }, 503); }
}
