/**
 * Conditional digital keyer projection, not a waveform/RF or timing model.
 * Source: Model 1150A Rev. E §3.6.8.4.1/Fig. 3-50 (PDF173),
 * §9.7.13.1 (PDF240). Full source hashes/limits are in the private audit note.
 */
export interface DvorKeyerConfiguration {
  keyerMode?: "disabled" | "external";
  keyerInputLevel?: "Active High/Open" | "Active Low/Closed";
  windowedKeyingInput?: boolean;
  selfKeyOnLoss?: boolean;
  shutdownOnLoss?: boolean;
  restartWhenResumed?: boolean;
  externalKeying?: "Disabled" | "Enabled" | "Windowed";
  suppressOnShutdown?: boolean;
  /** Explicit training alternate; the bounded manual does not define its code. */
  standbyIdentOverride?: string;
}

export interface DvorKeyerNominal extends DvorKeyerConfiguration {
  mainIdentCode: string;
  standbyIdentCode: string;
}

export type DvorExternalKeyingSignal =
  | { state: "lost" }
  | {
      state: "present" | "resumed";
      level: "high/open" | "low/closed";
      /** Supplied observation; never decode an ident from a logical contact. */
      decodedIdentCode?: string;
    };

export interface DvorKeyerContext {
  /** Operating role, not physical TX number. */
  role: "main" | "standby";
  externalSignal?: DvorExternalKeyingSignal;
  /** Explicit current state; this helper never performs a shutdown/restart. */
  shutdownCause?: "keying-loss" | "other";
}

export interface DvorKeyerProjection {
  configuration: Required<Omit<DvorKeyerConfiguration, "standbyIdentOverride">> & {
    standbyIdentOverride: string | null;
  };
  selectedIdentCode: string | null;
  effectiveIdentCode: string | null;
  identStatus: "self-keyed" | "external-keyed" | "external-code-unspecified"
    | "awaiting-external-signal" | "external-signal-lost" | "standby-code-unspecified"
    | "conflicting-loss-actions" | "shutdown";
  identSource: "self" | "external" | null;
  externalSignalStatus: "ignored" | "unspecified" | "present" | "lost" | "resumed";
  inputAsserted: boolean | null;
  inputInterpretation: "self-keyed" | "direct-keying" | "windowed-keying";
  selfKeyRequested: boolean;
  shutdownRequested: boolean;
  restartRequested: boolean;
  lossActionConflict: boolean;
  externalOutput: {
    mode: "Disabled" | "Enabled" | "Windowed";
    /** Permitted output only: not a generated pulse or measured contact. */
    available: boolean;
    suppressed: boolean;
  };
}

export function projectDvorKeyer(
  nominal: DvorKeyerNominal,
  context: DvorKeyerContext,
): DvorKeyerProjection {
  const external = nominal.keyerMode === "external";
  const signal = external ? context.externalSignal : undefined;
  const received = signal && signal.state !== "lost" ? signal : undefined;
  const keyerInputLevel = nominal.keyerInputLevel ?? "Active Low/Closed";
  const externalCode = received?.decodedIdentCode ?? null;
  const standbyIdentOverride = nominal.standbyIdentOverride ?? null;
  const selectedIdentCode = context.role === "main" || nominal.standbyIdentCode === "Same as Main Ident"
    ? nominal.mainIdentCode : standbyIdentOverride;
  const lost = signal?.state === "lost";
  const selfKeyRequested = lost && nominal.selfKeyOnLoss === true;
  const shutdownRequested = lost && nominal.shutdownOnLoss === true;
  const lossActionConflict = selfKeyRequested && shutdownRequested;
  let effectiveIdentCode = external ? externalCode : selectedIdentCode;
  let identStatus: DvorKeyerProjection["identStatus"] = !external ? "self-keyed"
    : !signal ? "awaiting-external-signal"
    : externalCode === null ? "external-code-unspecified" : "external-keyed";
  let identSource: DvorKeyerProjection["identSource"] = !external ? "self" : received ? "external" : null;
  if (lost) {
    effectiveIdentCode = selfKeyRequested && !shutdownRequested ? selectedIdentCode : null;
    identSource = selfKeyRequested && !shutdownRequested ? "self" : null;
    identStatus = lossActionConflict ? "conflicting-loss-actions" : shutdownRequested ? "shutdown"
      : selfKeyRequested ? "self-keyed" : "external-signal-lost";
  }
  if (identSource === "self" && selectedIdentCode === null) {
    identSource = null;
    identStatus = "standby-code-unspecified";
  }
  if (context.shutdownCause) {
    effectiveIdentCode = null;
    identSource = null;
    identStatus = "shutdown";
  }
  const externalKeying = nominal.externalKeying ?? "Disabled";
  const suppressed = externalKeying !== "Disabled" && nominal.suppressOnShutdown === true
    && (context.shutdownCause !== undefined || (shutdownRequested && !lossActionConflict));
  return {
    configuration: {
      keyerMode: nominal.keyerMode ?? "disabled",
      keyerInputLevel,
      windowedKeyingInput: nominal.windowedKeyingInput ?? false,
      selfKeyOnLoss: nominal.selfKeyOnLoss ?? false,
      shutdownOnLoss: nominal.shutdownOnLoss ?? false,
      restartWhenResumed: nominal.restartWhenResumed ?? false,
      externalKeying,
      suppressOnShutdown: nominal.suppressOnShutdown ?? false,
      standbyIdentOverride,
    },
    selectedIdentCode,
    effectiveIdentCode,
    identStatus,
    identSource,
    externalSignalStatus: !external ? "ignored" : signal?.state ?? "unspecified",
    inputAsserted: received ? received.level === (keyerInputLevel === "Active High/Open" ? "high/open" : "low/closed") : null,
    inputInterpretation: !external ? "self-keyed" : nominal.windowedKeyingInput ? "windowed-keying" : "direct-keying",
    selfKeyRequested,
    shutdownRequested,
    restartRequested: external && signal?.state === "resumed"
      && nominal.restartWhenResumed === true && context.shutdownCause === "keying-loss",
    lossActionConflict,
    externalOutput: { mode: externalKeying, available: externalKeying !== "Disabled" && !suppressed, suppressed },
  };
}
