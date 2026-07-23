import { redirect } from "next/navigation";
import { TerminalSession } from "@/components/terminal/terminal-session";
import { getCurrentProfile } from "@/lib/auth/profile";

export default async function TerminalPage({
  searchParams,
}: {
  searchParams: Promise<{
    id?: string | string[];
    sensorId?: string | string[];
  }>;
}) {
  const [profile, query] = await Promise.all([
    getCurrentProfile(),
    searchParams,
  ]);
  if (!profile) redirect("/login");

  const scenarioId = Array.isArray(query.id) ? query.id[0] : query.id;
  const sensorId = Array.isArray(query.sensorId)
    ? query.sensorId[0]
    : query.sensorId;

  return (
    <TerminalSession
      scenarioId={scenarioId ?? ""}
      sensorId={sensorId}
      cacheOwnerId={profile.id}
    />
  );
}
