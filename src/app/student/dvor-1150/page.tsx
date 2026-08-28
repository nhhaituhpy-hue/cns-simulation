import type { Metadata } from "next";
import { Dvor1150PmdtLayout } from "@/modules/devices/dvor-1150";

export const metadata: Metadata = {
  title: "Ôn tập DVOR 1150",
};

export default function Dvor1150StudentPage() {
  return (
    <div className="pmdt-classic-page dvor1150-pmdt-page">
      <Dvor1150PmdtLayout mode="student" />
    </div>
  );
}
