"""Shrink a guide PDF and fix its metadata. Dev-only.

Usage:
    python scripts/optimize-pdf.py <source.pdf> <output.pdf> --title "Guide Title"
    (npm run pdf -- <source.pdf> <output.pdf> --title "Guide Title")

Originals live in assets/_source/guides/ (gitignored); outputs go to
assets/guides/. Images larger than --max-px on their long side are
downsized and re-encoded as JPEG; images with transparency are only resized.
"""

import argparse
import io
import sys

from PIL import Image
from pypdf import PdfReader, PdfWriter

AUTHOR = "Jared Cohen | MA REALTOR® — Castles Unlimited team, brokered by eXp Realty"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("source")
    parser.add_argument("output")
    parser.add_argument("--title", required=True, help="Title shown in browser tabs / search results")
    parser.add_argument("--max-px", type=int, default=1600, help="Longest image side after resizing (default 1600)")
    parser.add_argument("--quality", type=int, default=75, help="JPEG quality 1-95 (default 75)")
    args = parser.parse_args()

    writer = PdfWriter(clone_from=PdfReader(args.source))
    resized = 0

    for page in writer.pages:
        for image in page.images:
            pil = image.image
            if pil is None:
                continue
            long_side = max(pil.size)
            has_alpha = pil.mode in ("RGBA", "LA", "PA")
            if long_side <= args.max_px and has_alpha:
                continue
            if long_side > args.max_px:
                pil = pil.copy()
                pil.thumbnail((args.max_px, args.max_px), Image.LANCZOS)
            if has_alpha:
                image.replace(pil)
            else:
                if pil.mode not in ("RGB", "L"):
                    pil = pil.convert("RGB")
                image.replace(pil, quality=args.quality)
            resized += 1
        page.compress_content_streams()

    writer.compress_identical_objects(remove_duplicates=True, remove_unreferenced=True)
    writer.add_metadata({"/Title": args.title, "/Author": AUTHOR, "/Subject": args.title})

    buffer = io.BytesIO()
    writer.write(buffer)
    with open(args.output, "wb") as fh:
        fh.write(buffer.getvalue())

    print(f"Re-encoded {resized} image(s); wrote {args.output} ({len(buffer.getvalue()) / 1024 / 1024:.2f} MB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
