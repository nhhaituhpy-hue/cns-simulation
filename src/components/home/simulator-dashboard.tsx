import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { SIMULATOR_MODULES } from "@/modules/core/registry";
import {
  createSimulatorShowcaseItem,
} from "./simulator-showcase-data";
import { SimulatorShowcase } from "./simulator-showcase";

export function SimulatorDashboard() {
  const simulators = SIMULATOR_MODULES.map(createSimulatorShowcaseItem);

  return (
    <div className="cns-landing min-h-[calc(100dvh-4.5rem)] overflow-hidden bg-[#061b25] text-white">
      <header className="cns-landing__hero relative isolate flex min-h-[38rem] items-end overflow-hidden px-5 pb-16 pt-28 sm:min-h-[43rem] sm:px-8 sm:pb-20 lg:min-h-[48rem] lg:px-12 lg:pb-24 xl:px-16">
        <Image
          src="/images/cns-image.webp"
          alt=""
          fill
          preload
          sizes="100vw"
          className="cns-landing__hero-image -z-30 scale-105 object-cover object-[62%_center]"
        />
        <div className="cns-landing__hero-overlay absolute inset-0 -z-20" />
        <div className="cns-landing__hero-grid absolute inset-0 -z-10" />

        <div className="relative mx-auto w-full max-w-[1320px]">
          <div className="max-w-3xl">
            <p className="text-[15px] font-bold uppercase tracking-[0.22em] text-[#e3212d]">
              TRUNG TÂM BẢO ĐẢM KỸ THUẬT
            </p>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-100/80">
              CNS Simulation Lab
            </p>
            <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-[0.95] tracking-[-0.065em] text-white sm:text-6xl lg:text-7xl">
              Huấn luyện thực hành
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-100 sm:text-lg sm:leading-8">
              Đánh giá năng lực qua tình huống thực tế.
            </p>
            <Link
              href="/about"
              className="mt-8 inline-flex h-11 items-center gap-2 rounded-full border border-white/35 bg-white/10 px-5 text-sm font-bold text-white backdrop-blur-sm transition-[background-color,border-color,transform] hover:-translate-y-0.5 hover:border-cyan-100 hover:bg-cyan-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100 focus-visible:ring-offset-2 focus-visible:ring-offset-[#061b25] active:translate-y-0 motion-reduce:transform-none"
            >
              More <ArrowRight aria-hidden size={18} weight="bold" />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative z-10 -mt-10 px-4 pb-16 sm:-mt-14 sm:px-6 lg:px-10 lg:pb-24 xl:px-12">
        <div className="mx-auto max-w-[1320px] rounded-[2rem] border border-white/10 bg-[#082630]/95 p-5 shadow-[0_2rem_7rem_rgba(0,0,0,0.28)] backdrop-blur-sm sm:p-8 lg:p-10">
          <SimulatorShowcase simulators={simulators} />
        </div>
      </section>
    </div>
  );
}
