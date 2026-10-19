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

Models are not in Git, because they are too big. From `ml/`:

    cd pylaia
    uv run hf download Teklia/pylaia-home-alcar --local-dir ../models/pylaia-home-alcar

Kraken's line finder comes with Kraken itself; nothing to download.

## Run the ML service

It runs on port 8001, so it doesn't clash with the main backend on port 8000. Start it from `ml/`:

    uv run uvicorn app.main:app --reload --port 8001

Check that it works: open http://127.0.0.1:8001/health in the browser. It should show `{"status":"ok"}`. All endpoints are listed at http://127.0.0.1:8001/docs.

Stop it with Ctrl+C.

## Run the tests

From `ml/`:

    uv run pytest

## Folders

- `app/`: the ML service (FastAPI)
- `tests/`: tests for the ML service
- `pylaia/`: the PyLaia environment
- `data/`, `models/`: downloaded pages and models (not in Git, everyone downloads their own)
- `output/`: results of the ML service (not in Git, everyone has their own)
- `services/`: contains the ML-services such as segmentation, transcription, etc. Each service has its own .py file.
## Working together

- Add packages with `uv add <name>` (in `ml/` or `ml/pylaia/`) and push the updated `pyproject.toml` and `uv.lock`, so everyone has the same environment.
- Put personal experiments in `sandbox/`. It is not in Git.
