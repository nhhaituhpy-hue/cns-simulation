#!/usr/bin/env python3
"""Inventory raster dimensions, ratios, color modes, and transparent bounds."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image


SUPPORTED = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tif", ".tiff"}


def inspect(path: Path) -> dict[str, object]:
    with Image.open(path) as image:
        width, height = image.size
        alpha_bbox = None
        if "A" in image.getbands():
            alpha_bbox = image.getchannel("A").getbbox()
        return {
            "path": str(path.resolve()),
            "width": width,
            "height": height,
            "aspect_ratio": round(width / height, 6) if height else None,
            "format": image.format,
            "mode": image.mode,
            "alpha_bbox": alpha_bbox,
            "bytes": path.stat().st_size,
        }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="+", type=Path)
    parser.add_argument("--recursive", action="store_true")
    args = parser.parse_args()

    files: set[Path] = set()
    for path in args.paths:
        if path.is_file() and path.suffix.lower() in SUPPORTED:
            files.add(path)
        elif path.is_dir():
            iterator = path.rglob("*") if args.recursive else path.glob("*")
            files.update(candidate for candidate in iterator if candidate.is_file() and candidate.suffix.lower() in SUPPORTED)
        else:
            parser.error(f"Unsupported or missing path: {path}")

    report = [inspect(path) for path in sorted(files)]
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
