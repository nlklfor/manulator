"""Step 2 of the pipeline: read the text of each line with PyLaia (HOME-Alcar model).

Uses the line images that step 1 (segmentation.py) saved in
output/segmentation/<image_id>/lines/. PyLaia needs Python 3.10, so it runs in
its own environment (ml/pylaia) as a separate program.
"""

import json
import re
import subprocess
import tempfile
from dataclasses import asdict, dataclass
from pathlib import Path

from PIL import Image

ML_DIR = Path(__file__).parent
SEGMENTATION_DIR = ML_DIR / "output" / "segmentation"  # where step 1 saved the lines
OUTPUT_DIR = ML_DIR / "output" / "transcription"  # where this step saves its result
MODEL_DIR = ML_DIR / "models" / "pylaia-home-alcar"
PYLAIA_DIR = ML_DIR / "pylaia"  # PyLaia's own environment (Python 3.10)
CONFIG_FILE = ML_DIR / "pylaia_decode.yaml"  # PyLaia settings that never change

# HOME-Alcar was trained on lines that are exactly 128 pixels high
LINE_HEIGHT = 128

# One result line printed by PyLaia, e.g.:  0003.png tum adlierunt quod postmodum
RESULT_LINE = re.compile(r"^(\d+)\.png ?(.*)$")


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

    # The resized copies are only needed while PyLaia runs. Each page gets its own
    # temporary folder, so two pages read at the same time never mix up their files.
    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        names = resize_lines_to_128(lines_dir, tmp_dir)
        # A page without lines has nothing to read
        pylaia_output = run_pylaia(tmp_dir, names) if names else ""

    lines = read_pylaia_output(pylaia_output)
    json_path = save_as_json(lines, out_dir / image_id / "transcription.json")
    return {"lines": lines, "json_path": json_path}


def resize_lines_to_128(lines_dir: Path, tmp_dir: Path) -> list[str]:
    """Save a 128-pixel-high copy of every line image in tmp_dir. Returns the names."""
    names = []
    for path in sorted(lines_dir.glob("*.png")):
        image = Image.open(path)
        # Keep the proportions: the width grows by the same factor as the height
        width = round(image.width * LINE_HEIGHT / image.height)
        image.resize((width, LINE_HEIGHT)).save(tmp_dir / path.name)
        names.append(path.name)
    return names


def run_pylaia(image_dir: Path, names: list[str]) -> str:
    """Run PyLaia on the images `names` in image_dir and return what it printed."""
    # PyLaia reads the names of the images from a file
    img_list = image_dir / "img_list.txt"
    img_list.write_text("\n".join(names), encoding="utf-8")

    command = [
        "uv",
        "run",
        "--project",
        str(PYLAIA_DIR),
        "--no-sync",
        "pylaia-htr-decode-ctc",
        "--config",
        str(CONFIG_FILE),
        str(MODEL_DIR / "syms.txt"),  # which number stands for which character
        str(img_list),  # which images to read
        "--img_dirs",
        f"[{image_dir}]",  # where the images are
    ]
    # cwd=ML_DIR: the paths in the config are relative to ml/
    completed = subprocess.run(
        command, cwd=ML_DIR, capture_output=True, text=True, check=True, timeout=600
    )
    return completed.stdout


def read_pylaia_output(output: str) -> list[TranscribedLine]:
    """Turn what PyLaia printed into TranscribedLines, sorted by line number.

    PyLaia reads several lines at the same time, so it prints them in random order.
    """
    lines = []
    for row in output.splitlines():
        match = RESULT_LINE.match(row.strip())
        if not match:
            continue  # warnings, progress bar, ...
        number, text = match.groups()
        lines.append(TranscribedLine(index=int(number), text=text.strip()))
    return sorted(lines, key=lambda line: line.index)


def save_as_json(lines: list[TranscribedLine], json_path: Path) -> Path:
    """Save the lines as a JSON file and return its path."""
    json_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(
        json.dumps([asdict(line) for line in lines], indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    return json_path
