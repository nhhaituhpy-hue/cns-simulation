---
name: build-simulator-block-diagrams
description: Build and maintain interactive equipment block-diagram explorer pages for industrial, navigation, telecommunications, monitoring, and other hardware simulators. Use when Codex must turn equipment manuals, cabinet drawings, schematics, module figures, test-point tables, or waveform references into a frontend where users select blocks directly on one or more schematics, see the matching cabinet location highlighted, open a detailed module faceplate, and read manual-derived indicators, controls, connectors, measurements, or waveforms. Also use when correcting diagram topology, cabinet-to-block mappings, faceplate proportions, technical labels, asset storage, or responsive behavior on an existing simulator block-diagram page.
---

# Build Simulator Block Diagrams

Create a technically faithful explorer with this interaction contract:

`schematic block selection -> matching cabinet highlight -> cabinet/module selection -> detailed faceplate and manual data`

Prefer deterministic, inspectable code and source-backed data over visually plausible guesses.

## Start with repository rules

1. Read the repository instructions and any device-specific skill completely.
2. Inspect the current route, component, data model, assets, tests, and dirty worktree.
3. If CodeGraph exists, run `codegraph status`, sync if stale, and explore the target symbols before broad search. Run impact analysis before editing shared logic.
4. Read the installed framework documentation before writing code when repository instructions require it.
5. Preserve unrelated changes and restrict edits to the requested device unless explicitly authorized otherwise.
6. State a phased plan, risks, assumptions, and source material. Honor any repository approval gate before a large architectural change.

## Select the rendering strategy

Choose per surface rather than forcing one technique everywhere:

| Surface | Preferred technique | Reason |
|---|---|---|
| Block topology and signal paths | Semantic SVG/HTML generated from verified topology | Precise labels, arrows, selection states, responsive scaling |
| Existing manual schematic with accurate geometry | Original raster inside SVG plus verified `foreignObject` or HTML hotspot overlay | Keeps source geometry while adding interaction |
| Cabinet exterior/interior | Clean reference-derived bitmap or vector plus hotspots | Photorealistic appearance with deterministic mapping |
| Module faceplate | SVG/React primitives | Exact proportions, labels, LEDs, connectors, screws, knobs |
| Waveform or oscilloscope photo | Source bitmap | Preserve actual measured signal evidence |
| Decorative or damaged photographic background | Image generation/editing only after inspecting the source | Improve presentation without inventing technical topology |

Never ask an image model to reconstruct signal topology, connector labels, test-point numbering, arrow direction, or control semantics. Use image generation only for non-semantic photographic cleanup and manually verify the result.

## Phase 1: Build a source inventory

1. Locate every relevant PDF, schematic, cabinet image, module figure, table, and existing asset.
2. Search the PDF by figure, table, assembly, and block names. Render the complete relevant pages, not only cropped figures, so captions and tables remain visible.
3. Use `scripts/render_manual_pages.py` to find and render manual pages. Read [manual-extraction.md](references/manual-extraction.md) when the manual is long, scanned, or visually complex.
4. Create one inventory row per block with:
   - stable block ID and display name;
   - assembly IDs and cabinet face;
   - schematic occurrences and transmitter/channel variants;
   - cabinet occurrences;
   - figure/table/manual section;
   - indicators, controls, connectors, test points, nominal values, and waveforms;
   - whether a detailed faceplate exists.
5. Record ambiguity explicitly. Do not invent missing nominal values or infer connector functions from appearance alone.

Treat sources in this order unless project instructions say otherwise:

1. the user's latest confirmed behavior and screenshots;
2. official equipment manual and engineering drawings;
3. current simulator data/tests and existing conventions;
4. engineering inference, clearly labeled and minimized.

## Phase 2: Define the data contract

Keep device knowledge out of JSX. Define typed data for blocks, hotspots, manual references, and media before building interaction.

Use normalized hotspot coordinates for cabinet bitmaps:

```ts
interface Hotspot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  targetCabinetHotspotId?: string;
}

interface BlockDefinition {
  id: BlockId;
  name: string;
  assemblyIds: readonly string[];
  description: string;
  manualReference: string;
  cabinetFace: "front" | "rear";
  cabinetHotspots: readonly Hotspot[];
  diagramHotspots: readonly Hotspot[];
  indicators: readonly string[];
  testPoints: readonly TestPoint[];
  faceplate?: FaceplateReference;
}
```

Use stable IDs, not array indexes. Map every diagram occurrence to the exact cabinet occurrence with `targetCabinetHotspotId`; this is essential for duplicated transmitter paths.

Read [frontend-architecture.md](references/frontend-architecture.md) before creating or substantially refactoring the data/component boundary.

## Phase 3: Implement the required interaction

Build the smallest complete interaction first:

