import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { normalize, resolve } from "node:path";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production" && process.env.PLAYGROUND_ENABLED !== "true") {
    return NextResponse.json({ error: "disabled" }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const rel = searchParams.get("path") ?? "";
  const base = resolve(process.cwd(), "src", "components");
  const target = resolve(base, rel);
  if (!target.startsWith(base + "\\") && !target.startsWith(base + "/")) {
    return NextResponse.json({ error: "invalid path" }, { status: 400 });
  }
  const normalized = normalize(target);
  try {
    const content = readFileSync(normalized, "utf8");
    return new NextResponse(content, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}