"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  isScenarioActionEvent,
  isScenarioEvidenceStats,
  type ScenarioActionEvent,
  type ScenarioEvidenceStats,
} from "@/lib/scenario-evidence";
import type { DmeAttemptEvent, DmePmdtData, DmeStudentAnswer } from "@/lib/dme-types";
import type { VorAttemptEvent, VorStudentAnswer } from "@/lib/vor-types";
import type { Dvor1150aConfig } from "@/lib/dvor1150a";
import type { DmeScenarioDiagnosticState, DmeScenarioStage } from "@/stores/dme-pmdt-store";
import type { DvorScenarioStage, VorDiagnosticState } from "@/stores/vor-pmdt-store";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

const STORAGE_VERSION = 2 as const;

interface StoredScenarioEvidence<TAttemptEvent, TAnswer, TCheckpoint> {
  version: typeof STORAGE_VERSION;
  scenarioId: string;
  userId: string;
  sessionKey: string;
  revisionKey: string;
  actionHistory: ScenarioActionEvent[];
  evidenceStats: ScenarioEvidenceStats;
  attemptEvents: TAttemptEvent[];
  answer: TAnswer;
  scenarioHardwareSelection: string[];
  scenarioHardwareInspected: string[];
  scenarioHardwareReasoning: string;
  scenarioHardwareDispositionConfirmed: boolean;
  checkpoint: TCheckpoint;
  savedAt: string;
}

export function storageKey(prefix: string, userId: string, sessionKey: string, scenarioId: string, revisionKey = sessionKey): string {
  const safe = (value: string) => encodeURIComponent(value.trim() || "anonymous");
  return `cns-training:${prefix}-scenario-session:v${STORAGE_VERSION}:${safe(userId)}:${safe(sessionKey)}:${safe(revisionKey)}:${safe(scenarioId)}`;
}

function browserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function parseEvidence<TAttemptEvent, TAnswer, TCheckpoint>(raw: string | null): StoredScenarioEvidence<TAttemptEvent, TAnswer, TCheckpoint> | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<StoredScenarioEvidence<TAttemptEvent, TAnswer, TCheckpoint>>;
    if (
      value.version !== STORAGE_VERSION
      || typeof value.scenarioId !== "string"
      || typeof value.userId !== "string"
      || typeof value.sessionKey !== "string"
      || typeof value.revisionKey !== "string"
      || !Array.isArray(value.actionHistory)
      || !value.actionHistory.every(isScenarioActionEvent)
      || !isScenarioEvidenceStats(value.evidenceStats)
      || !Array.isArray(value.attemptEvents)
      || !value.answer
      || !Array.isArray(value.scenarioHardwareSelection)
      || !Array.isArray(value.scenarioHardwareInspected)
      || typeof value.scenarioHardwareReasoning !== "string"
      || typeof value.scenarioHardwareDispositionConfirmed !== "boolean"
      || !value.checkpoint
    ) return null;
    return value as StoredScenarioEvidence<TAttemptEvent, TAnswer, TCheckpoint>;
  } catch {
    return null;
  }
}

function sanitizeDmeCheckpointData(data: DmePmdtData): DmePmdtData {
  const checkpoint = structuredClone(data);
  // Security accounts contain passwords and must never enter browser evidence.
  checkpoint.securityAccounts = [];
  return checkpoint;
}

function SessionStorageStatus({ message }: { message: string | null }) {
  if (!message) return null;
  return <p role="alert" className="pmdt-config-summary-warning">{message}</p>;
}

