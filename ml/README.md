# ml

Machine learning part of Manulator: a small FastAPI service that runs the models for finding and reading the lines on manuscript pages. The main backend calls it; the browser never does.

Model choice and test results: [docs/research/ai-model-research.md](../docs/research/ai-model-research.md).

## Setup

Two environments, because PyLaia only works with an older Python:

    cd ml
    uv sync                 # ML service and Kraken (Python 3.12)
    cd pylaia
    uv sync                 # PyLaia (Python 3.10)

## Download the models (once)

The model for reading the lines (our fine-tuned Kraken, #124, results in
[docs/research/htr-finetuning.md](../docs/research/htr-finetuning.md)) is downloaded automatically
from Hugging Face ([isabusta/manulator-kraken](https://huggingface.co/isabusta/manulator-kraken)) the
first time a page is transcribed, and saved in `models/catmus-finetuned/`.
Kraken's line finder comes with Kraken itself; nothing to download.

The translation model is private on Hugging Face. Copy `.env.example` to `.env` or `.env` (`.env` wins if both set it) and set `HF_TOKEN` to an access token with read access to it. The model is downloaded on the first translation request.

The correction model ([RomanoAISPEC/byt5-small-latin-correction_v3](https://huggingface.co/RomanoAISPEC/byt5-small-latin-correction_v3), a fine-tuned ByT5) is private too and uses the same `HF_TOKEN`. It is downloaded on the first correction request. To use another model, set `CORRECTION_MODEL` in `.env`.

## Run the ML service

It runs on port 8001, so it doesn't clash with the main backend on port 8000. Start it from `ml/`:
    
    cd ml
    uv run uvicorn app.main:app --reload --port 8001

Check that it works: open http://127.0.0.1:8001/health in the browser. It should show `{"status":"ok"}`. All endpoints are listed at http://127.0.0.1:8001/docs.

Stop it with Ctrl+C.

## Transcribe a page

The pipeline finds the lines on a page (Kraken, `services/segmentation.py`) and then reads them (Kraken, `services/transcription.py`).

To try it, open http://127.0.0.1:8001/docs, then `POST /api/process-manuscripts/` → "Try it out". Choose a page image as `file` and use this as `process_plan`:

    {"manuscript_id": "page1", "steps": [], "plan": "Transcribe", "options": {}}

The text is saved in `output/transcription/page1/transcription.json`, one entry per line:

    [{"index": 0, "text": "comitibus Gallo et quodam diacono ..."}, ...]

To only find the lines, use `"Detect Lines"` instead of `"Transcribe"`. The results are in `output/segmentation/page1/` (line images and `overlay.jpg`).

The model file is set in `MODEL_FILE` at the top of `transcription.py`.

## Correct the text

The correction step (`services/correction.py`) fixes reading errors in the transcribed lines, for example `Domlni` → `Domini` or `fita eft` → `sita est`. Each line is sent through the correction model on its own. Afterwards the original and the corrected line are compared with the string edit distance, so you can see exactly which characters were changed.

The lines are sent as JSON, so no image is needed and the earlier steps are skipped. To try it, open http://127.0.0.1:8001/docs, then `POST /api/process-manuscripts/correct` → "Try it out", with this body:

    {
      "manuscript_id": "page1",
      "plan": "Correct",
      "type": "lines",
      "lines": [{"index": 0, "text": "In nomine Domlni nostri Iesu Chrifti, amen."}]
    }

`plan` must be `"Correct"` and `type` must be `"lines"`; both are the defaults and can be left out. More example requests are in [backend/test_correction.http](../backend/test_correction.http).

The answer has one entry per line, keyed by the line `index`. Empty lines are skipped:

    {
      "manuscript_id": "page1",
      "corrected_lines": {
        "0": {
          "original": "In nomine Domlni nostri Iesu Chrifti, amen.",
          "corrected": "In nomine Domini nostri Iesu Christi, amen.",
          "corrections": [
            {"type": "substitution", "original": "l", "corrected": "i", "start": 13, "end": 14},
            {"type": "substitution", "original": "f", "corrected": "s", "start": 33, "end": 34}
          ],
          "confidence": 0.0
        }
      },
      "success": true,
      "message": "Correction completed successfully"
    }

Each correction is one change to a single character. `type` is `substitution`, `deletion` or `insertion`. `start` and `end` are positions in the original line, so the frontend can highlight them. An insertion has `start == end`; the new character goes in at that position.

`confidence` is always `0.0` for now. The plan is to fill it in later from the transcription's confidence values.

## Run the tests

From `ml/`:

    uv run pytest

## Folders

- `app/`: the ML service (FastAPI)
- `services/`: the ML steps, one file each
  - `pipeline.py`: runs the steps in the right order (Detect Lines → Transcribe → Correct)
  - `segmentation.py`: step 1, find the lines (Kraken)
  - `transcription.py`: step 2, read the lines (Kraken)
  - `correction.py`: step 3, fix reading errors in the lines (ByT5) and list the changes
- `tests/`: tests
- `pylaia/`: the PyLaia environment (no longer used by the pipeline, to be removed)
- `data/`, `models/`: downloaded pages and models (not in Git, everyone downloads their own)
- `output/`: results of the pipeline (not in Git)

## Working together

- Add packages with `uv add <name>` (in `ml/` or `ml/pylaia/`) and push the updated `pyproject.toml` and `uv.lock`, so everyone has the same environment.
- Put personal experiments in `sandbox/`. It is not in Git.
