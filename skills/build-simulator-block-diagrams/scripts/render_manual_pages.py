#!/usr/bin/env python3
"""Find text in a PDF and render matching or explicitly selected pages to PNG."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import fitz


def parse_page_spec(spec: str, page_count: int) -> list[int]:
    pages: set[int] = set()
    for token in spec.split(","):
        token = token.strip()
        if not token:
            continue
        match = re.fullmatch(r"(\d+)(?:-(\d+))?", token)
        if not match:
            raise ValueError(f"Invalid page token: {token!r}")
        start = int(match.group(1))
        end = int(match.group(2) or start)
        if start > end:
            raise ValueError(f"Page range must be ascending: {token!r}")
        for page_number in range(start, end + 1):
            if not 1 <= page_number <= page_count:
                raise ValueError(f"Page {page_number} outside PDF range 1-{page_count}")
            pages.add(page_number)
    return sorted(pages)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--find", nargs="*", default=[], help="Case-insensitive text needles")
    parser.add_argument("--pages", default="", help="One-based pages, e.g. 180-195,201")
    parser.add_argument("--padding", type=int, default=0, help="Include neighboring pages around search matches")
    parser.add_argument("--scale", type=float, default=2.4)
    parser.add_argument("--output", type=Path, default=Path("tmp/manual-pages"))
    args = parser.parse_args()

    if not args.pdf.is_file():
        parser.error(f"PDF does not exist: {args.pdf}")
    if not args.find and not args.pages:
        parser.error("Provide --find and/or --pages")
    if args.scale <= 0:
        parser.error("--scale must be positive")

    document = fitz.open(args.pdf)
    selected = set(parse_page_spec(args.pages, document.page_count)) if args.pages else set()
    matches: dict[str, list[int]] = {needle: [] for needle in args.find}

    lowered_needles = [(needle, needle.casefold()) for needle in args.find]
    for index, page in enumerate(document):
        if not lowered_needles:
            break
        text = page.get_text("text").casefold()
        for original, needle in lowered_needles:
            if needle in text:
                page_number = index + 1
                matches[original].append(page_number)
                for padded in range(page_number - args.padding, page_number + args.padding + 1):
                    if 1 <= padded <= document.page_count:
                        selected.add(padded)

    args.output.mkdir(parents=True, exist_ok=True)
    outputs = []
    matrix = fitz.Matrix(args.scale, args.scale)
    for page_number in sorted(selected):
        page = document[page_number - 1]
        output = args.output / f"page-{page_number:04d}.png"
        pixmap = page.get_pixmap(matrix=matrix, alpha=False)
        pixmap.save(output)
        outputs.append({
            "page": page_number,
            "page_label": page.get_label(),
            "path": str(output.resolve()),
            "width": pixmap.width,
            "height": pixmap.height,
        })

    result = {
        "pdf": str(args.pdf.resolve()),
        "page_count": document.page_count,
        "matches": matches,
        "rendered": outputs,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
