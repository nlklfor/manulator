"""Step 2 of the pipeline: read the text of each line with Kraken (our fine-tuned model, #124).

Uses the line images that step 1 (segmentation.py) saved in
output/segmentation/<image_id>/lines/. Test results and why we chose this model:
docs/research/htr-finetuning.md
"""

import json
from dataclasses import asdict, dataclass
from pathlib import Path

from kraken import rpred
from kraken.containers import BaselineLine, Segmentation
from kraken.lib import models
from PIL import Image

ML_DIR = Path(__file__).resolve().parents[1]  # ml/, one level above services/
SEGMENTATION_DIR = ML_DIR / "output" / "segmentation"  # where step 1 saved the lines
OUTPUT_DIR = ML_DIR / "output" / "transcription"  # where this step saves its result
MODEL_FILE = ML_DIR / "models" / "catmus-finetuned" / "model.mlmodel"  # fine-tuned Kraken (#124)


@dataclass
class TranscribedLine:
    """The text of one line."""

    index: int  # same number as the line image from step 1 (0000.png → 0)
    text: str


def run_transcription(data: dict, options: dict | None = None, out_dir=None) -> dict:
    """Called by pipeline.py after "Detect Lines". Reads all lines of one page."""
    image_id = data["image_id"]
    lines_dir = SEGMENTATION_DIR / image_id / "lines"
    out_dir = Path(out_dir) if out_dir else OUTPUT_DIR

    model = models.load_any(str(MODEL_FILE), device="cpu")
    lines = []
    for path in sorted(lines_dir.glob("*.png")):
        text = read_line(model, Image.open(path))
        lines.append(TranscribedLine(index=int(path.stem), text=text))

    json_path = save_as_json(lines, out_dir / image_id / "transcription.json")
    return {"lines": lines, "json_path": json_path}


def read_line(model, image: Image.Image) -> str:
    """Read one line image with Kraken.

    The model was trained on baselines (the line the letters sit on). The line image
    has none, so we give it a straight baseline at 3/4 of its height and the whole
    image as its outline. This is how the model was tested (15.8% CER).
    """
    width, height = image.size
    line = BaselineLine(
        id="line",
        baseline=[(0, int(height * 0.75)), (width - 1, int(height * 0.75))],
        boundary=[(0, 0), (width - 1, 0), (width - 1, height - 1), (0, height - 1)],
    )
    page = Segmentation(
        type="baselines",
        imagename="line",
        text_direction="horizontal-lr",
        script_detection=False,
        lines=[line],
    )
    try:
        return next(rpred.rpred(model, image, page)).prediction.strip()
    except Exception:  # a tiny image (a speck, not a line): nothing to read
        return ""


def save_as_json(lines: list[TranscribedLine], json_path: Path) -> Path:
    """Save the lines as a JSON file and return its path."""
    json_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(
        json.dumps([asdict(line) for line in lines], indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    return json_path
