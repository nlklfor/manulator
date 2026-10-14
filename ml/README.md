# ml

Machine learning part of Manulator: finding and reading the lines on manuscript pages.

## Setup

Two environments, because PyLaia only works with an older Python:

    cd ml
    uv sync                 # main environment: Kraken, TrOCR, notebooks (Python 3.12)
    cd pylaia
    uv sync                 # PyLaia environment (Python 3.10)

In VS Code, choose the kernel `ml/.venv` for notebooks.

PyLaia is run from the terminal, not from a notebook. Copy `pylaia/example.yaml`, change the image paths, then:

    cd pylaia
    uv run pylaia-htr-decode-ctc --config my_config.yaml

## Download the models (once)

Models are not in Git, because they are too big. From `ml/`:

    cd pylaia
    uv run hf download Teklia/pylaia-home-alcar --local-dir ../models/pylaia-home-alcar
    cd ..
    mkdir -p models/catmus
    curl -L -o models/catmus/catmus-medieval.mlmodel \
      "https://zenodo.org/records/21488839/files/catmus-medieval-1.6.0.mlmodel?download=1"

Kraken's line finder comes with Kraken itself; nothing to download.

## Folders

- `htr/`: shared code for the project (on GitHub)
- `pylaia/`: the PyLaia environment (setup on GitHub; config files stay local)
- `sandbox/`: your own experiments (stays on your laptop)
- `data/`, `models/`, `results/`: downloaded data, models and outputs (stay on your laptop)

## Working together

- Add packages with `uv add <name>` (in `ml/` or `ml/pylaia/`) and push the updated `pyproject.toml` and `uv.lock`, so we both have the same environment.
- Try things in `sandbox/`; move code to `htr/` when it should be shared.
