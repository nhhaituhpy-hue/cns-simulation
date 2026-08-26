import { redirect } from "next/navigation";

/**
 * Legacy DME authoring entry point. Keep the route so existing bookmarks do
 * not break, but send operational users to the standalone Scenario Parameters
 * simulator. Legacy rows remain available through the read-only submissions
 * review route/API and are not deleted here.
 */
export default function DmeAdminDashboardPage() {
  redirect("/simulator/dme-1119a");
}
