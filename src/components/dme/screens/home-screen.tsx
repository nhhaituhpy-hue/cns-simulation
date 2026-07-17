"use client";

export function HomeScreen() {
  return (
    <section className="grid min-h-full place-items-center p-8 text-center" aria-labelledby="dme-home-title">
      <div>
        <div id="dme-home-title" className="inline-flex items-baseline text-5xl font-black tracking-[-0.07em]" aria-label="ATTECH">
          <span className="text-[#ef4444]">A</span>
          <span className="text-[#1e40af]">TTECH</span>
        </div>
        <p className="mt-6 text-lg font-semibold text-[#e2e8f0]">
          Phần mềm mô phỏng khai thác thiết bị DME
        </p>
        <p className="mt-2 text-sm text-[#94a3b8]">Dual DME Model 1118A/1119A</p>
      </div>
    </section>
  );
}

