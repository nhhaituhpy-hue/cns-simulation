# QA checklist

## Source fidelity

- [ ] Every major source block is represented.
- [ ] Duplicate transmitter/channel occurrences map independently.
- [ ] Arrow directions, junctions, and line categories match the source.
- [ ] Figure, table, assembly, and part-number references are correct.
- [ ] Manual-derived values preserve units and operating conditions.

## Interaction

- [ ] Selection starts on the schematic, without an unwanted card selector.
- [ ] Each schematic occurrence highlights the correct cabinet position.
- [ ] Cabinet-only modules remain selectable.
- [ ] Front/rear switching preserves or intentionally clears selection.
- [ ] Detailed faceplate and manual data match the selected block.
- [ ] `aria-pressed`, accessible names, and keyboard focus are correct.

## Visual

- [ ] Cabinet assets share geometry with their hotspot layer.
- [ ] No module is stretched, squashed, or forced into another module's width.
- [ ] Faceplate control inventory and order match the manual.
- [ ] Labels remain legible; nothing overlaps or clips.
- [ ] Manual callout arrows do not leak into rebuilt physical panels.
- [ ] LEDs and controls use consistent mechanical styling.

## Responsive and runtime

- [ ] Desktop two-column view is balanced.
- [ ] Narrow view stacks cleanly with no horizontal overflow.
- [ ] Diagram selection targets remain usable at narrow widths.
- [ ] No console errors, React warnings, or missing assets.
- [ ] Waveform dialogs fit the viewport and close by documented methods.

## Repository workflow

- [ ] Unrelated dirty files are preserved.
- [ ] `git diff --check` passes.
- [ ] CodeGraph is synced when present.
- [ ] Only repository-authorized tests/builds are run.
- [ ] User dev inspection occurs before commit/push when required.
