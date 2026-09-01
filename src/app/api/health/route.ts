import { queryDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "cache-control": "no-store",
};

export async function GET() {
  try {
    await queryDatabase("select 1");
    return Response.json(
      { status: "ok", database: "ok" },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    console.error("Health check failed", error);
    return Response.json(
      { status: "unavailable", database: "unavailable" },
      { status: 503, headers: noStoreHeaders },
    );
  }
}
