import { createHash, randomBytes } from "node:crypto";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 12;

function randomIndex(byte: number): number | null {
  const limit = Math.floor(256 / CODE_ALPHABET.length) * CODE_ALPHABET.length;
  return byte < limit ? byte % CODE_ALPHABET.length : null;
}

export function normalizeScenarioExamCode(value: string): string {
  return value.replace(/[\s-]/g, "").toUpperCase();
}

export function hashScenarioExamCode(value: string): string {
  return createHash("sha256")
    .update(normalizeScenarioExamCode(value), "utf8")
    .digest("hex");
}

export function isScenarioExamCode(value: string): boolean {
  const normalized = normalizeScenarioExamCode(value);
  return normalized.length === CODE_LENGTH && [...normalized].every((char) => CODE_ALPHABET.includes(char));
}

export function generateScenarioExamCode(): { value: string; hash: string; hint: string } {
  const characters: string[] = [];
  while (characters.length < CODE_LENGTH) {
    for (const byte of randomBytes(CODE_LENGTH)) {
      const index = randomIndex(byte);
      if (index === null) continue;
      characters.push(CODE_ALPHABET[index]);
      if (characters.length === CODE_LENGTH) break;
    }
  }
  const value = characters.join("");
  return {
    value,
    hash: hashScenarioExamCode(value),
    hint: value.slice(-4),
  };
}
