import json

import pytest
from PIL import Image

from services.transcription import MODEL_FILE, TranscribedLine, read_line, save_as_json


def test_save_as_json_keeps_order_and_special_letters(tmp_path):
    lines = [TranscribedLine(0, "comitibus Gallo"), TranscribedLine(1, "Königsfelden")]

    path = save_as_json(lines, tmp_path / "page1" / "transcription.json")

    saved = json.loads(path.read_text(encoding="utf-8"))
    assert saved == [
        {"index": 0, "text": "comitibus Gallo"},
        {"index": 1, "text": "Königsfelden"},
    ]


@pytest.mark.skipif(not MODEL_FILE.exists(), reason="Kraken model not downloaded")
def test_read_line_returns_empty_text_for_a_tiny_image():
    # A speck that segmentation took for a line: nothing to read, but no crash
    from kraken.lib import models

    model = models.load_any(str(MODEL_FILE), device="cpu")

    assert read_line(model, Image.new("L", (3, 3), 255)) == ""
