export const DVOR_SIDEBAND_ASSEMBLIES = {
  "1a4a1": { tx: "tx1", first: 0 },
  "1a4a2": { tx: "tx1", first: 2 },
  "1a4a6": { tx: "tx2", first: 0 },
  "1a4a7": { tx: "tx2", first: 2 },
} as const;

export type DvorSidebandAssemblyId = keyof typeof DVOR_SIDEBAND_ASSEMBLIES;
export type DvorSidebandTrimId = "R1" | "R2" | "R3" | "R4" | "R5" | "R6";
export type DvorSidebandTrims = Record<DvorSidebandAssemblyId, Record<DvorSidebandTrimId, number>>;
export const DVOR_SIDEBAND_TRIM_IDS: readonly DvorSidebandTrimId[] = ["R1", "R2", "R3", "R4", "R5", "R6"];

export function initialDvorSidebandTrims(): DvorSidebandTrims {
  const trims = () => ({ R1: 0, R2: 0, R3: 0, R4: 0, R5: 0, R6: 0 });
  return { "1a4a1": trims(), "1a4a2": trims(), "1a4a6": trims(), "1a4a7": trims() };
}

export function dvorSidebandAssembly(occurrenceId: string) {
  const id = occurrenceId.replace(/^sideband-/, "") as DvorSidebandAssemblyId;
  return Object.hasOwn(DVOR_SIDEBAND_ASSEMBLIES, id) ? { id, ...DVOR_SIDEBAND_ASSEMBLIES[id] } : null;
}

export function dvorSidebandFactors(trims: DvorSidebandTrims | undefined, tx: "tx1" | "tx2", channel: number) {
  const assembly = Object.entries(DVOR_SIDEBAND_ASSEMBLIES).find(([, entry]) => entry.tx === tx && entry.first === channel - channel % 2);
  const angles = assembly ? trims?.[assembly[0] as DvorSidebandAssemblyId] : undefined;
  return {
    power: 1 + (angles?.[channel % 2 === 0 ? "R3" : "R6"] ?? 0) / 1800,
    indication: 1 + (angles?.[channel % 2 === 0 ? "R2" : "R5"] ?? 0) / 900,
  };
}
