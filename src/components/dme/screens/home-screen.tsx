"use client";

/**
 * PMDT home screen (Stage 4 G18). This used to render the DVOR 1150A logo
 * asset; the repo carries no DME/SELEX image asset, so the home screen
 * shows a text wordmark consistent with the PMDT About dialog
 * (SELEX ES, P/N 978178-0080 family).
 */
export function HomeScreen() {
  return (
    <section className="pmdt-home-screen dme-pmdt-home-screen" aria-label="Selex ES">
      <div id="dme-home-title" className="pmdt-selex-logo-text">
        <span className="pmdt-selex-logo-text-brand">SELEX ES</span>
        <span className="pmdt-selex-logo-text-model">DME 1119A</span>
        <span className="pmdt-selex-logo-text-sub">Portable Maintenance Data Terminal</span>
      </div>
    </section>
  );
}
