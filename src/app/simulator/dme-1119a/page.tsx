import { ArrowLeft } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import type { Metadata } from "next";
import Link from "next/link";
import { Dme1119aPmdtLayout } from "@/modules/devices/dme-1119a";

export const metadata: Metadata = { title: "DME 1119A PMDT Simulator" };

export default function Dme1119aSimulatorPage() {
  return (
    <div className="relative bg-[#070a12]">
      <div className="flex h-8 items-center border-b border-[#334155] bg-[#0f172a] px-4">
        <Link href="/simulator" className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#cbd5e1] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa]">
          <ArrowLeft aria-hidden size={13} />
          Quay về Simulator
        </Link>
      </div>
      <Dme1119aPmdtLayout mode="preview" />
    </div>
  );
}
