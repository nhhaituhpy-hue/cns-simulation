"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { CaretLeft } from "@phosphor-icons/react/dist/csr/CaretLeft";
import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import { MouseSimple } from "@phosphor-icons/react/dist/csr/MouseSimple";
import { motion, useReducedMotion } from "motion/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { SimulatorShowcaseItem } from "./simulator-showcase-data";

type SimulatorShowcaseProps = {
  simulators: readonly SimulatorShowcaseItem[];
};

function circularDistance(index: number, selectedIndex: number, total: number) {
  const rawDistance = index - selectedIndex;
  const half = Math.floor(total / 2);

  if (rawDistance > half) return rawDistance - total;
  if (rawDistance < -half) return rawDistance + total;
  return rawDistance;
}

function orbitMotion(distance: number) {
  const absoluteDistance = Math.abs(distance);

  return {
    x: distance * 190,
    y: absoluteDistance === 0 ? -22 : absoluteDistance === 1 ? 8 : absoluteDistance === 2 ? 34 : 54,
    scale: absoluteDistance === 0 ? 1.06 : absoluteDistance === 1 ? 0.88 : 0.72,
    rotateY: distance * -12,
    opacity: absoluteDistance > 3 ? 0 : absoluteDistance === 3 ? 0.22 : 1,
  };
}

