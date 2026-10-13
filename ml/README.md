 # ml

Machine learning part of Manulator: finding and reading the lines on manuscript pages.

## Setup

    cd ml
    uv sync

Then open a notebook in VS Code and choose the kernel `ml/.venv`.

## Folders                                                                               

- `htr/`: shared code for the project (on GitHub)
- `sandbox/`: your own experiments (stays on your laptop)
- `data/`, `models/`, `results/`: downloaded data, models and outputs (stay on your laptop)

## Working together

- Add packages with `uv add <name>` and push `pyproject.toml` and `uv.lock`, so we both have the same environment.
 - Try things in `sandbox/`; move code to `htr/` when it should be shared.