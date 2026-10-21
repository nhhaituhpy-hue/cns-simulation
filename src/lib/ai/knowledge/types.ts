import type { EvidenceDocument } from "../scenario-generation/types";

export const KNOWLEDGE_MODULE_IDS = ["dvor-1150", "dvor-1150a", "dme-1119a", "dvor-220", "dme-320", "ads-b"] as const;
export type KnowledgeModuleId = typeof KNOWLEDGE_MODULE_IDS[number];
export type KnowledgeSourceKind = "manufacturer-manual" | "operating-procedure" | "simulation-reference";
export type KnowledgeMediaType = "application/pdf" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document" | "text/markdown";
export interface KnowledgeSegment {
  label: string;
  page: number | null;
  printedPage: string | null;
  text: string;
  textSha256: string;
}
export interface KnowledgeDocument {
  id: string;
  name: string;
  /** Hash of the ORIGINAL source, not the extracted JSON. */
  sha256: string;
  mediaType: KnowledgeMediaType;
  sourceKind: KnowledgeSourceKind;
  revision: string | null;
  pageCount: number | null;
  segments: KnowledgeSegment[];
}
export interface KnowledgeCorpus {
  version: 1;
  moduleId: KnowledgeModuleId;
  mode: "reference-only";
  documents: KnowledgeDocument[];
}
export interface KnowledgeManifestEntry {
  moduleId: KnowledgeModuleId;
  file: `${KnowledgeModuleId}.json`;
  sha256: string;
  documentCount: number;
  segmentCount: number;
}
/** Integrity inventory in an operator-trusted root; NOT a signature or authentication. */
export interface KnowledgeManifest {
  version: 1;
  mode: "reference-only";
  modules: KnowledgeManifestEntry[];
}
export interface KnowledgeRetrievalOptions { root?: string; maxCharacters?: number }
export interface KnowledgeRetrievalResult { documents: EvidenceDocument[]; notice: string; available: boolean }
