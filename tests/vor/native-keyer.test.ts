import { describe, expect, it } from "vitest";
import { projectDvorKeyer, type DvorExternalKeyingSignal, type DvorKeyerContext, type DvorKeyerNominal } from "../../src/lib/dvor1150a/keyer";

const legacyNominal = {
  mainIdentCode: "TST",
  standbyIdentCode: "Same as Main Ident",
  keyerMode: "disabled",
} as const;

describe("1150A source-bounded keyer projection", () => {
  it("preserves legacy self-keying and all previously hardcoded defaults", () => {
    expect(projectDvorKeyer(legacyNominal, { role: "main" })).toEqual({
      configuration: {
        keyerMode: "disabled",
        keyerInputLevel: "Active Low/Closed",
        windowedKeyingInput: false,
        selfKeyOnLoss: false,
        shutdownOnLoss: false,
        restartWhenResumed: false,
        externalKeying: "Disabled",
        suppressOnShutdown: false,
        standbyIdentOverride: null,
      },
      selectedIdentCode: "TST",
      effectiveIdentCode: "TST",
      identStatus: "self-keyed",
      identSource: "self",
      externalSignalStatus: "ignored",
      inputAsserted: null,
      inputInterpretation: "self-keyed",
      selfKeyRequested: false,
      shutdownRequested: false,
      restartRequested: false,
      lossActionConflict: false,
      externalOutput: { mode: "Disabled", available: false, suppressed: false },
    });
  });

  it("does not invent an external ident when no signal stimulus is supplied", () => {
    const result = projectDvorKeyer({ ...legacyNominal, keyerMode: "external" }, { role: "main" });
    expect(result.configuration.keyerMode).toBe("external");
    expect(result).toMatchObject({
      selectedIdentCode: "TST", effectiveIdentCode: null, identSource: null,
      identStatus: "awaiting-external-signal", externalSignalStatus: "unspecified",
      inputAsserted: null, inputInterpretation: "direct-keying", shutdownRequested: false,
    });
  });

  it.each([
    ["Active High/Open", "high/open", true],
    ["Active High/Open", "low/closed", false],
    ["Active Low/Closed", "high/open", false],
    ["Active Low/Closed", "low/closed", true],
  ] as const)("%s interprets %s contact as %s without inferring signal loss", (keyerInputLevel, level, asserted) => {
    const result = projectDvorKeyer({ ...legacyNominal, keyerMode: "external", keyerInputLevel }, {
      role: "main", externalSignal: { state: "present", level, decodedIdentCode: "EXT" },
    });
    expect(result.configuration.keyerInputLevel).toBe(keyerInputLevel);
    expect(result).toMatchObject({
      effectiveIdentCode: "EXT", identSource: "external", identStatus: "external-keyed",
      externalSignalStatus: "present", inputAsserted: asserted, shutdownRequested: false,
    });
  });

  it("does not manufacture a decoded ident from a present logical contact", () => {
    expect(projectDvorKeyer({ ...legacyNominal, keyerMode: "external" }, {
      role: "main", externalSignal: { state: "present", level: "low/closed" },
    })).toMatchObject({ effectiveIdentCode: null, identStatus: "external-code-unspecified", identSource: "external" });
  });

  it.each([false, true])("reports windowed input=%s without inventing a window or a code", (windowedKeyingInput) => {
    const result = projectDvorKeyer({ ...legacyNominal, keyerMode: "external", windowedKeyingInput }, {
      role: "main", externalSignal: { state: "present", level: "low/closed" },
    });
    expect(result.configuration.windowedKeyingInput).toBe(windowedKeyingInput);
    expect(result.inputInterpretation).toBe(windowedKeyingInput ? "windowed-keying" : "direct-keying");
    expect(result.effectiveIdentCode).toBeNull();
    expect(result.identStatus).toBe("external-code-unspecified");
  });

  it.each([
    [false, false, "external-signal-lost", null],
    [true, false, "self-keyed", "TST"],
    [false, true, "shutdown", null],
    [true, true, "conflicting-loss-actions", null],
  ] as const)("loss with self-key=%s shutdown=%s yields %s without inventing precedence", (selfKeyOnLoss, shutdownOnLoss, status, code) => {
    const result = projectDvorKeyer({ ...legacyNominal, keyerMode: "external", selfKeyOnLoss, shutdownOnLoss }, {
      role: "main", externalSignal: { state: "lost" },
    });
    expect(result.configuration).toMatchObject({ selfKeyOnLoss, shutdownOnLoss });
    expect(result).toMatchObject({
      identStatus: status, effectiveIdentCode: code, externalSignalStatus: "lost", inputAsserted: null,
      selfKeyRequested: selfKeyOnLoss, shutdownRequested: shutdownOnLoss,
      lossActionConflict: selfKeyOnLoss && shutdownOnLoss, restartRequested: false,
    });
    expect(result.identSource).toBe(selfKeyOnLoss && !shutdownOnLoss ? "self" : null);
  });

  it.each(["unspecified", "present"] as const)("loss options do not fabricate a loss from %s input", (state) => {
    const result = projectDvorKeyer({ ...legacyNominal, keyerMode: "external", selfKeyOnLoss: true, shutdownOnLoss: true }, {
      role: "main", ...(state === "present" ? { externalSignal: { state, level: "high/open" as const } } : {}),
    });
    expect(result).toMatchObject({ selfKeyRequested: false, shutdownRequested: false, lossActionConflict: false });
  });

  it.each([
    [true, "resumed", "keying-loss", true],
    [false, "resumed", "keying-loss", false],
    [true, "present", "keying-loss", false],
    [true, "resumed", "other", false],
    [true, "resumed", undefined, false],
  ] as const)("restart=%s signal=%s shutdownCause=%s requests restart=%s", (restartWhenResumed, state, shutdownCause, requested) => {
    const result = projectDvorKeyer({ ...legacyNominal, keyerMode: "external", restartWhenResumed }, {
      role: "main", shutdownCause, externalSignal: { state, level: "low/closed", decodedIdentCode: "EXT" },
    });
    expect(result.configuration.restartWhenResumed).toBe(restartWhenResumed);
    expect(result.restartRequested).toBe(requested);
    expect(result.shutdownRequested).toBe(false);
    expect(result.effectiveIdentCode).toBe(shutdownCause ? null : "EXT");
    expect(result.identStatus).toBe(shutdownCause ? "shutdown" : "external-keyed");
  });

  it("resumes external identification after the caller acknowledges a keying-loss shutdown", () => {
    const nominal = { ...legacyNominal, keyerMode: "external", shutdownOnLoss: true, restartWhenResumed: true } as const;
    const lost = projectDvorKeyer(nominal, { role: "main", externalSignal: { state: "lost" } });
    const resumed = projectDvorKeyer(nominal, {
      role: "main", shutdownCause: "keying-loss",
      externalSignal: { state: "resumed", level: "low/closed", decodedIdentCode: "EXT" },
    });
    const acknowledged = projectDvorKeyer(nominal, {
      role: "main", externalSignal: { state: "present", level: "low/closed", decodedIdentCode: "EXT" },
    });
    expect(lost.shutdownRequested).toBe(true);
    expect(resumed).toMatchObject({ restartRequested: true, identStatus: "shutdown", effectiveIdentCode: null });
    expect(acknowledged).toMatchObject({ restartRequested: false, identStatus: "external-keyed", effectiveIdentCode: "EXT" });
  });

  it.each(["disabled", "external"] as const)("an explicit unrelated shutdown suppresses %s ident", (keyerMode) => {
    expect(projectDvorKeyer({ ...legacyNominal, keyerMode }, {
      role: "main", shutdownCause: "other",
      externalSignal: { state: "present", level: "low/closed", decodedIdentCode: "EXT" },
    })).toMatchObject({ effectiveIdentCode: null, identStatus: "shutdown", identSource: null, restartRequested: false });
  });

  it.each(["Disabled", "Enabled", "Windowed"] as const)("projects external output %s independently of input source", (externalKeying) => {
    for (const keyerMode of ["disabled", "external"] as const) {
      const result = projectDvorKeyer({ ...legacyNominal, keyerMode, externalKeying }, { role: "main" });
      expect(result.configuration.externalKeying).toBe(externalKeying);
      expect(result.externalOutput).toEqual({ mode: externalKeying, available: externalKeying !== "Disabled", suppressed: false });
    }
  });

  it.each([false, true])("suppress-on-shutdown=%s controls output permission only", (suppressOnShutdown) => {
    const nominal = { ...legacyNominal, externalKeying: "Enabled", suppressOnShutdown } as const;
    const running = projectDvorKeyer(nominal, { role: "main" });
    const shutdown = projectDvorKeyer(nominal, { role: "main", shutdownCause: "other" });
    expect(shutdown.configuration.suppressOnShutdown).toBe(suppressOnShutdown);
    expect(running.externalOutput).toEqual({ mode: "Enabled", available: true, suppressed: false });
    expect(shutdown.externalOutput).toEqual({ mode: "Enabled", available: !suppressOnShutdown, suppressed: suppressOnShutdown });
    expect(shutdown.effectiveIdentCode).toBeNull();
  });

  it("marks the external output suppressed on an unambiguous requested loss shutdown", () => {
    expect(projectDvorKeyer({
      ...legacyNominal, keyerMode: "external", shutdownOnLoss: true,
      externalKeying: "Windowed", suppressOnShutdown: true,
    }, { role: "main", externalSignal: { state: "lost" } }).externalOutput)
      .toEqual({ mode: "Windowed", available: false, suppressed: true });
  });

  it("does not call a disabled output suppressed merely because the transmitter is shut down", () => {
    expect(projectDvorKeyer({ ...legacyNominal, suppressOnShutdown: true }, { role: "main", shutdownCause: "other" }).externalOutput)
      .toEqual({ mode: "Disabled", available: false, suppressed: false });
  });

  it("uses the main code whenever either physical transmitter is serving the main role", () => {
    expect(projectDvorKeyer({ ...legacyNominal, standbyIdentCode: "Different Ident", standbyIdentOverride: "ALT" }, {
      role: "main",
    })).toMatchObject({ selectedIdentCode: "TST", effectiveIdentCode: "TST", identStatus: "self-keyed" });
  });

  it("Same as Main Ident ignores a stored alternate in standby role", () => {
    expect(projectDvorKeyer({ ...legacyNominal, standbyIdentOverride: "ALT" }, {
      role: "standby",
    })).toMatchObject({ selectedIdentCode: "TST", effectiveIdentCode: "TST" });
  });

  it("does not treat the Different Ident selector label as an actual station code", () => {
    expect(projectDvorKeyer({ ...legacyNominal, standbyIdentCode: "Different Ident" }, {
      role: "standby",
    })).toMatchObject({ selectedIdentCode: null, effectiveIdentCode: null, identStatus: "standby-code-unspecified", identSource: null });
  });

  it("uses only an explicitly supplied training alternate for the standby role", () => {
    const nominal = { ...legacyNominal, standbyIdentCode: "Different Ident", standbyIdentOverride: "Ab1" };
    const standby = projectDvorKeyer(nominal, { role: "standby" });
    const mainAfterTransfer = projectDvorKeyer(nominal, { role: "main" });
    expect(standby.configuration.standbyIdentOverride).toBe("Ab1");
    expect(standby).toMatchObject({ selectedIdentCode: "Ab1", effectiveIdentCode: "Ab1", identStatus: "self-keyed" });
    expect(mainAfterTransfer).toMatchObject({ selectedIdentCode: "TST", effectiveIdentCode: "TST" });
  });

  it("self-key fallback uses the standby role code rather than silently using main", () => {
    expect(projectDvorKeyer({
      ...legacyNominal, keyerMode: "external", selfKeyOnLoss: true,
      standbyIdentCode: "Different Ident", standbyIdentOverride: "ALT",
    }, { role: "standby", externalSignal: { state: "lost" } })).toMatchObject({
      effectiveIdentCode: "ALT", identSource: "self", identStatus: "self-keyed",
    });
  });

  it("an externally supplied decoded ident is independent of an unresolved standby alternate", () => {
    expect(projectDvorKeyer({ ...legacyNominal, keyerMode: "external", standbyIdentCode: "Different Ident" }, {
      role: "standby", externalSignal: { state: "present", level: "low/closed", decodedIdentCode: "EXT" },
    })).toMatchObject({ selectedIdentCode: null, effectiveIdentCode: "EXT", identSource: "external" });
  });

  // Compatibility/non-effect controls are expected to pass on first run.
  it.each([
    { state: "lost" },
    { state: "present", level: "high/open", decodedIdentCode: "EXT" },
    { state: "resumed", level: "low/closed", decodedIdentCode: "EXT" },
  ] satisfies DvorExternalKeyingSignal[])("self-keyed mode isolates external stimulus %j", (externalSignal) => {
    const result = projectDvorKeyer({
      ...legacyNominal, keyerInputLevel: "Active High/Open", windowedKeyingInput: true,
      selfKeyOnLoss: true, shutdownOnLoss: true, restartWhenResumed: true,
    }, { role: "main", externalSignal });
    expect(result).toMatchObject({
      effectiveIdentCode: "TST", identStatus: "self-keyed", identSource: "self",
      externalSignalStatus: "ignored", inputAsserted: null, inputInterpretation: "self-keyed",
      selfKeyRequested: false, shutdownRequested: false, restartRequested: false, lossActionConflict: false,
    });
  });

  it("omitting the entire optional configuration retains legacy defaults", () => {
    expect(projectDvorKeyer({ mainIdentCode: "TST", standbyIdentCode: "Same as Main Ident" }, { role: "main" }))
      .toEqual(projectDvorKeyer(legacyNominal, { role: "main" }));
  });

  it("projection leaves frozen native nominal configuration and stimulus unchanged", () => {
    const nominal = Object.freeze({
      ...legacyNominal, keyerMode: "external", keyerInputLevel: "Active High/Open", windowedKeyingInput: true,
      selfKeyOnLoss: true, shutdownOnLoss: false, restartWhenResumed: true,
      externalKeying: "Windowed", suppressOnShutdown: true,
      standbyIdentCode: "Different Ident", standbyIdentOverride: "ALT",
      outputPower: 70, identModulation: 8,
    } satisfies DvorKeyerNominal & { outputPower: number; identModulation: number });
    const context: DvorKeyerContext = Object.freeze({
      role: "standby", externalSignal: Object.freeze({ state: "lost" }),
    });
    const before = JSON.stringify({ nominal, context });
    const first = projectDvorKeyer(nominal, context);
    expect(first).toEqual(projectDvorKeyer(nominal, context));
    first.configuration.selfKeyOnLoss = false;
    first.externalOutput.available = false;
    expect(projectDvorKeyer(nominal, context).configuration.selfKeyOnLoss).toBe(true);
    expect(JSON.stringify({ nominal, context })).toBe(before);
    expect(nominal.outputPower).toBe(70);
    expect(nominal.identModulation).toBe(8);
  });

  it("self-keyed mode never restarts even if an explicit loss shutdown cause is supplied", () => {
    expect(projectDvorKeyer({ ...legacyNominal, restartWhenResumed: true }, {
      role: "main", shutdownCause: "keying-loss",
      externalSignal: { state: "resumed", level: "low/closed" },
    })).toMatchObject({ restartRequested: false, identStatus: "shutdown", externalSignalStatus: "ignored" });
  });
});
