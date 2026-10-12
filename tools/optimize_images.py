"""Rebuild local JPEG assets from the original images kept outside the upload package."""

from io import BytesIO
from pathlib import Path
from shutil import copy2

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets" / "images"
ORIGINALS = ROOT / "preview" / "original-images"


def target_settings(path):
    if path.parent.name == "dishes":
        return 340, 45
    if path.name == "shinchan-kitchen.jpg":
        return 750, 40
    if path.name == "kitchen-strip.jpg":
        return 750, 40
    if path.name == "checkout-art.jpg":
        return 891, 80
    if path.name == "shinchan-love.jpg":
        return 500, 55
    return 360, 50


def main():
    total = 0
    for target in sorted(ASSETS.rglob("*.jpg")):
        relative = target.relative_to(ASSETS)
        source = (ORIGINALS / relative).with_suffix(".png")
        if not source.exists():
            source = ORIGINALS / relative
        if not source.exists():
            source.parent.mkdir(parents=True, exist_ok=True)
            copy2(target, source)

        width, quality = target_settings(target)
        with Image.open(source) as opened:
            image = opened.convert("RGB")
            if target.name == "checkout-art.jpg" and image.height > 200:
                image = image.crop((0, 85, image.width, image.height - 20))
            if image.width > width:
                image = image.resize(
                    (width, round(image.height * width / image.width)),
                    Image.Resampling.LANCZOS,
                )
            output = BytesIO()
            image.save(
                output,
                format="JPEG",
                quality=quality,
                optimize=True,
                progressive=True,
                subsampling=0 if target.name in {"shinchan-kitchen.jpg", "kitchen-strip.jpg"} else 2,
            )
            output.seek(0)
            with Image.open(output) as check:
                check.verify()
            data = output.getvalue()

        target.write_bytes(data)
        total += len(data)

    print(f"Optimized image assets: {total} bytes")


if __name__ == "__main__":
    main()
