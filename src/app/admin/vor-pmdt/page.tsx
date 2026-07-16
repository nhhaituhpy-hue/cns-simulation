import { ArrowLeft } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { PmdtLayout } from "@/components/vor/pmdt-layout";

export const metadata: Metadata = {
  title: "VOR PMDT Simulator",
};

export default function VorPmdtPage() {
  return (
    <div className="relative bg-[#070a12]">
      <div className="flex h-10 items-center border-b border-[#334155] bg-[#0f172a] px-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#cbd5e1] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa]"
        >
          <ArrowLeft aria-hidden size={15} />
          Quay về khu vực quản trị
        </Link>
      </div>
      <PmdtLayout mode="preview" />
    </div>
  );
}
