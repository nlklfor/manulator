"""Step 1 of the pipeline: text line detection with kraken's baseline segmenter (BLLA).

BLLA is a PyTorch model that predicts baselines + bounding polygons, which works
much better on historical (curved, skewed, dense) pages than bounding boxes.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, asdict
from pathlib import Path
import io  # add to the imports

from PIL import Image, ImageDraw

from kraken.configs import SegmentationInferenceConfig
from kraken.containers import Segmentation
from kraken.ketos.util import to_ptl_device
from kraken.serialization import serialize
from kraken.tasks import SegmentationTaskModel

OUTPUT_DIR = Path(__file__).resolve().parents[1] / "output/segmentation"  # ml/output, wherever the code is run from


@dataclass
class DetectedLine:
    """A detected text line in page coordinates."""
    index: int
    baseline: list[tuple[int, int]]
    boundary: list[tuple[int, int]]
    bbox: tuple[int, int, int, int]  # (x0, y0, x1, y1)


class LineDetector:
    """Thin wrapper around kraken's segmentation task model.

    Args:
        model_path: Path to a custom (e.g. fine-tuned) kraken segmentation model.
                    If None, kraken's bundled default BLLA model is used.
        device: 'cpu', 'cuda', 'mps' or 'auto'.
    """

    def __init__(self, model_path: str | Path | None = None, device: str = "auto",
                 text_direction: str = "horizontal-lr"):
        self.model = SegmentationTaskModel.load_model(model_path)
        # kraken uses Lightning-style (accelerator, device) pairs, e.g. 'cuda:0' -> ('gpu', [0]).
        accelerator, devices = to_ptl_device(device)
        self.config = SegmentationInferenceConfig(accelerator=accelerator, device=devices,
                                                  text_direction=text_direction)

    def segment(self, image: Image.Image) -> Segmentation:
        return self.model.predict(image, self.config)

    @staticmethod
    def to_lines(segmentation: Segmentation) -> list[DetectedLine]:
        lines = []
        for i, line in enumerate(segmentation.lines):
            boundary = [tuple(map(int, p)) for p in line.boundary]
            xs, ys = zip(*boundary)
            lines.append(DetectedLine(
                index=i,
                baseline=[tuple(map(int, p)) for p in line.baseline],
                boundary=boundary,
                bbox=(min(xs), min(ys), max(xs), max(ys)),
            ))
        return lines


def crop_line(image: Image.Image, line: DetectedLine, background: int = 255) -> Image.Image:
    """Crop a line by its polygon; pixels outside the polygon are filled with `background`.

    Masking avoids leaking ascenders/descenders of neighbouring lines into the crop,
    which matters for the recognition model in step 2.
    """
    gray = image.convert("L")
    mask = Image.new("L", gray.size, 0)
    ImageDraw.Draw(mask).polygon(line.boundary, fill=255)
    canvas = Image.new("L", gray.size, background)
    canvas.paste(gray, mask=mask)
    return canvas.crop(line.bbox)


def draw_lines(image: Image.Image, lines: list[DetectedLine]) -> Image.Image:
    """Overlay polygons (green), baselines (red) and line indices for visual inspection."""
    overlay = image.convert("RGB").copy()
    draw = ImageDraw.Draw(overlay)
    width = max(2, image.width // 600)
    for line in lines:
        draw.polygon(line.boundary, outline=(0, 180, 0), width=width)
        draw.line(line.baseline, fill=(220, 0, 0), width=width)
        draw.text((line.bbox[0], line.bbox[1]), str(line.index), fill=(0, 0, 255))
    return overlay


def process_page(image_id: str, image: bytes, out_dir: str | Path, detector: LineDetector) -> tuple[
    list[DetectedLine], Path]:
    """Segment one page and write: PAGE XML, lines.json, overlay image and line crops."""
    out_dir = Path(out_dir)
    page_dir = out_dir / image_id
    (page_dir / "lines").mkdir(parents=True, exist_ok=True)

    # open image
    image = Image.open(io.BytesIO(image))
    # detect lines
    segmentation = detector.segment(image)
    lines = detector.to_lines(segmentation)

    # PAGE XML is the standard interchange format (eScriptorium, Transkribus, kraken training).
    (page_dir / f"pages-{image_id}").write_text(
        serialize(segmentation, image_size=image.size, template="pagexml"), encoding="utf-8")
    (page_dir / "lines.json").write_text(
        json.dumps([asdict(l) for l in lines], indent=2), encoding="utf-8")
    overlay_path = page_dir / "overlay.jpg"
    draw_lines(image, lines).save(overlay_path, quality=90)
    for line in lines:
        crop_line(image, line).save(page_dir / "lines" / f"{line.index:04d}.png")
    return lines, overlay_path


def run_segmentation(data: dict, options:dict = None, out_dir=None, device: str = "auto") -> dict:
    result = {}
    image = data['image']
    image_id = data['image_id']

    out_dir = Path(out_dir) if out_dir else OUTPUT_DIR
    detector = LineDetector(device=device)
    lines, overlay_path = process_page(image_id, image, out_dir, detector)

    result['lines'] = lines
    result['image_path'] = str(overlay_path.resolve())

    return result
