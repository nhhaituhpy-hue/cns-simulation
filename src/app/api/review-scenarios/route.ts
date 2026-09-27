import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import { canAuthorScenario } from "@/lib/scenario-authorization";
import {
  GET as getScenarioLibraries,
  PUT as putScenarioLibrary,
} from "@/app/api/scenario-libraries/route";
import {
  isScenarioParametersModuleId,
  type ScenarioParametersModuleId,
} from "@/lib/scenario-parameters";

function requestedModuleId(request: Request): ScenarioParametersModuleId | null {
  const value = new URL(request.url).searchParams.get("moduleId")?.trim() ?? "";
  return isScenarioParametersModuleId(value) ? value : null;
}

function jsonRequestBody(request: Request, body: Record<string, unknown>) {
  return new Request(request.url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  const moduleId = requestedModuleId(request);
  if (!moduleId) return NextResponse.json({ error: "Thiết bị chưa hỗ trợ phân bổ kịch bản ôn tập." }, { status: 400 });

  const response = await getScenarioLibraries(request);
  const payload = await response.json() as Record<string, unknown>;
  if (!response.ok) return NextResponse.json(payload, { status: response.status });
  const libraryRevisions = payload.libraryRevisions as { practice?: number } | undefined;
  const responsePayload: Record<string, unknown> = {
    assigned: Array.isArray(payload.practice)
      ? payload.practice.map((item) => ({ ...(item as Record<string, unknown>), assignedAt: (item as Record<string, unknown>).publishedAt }))
      : [],
    canManage: canAuthorScenario(profile),
    libraryRevision: libraryRevisions?.practice ?? 0,
  };
  if (profile.role !== "student" && Array.isArray(payload.available)) responsePayload.available = payload.available;
  return NextResponse.json(responsePayload);
}

export async function PUT(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  if (!canAuthorScenario(profile)) {
    return NextResponse.json({ error: profile.role === "teacher" ? "Teacher authoring chưa được bật." : "Không có quyền phân bổ kịch bản ôn tập." }, { status: 403 });
  }

  const body = await request.json() as Record<string, unknown>;
  const moduleId = typeof body.moduleId === "string" ? body.moduleId.trim() : "";
  if (!isScenarioParametersModuleId(moduleId) || !Array.isArray(body.scenarioIds)) {
    return NextResponse.json({ error: "Danh sách kịch bản không hợp lệ." }, { status: 400 });
  }

  const expectedRevision = body.expectedRevision;
  if (typeof expectedRevision !== "number" || !Number.isInteger(expectedRevision) || expectedRevision < 0) {
    return NextResponse.json({ error: "Cần expectedRevision của phiên đọc thư viện Ôn tập." }, { status: 400 });
  }

  const response = await putScenarioLibrary(jsonRequestBody(request, {
    ...body,
    moduleId,
    libraryKind: "practice",
    expectedRevision,
  }));
  const payload = await response.json() as Record<string, unknown>;
  if (!response.ok) return NextResponse.json(payload, { status: response.status });
  return NextResponse.json({
    success: true,
    assignedCount: payload.publishedCount ?? 0,
    libraryRevision: payload.libraryRevision ?? expectedRevision,
  });
}
