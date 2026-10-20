import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import { canAuthorScenario } from "@/lib/scenario-authorization";
import { deleteLegacyScenario, listLegacyScenarios, saveLegacyScenario, validateLegacyScenario, ScenarioWriteError } from "@/lib/scenarios/adsb-source-service";

function isE2eTestMode() { return process.env.E2E_TEST_MODE === "1"; }

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  if (profile.role === "teacher" && !canAuthorScenario(profile)) {
    return NextResponse.json({ error: "Teacher authoring chưa được bật." }, { status: 403 });
  }
  const headers = { "Cache-Control": "private, no-store", "x-cns-scenario-access": profile.role === "student" ? "practice" : profile.role === "teacher" ? "scoped-source" : "source" };
  if (isE2eTestMode()) return NextResponse.json([], { headers });
  try {
    return NextResponse.json(await listLegacyScenarios(profile), { headers });
  } catch (error) {
    console.error("PostgreSQL scenario fetch error:", error);
    return NextResponse.json({ error: "Không thể tải kịch bản." }, { status: 500, headers });
  }
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  if (profile.role !== "admin") return NextResponse.json({ error: "Không có quyền quản lý kịch bản." }, { status: 403 });
  try {
    const body: unknown = await request.json();
    const scenario = validateLegacyScenario(body);
    if (isE2eTestMode()) return NextResponse.json({ success: true, scenario, testMode: true });
    const expectedRevision = (body as Record<string, unknown>).expectedRevision;
    return NextResponse.json({ success: true, scenario: await saveLegacyScenario(profile.id, scenario, expectedRevision) });
  } catch (error) {
    if (error instanceof ScenarioWriteError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
    console.error("PostgreSQL scenario write error:", error);
    return NextResponse.json({ error: "Không thể lưu kịch bản." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  if (profile.role !== "admin") return NextResponse.json({ error: "Không có quyền quản lý kịch bản." }, { status: 403 });
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing scenario ID" }, { status: 400 });
    if (isE2eTestMode()) return NextResponse.json({ success: true, testMode: true });
    await deleteLegacyScenario(profile.id, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ScenarioWriteError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("PostgreSQL scenario delete error:", error);
    return NextResponse.json({ error: "Không thể xóa kịch bản." }, { status: 500 });
  }
}