export function VorScenarioSessionPersistence() {
  const active = useVorPmdtStore((state) => state.scenario.active && state.mode === "student");
  const scenarioId = useVorPmdtStore((state) => state.scenario.definition?.id ?? state.scenarioId ?? "");
  const sessionKey = useVorPmdtStore((state) => state.sessionKey ?? state.scenarioId ?? scenarioId);
  const scenarioRevisionKey = useVorPmdtStore((state) => state.scenarioRevisionKey);
  const userId = useVorPmdtStore((state) => state.userId);
  const actionHistory = useVorPmdtStore((state) => state.actionHistory);
  const evidenceStats = useVorPmdtStore((state) => state.evidenceStats);
  const attemptEvents = useVorPmdtStore((state) => state.attemptEvents);
  const answer = useVorPmdtStore((state) => state.answer);
  const scenarioHardwareSelection = useVorPmdtStore((state) => state.scenarioHardwareSelection);
  const scenarioHardwareInspected = useVorPmdtStore((state) => state.scenarioHardwareInspected);
  const scenarioHardwareReasoning = useVorPmdtStore((state) => state.scenarioHardwareReasoning);
  const scenarioHardwareDispositionConfirmed = useVorPmdtStore((state) => state.scenarioHardwareDispositionConfirmed);
  const config = useVorPmdtStore((state) => state.config);
  const configDraft = useVorPmdtStore((state) => state.configDraft);
  const configurationBackup = useVorPmdtStore((state) => state.configurationBackup);
  const configDirty = useVorPmdtStore((state) => state.configDirty);
  const needBackup = useVorPmdtStore((state) => state.needBackup);
  const scenarioStage = useVorPmdtStore((state) => state.scenarioStage);
  const diagnosticState = useVorPmdtStore((state) => state.diagnosticState);
  const restoreScenarioEvidence = useVorPmdtStore((state) => state.restoreScenarioEvidence);
  const [storageError, setStorageError] = useState<string | null>(null);
  const revisionKey = scenarioRevisionKey ?? sessionKey;
  const key = useMemo(
    () => active && scenarioId ? storageKey("vor", userId, sessionKey, scenarioId, revisionKey) : null,
    [active, revisionKey, scenarioId, sessionKey, userId],
  );
  const restoredKey = useRef<string | null>(null);

  useEffect(() => {
    if (!key || restoredKey.current === key) return;
    restoredKey.current = key;
    const raw = browserStorage()?.getItem(key) ?? null;
    const stored = parseEvidence<VorAttemptEvent, VorStudentAnswer, {
      config: Dvor1150aConfig;
      configDraft: Dvor1150aConfig;
      configurationBackup: Dvor1150aConfig;
      configDirty: boolean;
      needBackup: boolean;
      scenarioStage: DvorScenarioStage;
      diagnosticState: VorDiagnosticState;
    }>(raw);
    if (raw && !stored) {
      setStorageError("Phiên lưu cục bộ không hợp lệ hoặc khác phiên; hệ thống không khôi phục để tránh lẫn dữ liệu.");
      return;
    }
    if (!stored || stored.userId !== userId || stored.sessionKey !== sessionKey || stored.revisionKey !== revisionKey) return;
    setStorageError(null);
    restoreScenarioEvidence(stored);
  }, [key, restoreScenarioEvidence, revisionKey, sessionKey, userId]);

  useEffect(() => {
    if (!key || restoredKey.current !== key) return;
    const storage = browserStorage();
    if (!storage) {
      setStorageError("Không thể lưu phiên làm bài: trình duyệt không cho phép local storage.");
      return;
    }
    const payload: StoredScenarioEvidence<VorAttemptEvent, VorStudentAnswer, {
      config: Dvor1150aConfig;
      configDraft: Dvor1150aConfig;
      configurationBackup: Dvor1150aConfig;
      configDirty: boolean;
      needBackup: boolean;
      scenarioStage: DvorScenarioStage;
      diagnosticState: VorDiagnosticState;
    }> = {
      version: STORAGE_VERSION,
      scenarioId,
      userId,
      sessionKey,
      revisionKey,
      actionHistory: [...actionHistory].slice(0, 500),
      evidenceStats,
      attemptEvents: [...attemptEvents],
      answer: structuredClone(answer),
      scenarioHardwareSelection: [...scenarioHardwareSelection],
      scenarioHardwareInspected: [...scenarioHardwareInspected],
      scenarioHardwareReasoning,
      scenarioHardwareDispositionConfirmed,
      checkpoint: {
        config: structuredClone(config),
        configDraft: structuredClone(configDraft),
        configurationBackup: structuredClone(configurationBackup),
        configDirty,
        needBackup,
        scenarioStage,
        diagnosticState: structuredClone(diagnosticState),
      },
      savedAt: new Date().toISOString(),
    };
    try {
      storage.setItem(key, JSON.stringify(payload));
      setStorageError(null);
    } catch {
      setStorageError("Không thể lưu phiên làm bài: bộ nhớ trình duyệt đã đầy hoặc bị chặn. Bài vẫn chạy nhưng reload có thể mất tiến độ.");
    }
  }, [actionHistory, answer, config, configDirty, configDraft, configurationBackup, diagnosticState, evidenceStats, key, needBackup, revisionKey, scenarioHardwareDispositionConfirmed, scenarioHardwareInspected, scenarioHardwareReasoning, scenarioHardwareSelection, scenarioId, scenarioStage, sessionKey, userId, attemptEvents]);

  return <SessionStorageStatus message={storageError} />;
}

