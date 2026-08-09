import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import {
  simulateDvorConfigPatches,
  type DvorConfigPatch,
} from "@/lib/dvor1150a";

export const dynamic = "force-dynamic";

function isDvorConfigValue(value: unknown): value is DvorConfigPatch["value"] {
  return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function isPatch(value: unknown): value is DvorConfigPatch {
  if (!value || typeof value !== "object") return false;
  const patch = value as Record<string, unknown>;
  return typeof patch.fieldId === "string" && isDvorConfigValue(patch.value);
}

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const result = simulateDvorConfigPatches();
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  try {
    const payload = (await request.json()) as unknown;
    const rawPatches: unknown = Array.isArray(payload)
      ? payload
      : payload && typeof payload === "object" && Array.isArray((payload as Record<string, unknown>).patches)
        ? (payload as Record<string, unknown>).patches
        : isPatch(payload)
          ? [payload]
          : null;
    if (!Array.isArray(rawPatches) || !rawPatches.every(isPatch)) {
      return NextResponse.json(
        { error: "Payload phải là patch { fieldId, value }, mảng patch hoặc { patches: [...] }." },
        { status: 400 },
      );
    }

    const result = simulateDvorConfigPatches(rawPatches as readonly DvorConfigPatch[]);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể mô phỏng cấu hình DVOR 1150A." },
      { status: 400 },
    );
  }
}
