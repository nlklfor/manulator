"""Models from Hugging Face, kept in ml/models (git-ignored).

Each model is downloaded the first time it is needed and loaded from ml/models after that,
so the app works offline once the models are there.
"""

from pathlib import Path

import torch
from huggingface_hub import snapshot_download

from app.config import settings

MODELS_DIR = Path(__file__).resolve().parents[1] / "models"  # ml/models


def local_model(repo: str) -> Path:
    """Download a Hugging Face model into ml/models/<name> the first time; after that, use the saved copy."""
    folder = MODELS_DIR / repo.split("/")[-1]
    if not (folder / "config.json").exists():
        snapshot_download(repo, local_dir=folder, token=settings.hf_token)
    return folder


def best_device(needed_gb: float = 0) -> str:
    """The GPU if there is one with enough free memory (it may be shared with other jobs), else the CPU."""
    if torch.cuda.is_available():
        free_bytes, _ = torch.cuda.mem_get_info()
        if free_bytes / 1e9 >= needed_gb:
            return "cuda"
    return "cpu"
