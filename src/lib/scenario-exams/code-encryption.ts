import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ENVELOPE_VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const HEX_KEY = /^[0-9a-f]{64}$/i;
const BASE64_URL = /^[A-Za-z0-9_-]+$/;

export class ScenarioExamCodeEncryptionError extends Error {
  constructor(message = "Không thể bảo vệ mã kỳ thi.") {
    super(message);
    this.name = "ScenarioExamCodeEncryptionError";
  }
}

function encryptionKey(): Buffer {
  const configured = process.env.SCENARIO_EXAM_CODE_ENCRYPTION_KEY?.trim() ?? "";
  if (!HEX_KEY.test(configured)) {
    throw new ScenarioExamCodeEncryptionError("Thiếu cấu hình bảo mật mã kỳ thi.");
  }
  return Buffer.from(configured, "hex");
}

export function isScenarioExamCodeEncryptionKeyConfigured(): boolean {
  return HEX_KEY.test(process.env.SCENARIO_EXAM_CODE_ENCRYPTION_KEY?.trim() ?? "");
}

export function scenarioExamCodeEncryptionAad(examId: string, codeHash: string): Buffer {
  return Buffer.from(`cns-scenario-exam-code:${ENVELOPE_VERSION}:${examId}:${codeHash}`, "utf8");
}

export function encryptScenarioExamCode(code: string, examId: string, codeHash: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  cipher.setAAD(scenarioExamCodeEncryptionAad(examId, codeHash));
  const encrypted = Buffer.concat([cipher.update(code, "utf8"), cipher.final()]);
  return [
    ENVELOPE_VERSION,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

export function decryptScenarioExamCode(envelope: string, examId: string, codeHash: string): string {
  try {
    const parts = envelope.split(":");
    if (parts.length !== 4 || parts[0] !== ENVELOPE_VERSION || !parts.slice(1).every((part) => BASE64_URL.test(part))) {
      throw new Error("invalid envelope");
    }
    const iv = Buffer.from(parts[1], "base64url");
    const authTag = Buffer.from(parts[2], "base64url");
    const encrypted = Buffer.from(parts[3], "base64url");
    if (iv.length !== IV_BYTES || authTag.length !== AUTH_TAG_BYTES || encrypted.length === 0) {
      throw new Error("invalid envelope length");
    }
    const decipher = createDecipheriv(ALGORITHM, encryptionKey(), iv);
    decipher.setAAD(scenarioExamCodeEncryptionAad(examId, codeHash));
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch (error) {
    if (error instanceof ScenarioExamCodeEncryptionError) throw error;
    throw new ScenarioExamCodeEncryptionError();
  }
}
