# ml

Machine learning part of Manulator: a small FastAPI service that runs the models for finding and reading the lines on manuscript pages. The main backend calls it; the browser never does.

Model choice and test results: [docs/ai-model-research.md](../docs/ai-model-research.md).

## Setup

Two environments, because PyLaia only works with an older Python:

    cd ml
    uv sync                 # ML service and Kraken (Python 3.12)
    cd pylaia
    uv sync                 # PyLaia (Python 3.10)

## Download the models (once)

From `ml/`:

    cd pylaia
    uv run hf download Teklia/pylaia-home-alcar --local-dir ../models/pylaia-home-alcar

Kraken's line finder comes with Kraken itself; nothing to download.

## Transcribe a page

The pipeline finds the lines on a page (Kraken, `segmentation.py`) and then reads them (PyLaia, `transcription.py`). From `ml/`:

    uv run python pipeline.py "Transcribe" page1 data/page1.jpg

`page1` is a name for the results, `data/page1.jpg` is the page image.The text is saved in `output/transcription/page1/transcription.json`, one entry per line:

    [{"index": 0, "text": "comitibus Gallo et quodam diacono ..."}, ...]

To only find the lines, use `"Detect Lines"` instead of `"Transcribe"`. The results are in `output/segmentation/page1/` (line images and `overlay.jpg`).

PyLaia's settings are in `pylaia_decode.yaml`. PyLaia only reads lines that are exactly 128 pixels high, so `transcription.py` resizes them first.

## Run the ML service

It runs on port 8001, so it doesn't clash with the main backend on port 8000. Start it from `ml/`:

    uv run uvicorn app.main:app --reload --port 8001

Check that it works: open http://127.0.0.1:8001/health in the browser. It should show `{"status":"ok"}`. All endpoints are listed at http://127.0.0.1:8001/docs.


## Run the tests

From `ml/`:

    uv run pytest

## Folders

- `pipeline.py`: runs the steps in the right order (Detect Lines → Transcribe)
- `segmentation.py`: step 1, find the lines (Kraken)
- `transcription.py`: step 2, read the lines (PyLaia), with its settings in `pylaia_decode.yaml`
- `app/`: the ML service (FastAPI)
- `tests/`: tests
- `pylaia/`: the PyLaia environment
- `data/`, `models/`: downloaded pages and models (not in Git, everyone downloads their own)
- `output/`: results of the pipeline (not in Git)

## Working together

- Add packages with `uv add <name>` (in `ml/` or `ml/pylaia/`) and push the updated `pyproject.toml` and `uv.lock`, so everyone has the same environment.
- Put personal experiments in `sandbox/`. It is not in Git.
