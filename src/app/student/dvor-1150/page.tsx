import type { Metadata } from "next";
import { Dvor1150StudentDashboard } from "@/modules/devices/dvor-1150";

export const metadata: Metadata = {
  title: "Ôn tập DVOR 1150",
};

export default function Dvor1150StudentPage() {
  return (
    <div className="w-full max-w-none px-4 py-3 sm:px-6 lg:px-8 lg:py-4 xl:px-10 2xl:px-12">
      <Dvor1150StudentDashboard />
    </div>
  );
}
