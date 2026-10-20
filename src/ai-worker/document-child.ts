import { extractDocument } from "../lib/ai/documents/extract";
import type { DocumentMetadata } from "../lib/ai/documents/validation";
/** Only file metadata is accepted on private IPC. No provider/database credentials. */
process.once("message", async (value: { metadata: DocumentMetadata }) => {
  try {
    const document = await extractDocument(value.metadata);
    process.send?.({ ok: true, document }, () => { process.disconnect?.(); });
  } catch {
    process.send?.({ ok: false, code: "INVALID_DOCUMENT" }, () => { process.disconnect?.(); });
  }
});
