# Technical rendering

## Contents

- Fidelity hierarchy
- Faceplate proportions
- Primitive library
- Schematic rules
- Image generation boundary

## Fidelity hierarchy

Prioritize in this order:

1. topology and arrow direction;
2. block identity and duplicate channel mapping;
3. labels, IDs, connector/control inventory, and part number;
4. physical proportions and relative placement;
5. material, lighting, and cosmetic polish.

A polished but topologically incorrect drawing fails.

## Faceplate proportions

Derive each module ratio from the physical panel or the tight source crop. Do not use page whitespace. Use a shared target display height plus module-specific maximum widths.

Check rendered ratio:

```text
rendered width / rendered height ~= viewBox width / viewBox height
```

Allow wide power modules, medium control cards, and narrow CCA panels to look different. Never stretch a wide panel into a narrow template or shorten every module to match a grid.

## Primitive library

Useful primitives include:

- brushed panel frame;
- Phillips/slotted screw;
- test point and coax connector;
- trim potentiometer;
- green/amber/red/off indicator lamp;
- USB or D-sub connector;
- extraction handle and power-module pull handle;
- momentary pushbutton;
- rotary screw/knob;
- multiline label and part-number plate.

Use SVG gradients sparingly to convey metal depth. Use semantic LED colors. Keep text at a legible size after responsive scaling.

When visually replacing a native control, overlay or visually hide the existing input rather than deleting it. Preserve accessible name, keyboard operation, range, default/current value, and event handling.

## Schematic rules

- Create explicit node and edge inventories first.
- Separate RF/signal, control, sample, power, and monitoring lines.
- Use junction dots only where lines electrically connect.
- Avoid ambiguous diagonal crossings.
- Place arrowheads at confirmed destinations.
- Keep selectable shapes aligned with their visible blocks.
- Include blocks that exist in the source even when no detailed faceplate is available.

## Image generation boundary

Permitted uses:

- clean cabinet photography;
- remove paper texture or damage;
- normalize lighting/background;
- create a professional non-semantic equipment exterior.

Prohibited as a source of truth:

- reconstructing a schematic;
- guessing module labels or test points;
- changing connector count;
- inventing signal paths or arrows;
- determining cabinet hotspot coordinates.

Always compare generated imagery with the source and keep the original asset available for calibration.
