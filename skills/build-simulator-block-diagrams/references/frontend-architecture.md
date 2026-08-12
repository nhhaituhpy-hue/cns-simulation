# Frontend architecture

## Contents

- Boundaries
- Selection model
- Coordinate systems
- Suggested file layout
- Performance

## Boundaries

Separate four concerns:

1. Catalog data: block identity, source references, hotspots, indicators, test points.
2. Selection/controller state: current diagram occurrence, cabinet location, face.
3. Rendering primitives: cabinet canvas, schematic blocks/paths, faceplate controls.
4. Detail content: manual text, values, waveform viewer.

Avoid embedding source facts inside conditional JSX. A new block should normally require a catalog entry and optional faceplate component, not changes throughout the page.

## Selection model

Use exact occurrence IDs. A block can appear multiple times in a schematic or cabinet.

```text
selectedBlockId
selectedDiagramHotspotId
selectedCabinetHotspotId
cabinetFace
```

Resolve a schematic occurrence to a cabinet occurrence with an explicit target ID. Fall back to the first cabinet occurrence only when the equipment has no meaningful one-to-one mapping.

## Coordinate systems

- Raster cabinet: normalized percentages within the exact image content layer.
- Source diagram overlay: source pixels inside the SVG `viewBox`.
- Rebuilt schematic: one documented SVG coordinate system.
- Faceplate: physical-proportion-oriented viewBox per module.

Apply scaling to the image and hotspots together. Never scale the image alone and compensate hotspot coordinates separately.

## Suggested file layout

```text
device/
  block-diagram-data.ts
  block-diagram.tsx
  block-diagram.module.css
  module-faceplates.tsx
  module-faceplates.module.css
public/equipment/<model>/
  overview/
  diagrams/
  modules/
  waveforms/
```

Split faceplates by family when one file becomes difficult to review. Keep shared primitives near the faceplates unless multiple devices genuinely share the same mechanical visual language.

## Performance

- Use responsive intrinsic dimensions for bitmaps.
- Lazy-load detail media not visible on initial load.
- Use SVG primitives for repeated hardware details instead of many tiny PNGs.
- Avoid pointer-move React state for simple selection.
- Keep waveform lightboxes mounted only when open.
