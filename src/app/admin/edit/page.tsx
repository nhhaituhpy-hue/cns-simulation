import { redirect } from "next/navigation";

interface LegacyEditAdsbScenarioPageProps {
  searchParams: Promise<{ id?: string | string[] }>;
}

export default async function LegacyEditAdsbScenarioPage({
  searchParams,
}: LegacyEditAdsbScenarioPageProps) {
  const params = await searchParams;
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const suffix = id ? `?id=${encodeURIComponent(id)}` : "";
  redirect(`/authoring/ads-b/edit${suffix}`);
}
