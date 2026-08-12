# Manual extraction

## Contents

- Search and render
- Visual inspection
- Source inventory
- Scanned manuals

## Search and render

Use `scripts/render_manual_pages.py` to search a PDF and render matching pages:

```powershell
python scripts/render_manual_pages.py manual.pdf --find "Figure 3-64" "Table 3-8" --output tmp/manual --scale 2.4
```

Search by figure number and assembly/block name because captions can be absent from the extracted text. Render neighboring pages when tables continue.

Page numbers reported by PDF libraries are usually one-based in user output but zero-based internally. Always print both the PDF page index and visible page label when available.

## Visual inspection

Inspect complete rendered pages before cropping. Capture:

- section heading and assembly IDs;
- figure caption and part number;
- table title and continued rows;
- labels that are physically on the panel versus editorial callouts;
- notes that qualify ranges or operating conditions.

Do not rely on text extraction for geometry. Do not rely on the drawing alone for semantics when a table describes the control differently.

## Source inventory

Create a machine-readable or typed inventory containing:

```text
block_id | name | assembly_ids | figure | table | pdf_pages | cabinet_face
schematic_occurrences | cabinet_occurrences | controls | indicators
test_points | nominal_values | waveforms | part_number | confidence | notes
```

Use `confidence` values such as `confirmed`, `manual-ambiguous`, or `user-confirmed-override`. Preserve manual wording in notes where interpretation matters.

## Scanned manuals

If text search finds nothing:

1. render likely page ranges at 2x to 3x scale;
2. use OCR only to locate candidates;
3. verify labels visually against the page;
4. never copy OCR output into technical labels without manual correction.
