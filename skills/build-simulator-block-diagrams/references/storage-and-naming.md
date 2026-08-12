# Storage and naming

## Contents

- When to use remote storage
- Path convention
- Metadata
- Supabase guidance
- Delivery rules

## When to use remote storage

Keep small, stable, source-controlled assets local. Use object storage when a device family has many large images, assets need independent replacement, or multiple frontends share the catalog.

SVG/React faceplates generated as code do not need object storage.

## Path convention

Use lowercase ASCII paths and immutable revision segments:

```text
equipment/<manufacturer>/<model>/<manual-revision>/source/<filename>
equipment/<manufacturer>/<model>/<manual-revision>/overview/front-cabinet.webp
equipment/<manufacturer>/<model>/<manual-revision>/diagrams/<figure-id>.webp
equipment/<manufacturer>/<model>/<manual-revision>/modules/<block-id>-<figure-id>.webp
equipment/<manufacturer>/<model>/<manual-revision>/waveforms/<block-id>-<test-point>.webp
```

Do not overwrite a technical asset across manual revisions. Point the manifest to the new object.

## Metadata

Store or generate:

```text
device_model, manual_revision, block_id, category, figure, table,
source_pdf, source_page, width, height, mime_type, checksum,
alt_text, provenance, created_at, supersedes
```

The frontend should consume a typed manifest or database record rather than constructing arbitrary public URLs inside components.

## Supabase guidance

- Use a private bucket for proprietary manuals and source pages.
- Publish only approved derived images, or use time-limited signed URLs.
- Keep service-role keys server-side.
- Configure long cache lifetimes for immutable revisioned assets.
- Use short cache lifetimes or versioned paths for replaceable drafts.
- Add a local placeholder/error state when an object is unavailable.
- Batch uploads only after the user authorizes the target project, bucket, access policy, and files.

## Delivery rules

Before upload, produce an asset manifest and dry-run list. After upload, verify object existence, MIME type, dimensions, access behavior, and frontend fallback. Never expose the complete manual through a public bucket without explicit authorization and rights review.