export function DmeScenarioSessionPersistence() {
  const active = useDmePmdtStore((state) => state.scenario.active && state.mode === "student");
  const scenarioId = useDmePmdtStore((state) => state.scenario.definition?.id ?? state.scenarioId ?? "");
  const sessionKey = useDmePmdtStore((state) => state.sessionKey ?? state.scenarioId ?? scenarioId);
  const scenarioRevisionKey = useDmePmdtStore((state) => state.scenarioRevisionKey);
  const userId = useDmePmdtStore((state) => state.userId);
  const actionHistory = useDmePmdtStore((state) => state.actionHistory);
  const evidenceStats = useDmePmdtStore((state) => state.evidenceStats);
  const attemptEvents = useDmePmdtStore((state) => state.attemptEvents);
  const answer = useDmePmdtStore((state) => state.answer);
  const scenarioHardwareSelection = useDmePmdtStore((state) => state.scenarioHardwareSelection);
  const scenarioHardwareInspected = useDmePmdtStore((state) => state.scenarioHardwareInspected);
  const scenarioHardwareReasoning = useDmePmdtStore((state) => state.scenarioHardwareReasoning);
  const scenarioHardwareDispositionConfirmed = useDmePmdtStore((state) => state.scenarioHardwareDispositionConfirmed);
  const data = useDmePmdtStore((state) => state.data);
  const configDraft = useDmePmdtStore((state) => state.configDraft);
  const configurationBackup = useDmePmdtStore((state) => state.configurationBackup);
  const savedConfiguration = useDmePmdtStore((state) => state.savedConfiguration);
  const configDirty = useDmePmdtStore((state) => state.configDirty);
  const needBackup = useDmePmdtStore((state) => state.needBackup);
  const scenarioStage = useDmePmdtStore((state) => state.scenarioStage);
  const scenarioDiagnosticState = useDmePmdtStore((state) => state.scenarioDiagnosticState);
  const restoreScenarioEvidence = useDmePmdtStore((state) => state.restoreScenarioEvidence);
  const [storageError, setStorageError] = useState<string | null>(null);
  const revisionKey = scenarioRevisionKey ?? sessionKey;
  const key = useMemo(
    () => active && scenarioId ? storageKey("dme", userId, sessionKey, scenarioId, revisionKey) : null,
    [active, revisionKey, scenarioId, sessionKey, userId],
  );
  const restoredKey = useRef<string | null>(null);

  useEffect(() => {
    if (!key || restoredKey.current === key) return;
    restoredKey.current = key;
    const raw = browserStorage()?.getItem(key) ?? null;
    const stored = parseEvidence<DmeAttemptEvent, DmeStudentAnswer, {
      data: DmePmdtData;
      configDraft: DmePmdtData;
      configurationBackup: DmePmdtData | null;
      savedConfiguration: DmePmdtData | null;
      configDirty: boolean;
      needBackup: boolean;
      scenarioStage: DmeScenarioStage;
      scenarioDiagnosticState: DmeScenarioDiagnosticState;
    }>(raw);
    if (raw && !stored) {
      setStorageError("Phiên lưu cục bộ không hợp lệ hoặc khác phiên; hệ thống không khôi phục để tránh lẫn dữ liệu.");
      return;
    }
    if (!stored || stored.userId !== userId || stored.sessionKey !== sessionKey || stored.revisionKey !== revisionKey) return;
    setStorageError(null);
    restoreScenarioEvidence(stored);
  }, [key, restoreScenarioEvidence, revisionKey, sessionKey, userId]);

  useEffect(() => {
    if (!key || restoredKey.current !== key) return;
    const storage = browserStorage();
    if (!storage) {
      setStorageError("Không thể lưu phiên làm bài: trình duyệt không cho phép local storage.");
      return;
    }
    const payload: StoredScenarioEvidence<DmeAttemptEvent, DmeStudentAnswer, {
      data: DmePmdtData;
      configDraft: DmePmdtData;
      configurationBackup: DmePmdtData | null;
      savedConfiguration: DmePmdtData | null;
      configDirty: boolean;
      needBackup: boolean;
      scenarioStage: DmeScenarioStage;
      scenarioDiagnosticState: DmeScenarioDiagnosticState;
    }> = {
      version: STORAGE_VERSION,
      scenarioId,
      userId,
      sessionKey,
      revisionKey,
      actionHistory: [...actionHistory].slice(0, 500),
      evidenceStats,
      attemptEvents: [...attemptEvents],
      answer: structuredClone(answer),
      scenarioHardwareSelection: [...scenarioHardwareSelection],
      scenarioHardwareInspected: [...scenarioHardwareInspected],
      scenarioHardwareReasoning,
      scenarioHardwareDispositionConfirmed,
      checkpoint: {
        data: sanitizeDmeCheckpointData(data),
        configDraft: sanitizeDmeCheckpointData(configDraft),
        configurationBackup: configurationBackup ? sanitizeDmeCheckpointData(configurationBackup) : null,
        savedConfiguration: savedConfiguration ? sanitizeDmeCheckpointData(savedConfiguration) : null,
        configDirty,
        needBackup,
        scenarioStage,
        scenarioDiagnosticState: structuredClone(scenarioDiagnosticState),
      },
      savedAt: new Date().toISOString(),
    };
    try {
      storage.setItem(key, JSON.stringify(payload));
      setStorageError(null);
    } catch {
      setStorageError("Không thể lưu phiên làm bài: bộ nhớ trình duyệt đã đầy hoặc bị chặn. Bài vẫn chạy nhưng reload có thể mất tiến độ.");
    }
  }, [actionHistory, answer, configDirty, configDraft, configurationBackup, data, evidenceStats, key, needBackup, revisionKey, savedConfiguration, scenarioDiagnosticState, scenarioHardwareDispositionConfirmed, scenarioHardwareInspected, scenarioHardwareReasoning, scenarioHardwareSelection, scenarioId, scenarioStage, sessionKey, userId, attemptEvents]);

  return <SessionStorageStatus message={storageError} />;
}
