"use client";

import Image from "next/image";

export function HomeScreen() {
  return (
    <section className="pmdt-home-screen dme-pmdt-home-screen" aria-label="Selex ES">
      <Image
        id="dme-home-title"
        className="pmdt-selex-logo"
        src="/images/dvor1150a-selex-home.png"
        alt="Selex ES"
        width={312}
        height={160}
      />
    </section>
  );
}