export function SimulatorShowcase({ simulators }: SimulatorShowcaseProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const orbitRef = useRef<HTMLDivElement>(null);
  const wheelAccumulator = useRef(0);
  const reduceMotion = Boolean(useReducedMotion());
  const simulatorCount = simulators.length;

  const rotate = useCallback((direction: number) => {
    if (simulatorCount === 0) return;

    setSelectedIndex((currentIndex) => {
      const nextIndex = currentIndex + direction;
      return (nextIndex + simulatorCount) % simulatorCount;
    });
  }, [simulatorCount]);

  useEffect(() => {
    const orbitElement = orbitRef.current;
    if (!orbitElement || simulatorCount === 0) return;

    function handleNativeWheel(event: WheelEvent) {
      const strongestDelta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY;

      if (Math.abs(strongestDelta) < 1) return;

      event.preventDefault();
      wheelAccumulator.current += strongestDelta;

      if (Math.abs(wheelAccumulator.current) < 40) return;

      rotate(wheelAccumulator.current > 0 ? 1 : -1);
      wheelAccumulator.current = 0;
    }

    orbitElement.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => orbitElement.removeEventListener("wheel", handleNativeWheel);
  }, [rotate, simulatorCount]);

  if (simulatorCount === 0) return null;

  const selected = simulators[selectedIndex];
  const panelId = "simulator-panel-" + selected.id;

  function handleKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      rotate(-1);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      rotate(1);
    }

    if (event.key === "Home") {
      event.preventDefault();
      setSelectedIndex(0);
    }

    if (event.key === "End") {
      event.preventDefault();
      setSelectedIndex(simulators.length - 1);
    }
  }

  return (
    <div className="cns-showcase">
      <div className="mb-6 flex flex-col gap-4 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="cns-showcase__eyebrow">08 mô phỏng CNS</p>
          <h2
            id="simulator-showcase-heading"
            className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl"
          >
            Khám phá thiết bị mô phỏng
          </h2>
        </div>
        <p className="flex max-w-xs items-center gap-2 text-sm leading-5 text-slate-300">
          <MouseSimple aria-hidden size={19} weight="light" />
          Kéo, lăn chuột hoặc dùng phím mũi tên để chọn thiết bị.
        </p>
      </div>

      <div
        ref={orbitRef}
        className="cns-showcase__orbit relative"
        aria-labelledby="simulator-showcase-heading"
        onKeyDown={handleKeyboard}
      >
        <div
          role="tablist"
          aria-label="Danh sách simulator CNS"
          className="cns-showcase__track relative mx-auto"
          style={{ perspective: "1000px" }}
        >
          {simulators.map((simulator, index) => {
            const distance = circularDistance(index, selectedIndex, simulators.length);
            const selectedCard = index === selectedIndex;
            const cardId = "simulator-tab-" + simulator.id;
            const hidden = Math.abs(distance) > 3;

            return (
              <motion.div
                key={simulator.id}
                className={[
                  "cns-showcase__card absolute left-1/2 top-10 -ml-[6.75rem] h-72 w-[13.5rem] overflow-hidden rounded-[1.4rem] border text-left shadow-[0_1.5rem_3.75rem_rgba(0,0,0,0.38)] sm:-ml-32 sm:h-[21rem] sm:w-64",
                  selectedCard
                    ? "border-cyan-100/80 bg-slate-950"
                    : "border-white/15 bg-slate-950 hover:border-cyan-100/60",
                ].join(" ")}
                animate={orbitMotion(distance)}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 280, damping: 26, mass: 0.75 }
                }
                style={{
                  zIndex: 20 - Math.abs(distance),
                  pointerEvents: hidden ? "none" : "auto",
                }}
                drag={reduceMotion ? false : "x"}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.12}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -44) rotate(1);
                  if (info.offset.x > 44) rotate(-1);
                }}
              >
                <button
                  id={cardId}
                  type="button"
                  role="tab"
                  tabIndex={selectedCard ? 0 : -1}
                  aria-selected={selectedCard}
                  aria-controls={panelId}
                  aria-label={"Chọn mô phỏng " + simulator.shortName}
                  onClick={() => setSelectedIndex(index)}
                  className="absolute inset-0 z-10 w-full rounded-[1.4rem] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-100"
                >
                  <div className="absolute inset-0 bg-slate-950">
                    <Image
                      src={simulator.cardImage}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 216px, 256px"
                      className={[
                        simulator.cardImageFit === "cover"
                          ? "object-cover"
                          : "object-contain p-7 sm:p-9",
                      ].join(" ")}
                    />
                  </div>
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,12,18,0.1)_24%,rgba(2,12,18,0.2)_45%,rgba(2,12,18,0.94)_100%)]" />
                  <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-100/80">
                      {simulator.categoryLabel}
                    </span>
                    <span className="mt-2 block text-xl font-semibold tracking-[-0.04em] text-white sm:text-2xl">
                      {simulator.shortName}
                    </span>
                    <span
                      className={[
                        "mt-2 block text-[10px] font-bold uppercase tracking-[0.14em]",
                        simulator.status === "available" ? "text-emerald-200" : "text-amber-200",
                      ].join(" ")}
                    >
                      {simulator.status === "available" ? "Sẵn sàng thực hành" : "Đang hoàn thiện"}
                    </span>
                  </div>
                </button>

                {simulator.href ? (
                  <Link
                    href={simulator.href}
                    tabIndex={selectedCard ? 0 : -1}
                    aria-label={"Mở simulator " + simulator.shortName}
                    onPointerDown={(event) => event.stopPropagation()}
                    className="absolute left-1/2 top-1/2 z-20 inline-flex h-8 -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-cyan-100/40 bg-slate-950/80 px-3 text-[11px] font-bold text-cyan-50 shadow-lg backdrop-blur-sm transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100 active:scale-95 motion-reduce:transform-none"
                  >
                    Mở simulator <ArrowRight aria-hidden size={14} weight="bold" />
                  </Link>
                ) : (
                  <span className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-amber-100/25 bg-slate-950/75 px-3 py-2 text-[11px] font-bold text-amber-100/90 backdrop-blur-sm">
                    Đang hoàn thiện
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="mt-2 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => rotate(-1)}
            className="cns-showcase__control"
            aria-label="Chọn simulator trước"
            title="Simulator trước"
          >
            <CaretLeft aria-hidden size={21} weight="bold" />
          </button>
          <span className="min-w-24 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {String(selectedIndex + 1).padStart(2, "0")} / {String(simulators.length).padStart(2, "0")}
          </span>
          <button
            type="button"
            onClick={() => rotate(1)}
            className="cns-showcase__control"
            aria-label="Chọn simulator tiếp theo"
            title="Simulator tiếp theo"
          >
            <CaretRight aria-hidden size={21} weight="bold" />
          </button>
        </div>
      </div>

      <section
        id={panelId}
        role="tabpanel"
        aria-labelledby={"simulator-tab-" + selected.id}
        className="cns-showcase__detail mt-12 grid overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/70 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]"
      >
        <figure className="relative min-h-[21rem] overflow-hidden border-b border-white/10 bg-slate-900/80 lg:min-h-[31rem] lg:border-b-0 lg:border-r">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(34,211,238,0.15),transparent_50%)]" />
          <Image
            src={selected.image}
            alt={selected.imageAlt}
            fill
            sizes="(max-width: 1024px) 100vw, 48vw"
            className={[
              "relative z-10 p-6 sm:p-9",
              selected.imageFit === "cover" ? "object-cover" : "object-contain",
            ].join(" ")}
          />
        </figure>

        <div className="flex flex-col p-7 sm:p-10">
          <p className="cns-showcase__eyebrow">Nội dung thực hành</p>
          <h3 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-white">
            {selected.shortName}
          </h3>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
            {selected.summary}
          </p>

          <ul className="mt-7 grid gap-3 text-sm leading-6 text-slate-200">
            {selected.keyFacts.map((fact) => (
              <li key={fact} className="flex gap-3">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-cyan-300" />
                <span>{fact}</span>
              </li>
            ))}
          </ul>

          <div className="mt-auto pt-9">
            {selected.href ? (
              <Link
                href={selected.href}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-cyan-200 px-5 text-sm font-bold text-slate-950 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:translate-y-0 motion-reduce:transform-none"
              >
                Mở simulator <ArrowRight aria-hidden size={18} weight="bold" />
              </Link>
            ) : (
              <span className="inline-flex h-11 items-center rounded-full border border-amber-100/25 bg-amber-100/10 px-5 text-sm font-semibold text-amber-100">
                Nội dung đang hoàn thiện
              </span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