1. Show cabinet front/rear navigation without unnecessary headings.
2. Show one or more schematics in the right column or corresponding responsive stack.
3. Make blocks selectable directly on the schematic. Do not add a separate card/list selector unless the user explicitly requests it.
4. On schematic selection:
   - set the selected block and exact schematic occurrence;
   - switch to the correct cabinet face when needed;
   - highlight the matching cabinet occurrence;
   - scroll the detail area into view only when it improves usability.
5. Permit cabinet-only selection for modules that do not appear in a schematic.
6. On cabinet/module selection, render the detailed faceplate and source-backed data.
7. Use `aria-pressed`, useful accessible names, keyboard focus, and visible focus styles.

Keep selection state minimal: selected block ID, schematic hotspot ID, cabinet hotspot ID, and cabinet face. Derive everything else from the catalog.

## Phase 4: Draw schematics faithfully

Before drawing, trace the source topology as nodes and directed edges. Verify:

- every major block;
- every duplicated channel/transmitter;
- signal, control, sample, monitoring, and power line categories;
- every arrow direction;
- crossings versus junctions;
- terminal blocks, antenna/load routes, and off-page destinations.

Use one SVG coordinate system and explicit paths. Attach arrow markers only to paths whose direction is confirmed. Separate line categories into semantic groups so colors/dashes remain consistent.

If using a source diagram with overlays, store overlays in source-pixel coordinates and use an SVG `viewBox`. This is more stable than guessing CSS percentages against independently resized elements.

Do not declare a schematic complete merely because it looks organized. It must match the source relationships.

## Phase 5: Draw cabinet and faceplates

For cabinet images:

- keep the image and hotspots inside the same transformed layer;
- preserve `object-fit: contain` geometry;
- calibrate against visible mechanical anchors, not whitespace or page crop edges;
- verify each hotspot at desktop and mobile;
- use separate front/rear mappings.

For faceplates:

1. Read [technical-rendering.md](references/technical-rendering.md).
2. Build reusable primitives for screws, test points, trim pots, indicator lamps, connectors, handles, switches, knobs, labels, and part-number plates.
3. Give each module its own `viewBox` and width class. Keep a common target height if useful, but never force all cards to the same aspect ratio.
4. Copy labels, IDs, relative order, and part numbers exactly from the manual.
5. Remove manual callout arrows that sit outside the physical panel; move the connector/control label onto the panel without changing meaning.
6. Keep faceplates static unless the user asks for operable controls. For a decorative control over an existing input, preserve the input's semantics and behavior and only replace its visual presentation.

Prefer a professional cold-metal visual language: restrained brushed texture, consistent fasteners/connectors, readable black labels, and semantic LED colors. Avoid gradients or shadows that obscure engineering detail.

## Phase 6: Attach manual-derived data

Separate documentation from simulated behavior:

- The detail panel may show the manual description, indicators, controls, connectors, nominal values, and alignment notes.
- A measured waveform image is evidence, not a generated decorative graph. State whether it is from the manual, a field measurement, or an illustrative simulation.
- Do not hardcode live operational values in a display when they should derive from simulator state.
- Do not convert a static faceplate into an operable simulator without explicit requirements and a reviewed state model.
- When the user corrects a value, re-check the complete related table so adjacent values are not left inconsistent.

## Phase 7: Plan media storage

Use local assets during development unless the project already requires remote media. For large catalogs, read [storage-and-naming.md](references/storage-and-naming.md) and define:

- bucket visibility and access policy;
- stable object paths by manufacturer/model/category/revision;
- immutable source assets versus regenerated derivatives;
- metadata for dimensions, figure, checksum, revision, alt text, and manual provenance;
- a manifest or database record used by the frontend;
- cache-control and replacement/versioning rules;
- local fallback behavior.

Do not upload files, create buckets, or change remote policies without authorization. Never make proprietary manuals public merely for frontend convenience.

## Phase 8: Verify incrementally

Follow the repository's test and approval workflow. At minimum:

1. Inspect every selectable schematic block and cabinet mapping.
2. Verify every faceplate title, figure, part number, control/test-point inventory, and aspect ratio.
3. Check desktop plus at least one narrow mobile viewport.
4. Confirm no horizontal overflow, clipped labels, overlapping controls, stretched bitmaps, or console errors.
5. Verify keyboard focus and selection state.
6. Run `scripts/inspect_image_assets.py` on raster assets to identify crop contamination or suspicious aspect ratios.
7. Run `git diff --check` and sync CodeGraph after source edits.
8. Let the user inspect the dev route before build/test/commit when the project requires an inspection gate.

Use [qa-checklist.md](references/qa-checklist.md) for final review. Do not silently commit, push, deploy, upload, or update broad documentation unless the user's workflow authorizes it.

## Failure policy

After two or three failed attempts at the same visual mapping or rendering issue:

1. stop changing coordinates blindly;
2. identify whether the root cause is source crop, incorrect aspect ratio, transform mismatch, wrong topology, or CSS sizing;
3. compare source and rendered bounding boxes;
4. propose a corrected representation;
5. request guidance if source ambiguity remains.

Never add layers of compensation around an unknown geometry error.
