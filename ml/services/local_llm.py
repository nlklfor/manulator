"""A free vision-language model that runs inside the ML service, like the translation models.

Chosen with CLASSIFIER_MODEL=local:<Hugging Face repo> in ml/.env, e.g. local:Qwen/Qwen3.5-4B.
The model is downloaded into ml/models the first time (services/hf_models.py) and runs on the
GPU when one with enough free memory is there, otherwise on the CPU (slower: a few minutes per page).

This model cannot be forced to answer in our format, so the prompt asks for JSON in our format
and read_answer() (services/llm.py) fixes small mistakes instead of failing.
"""

import io
import re
import threading
from functools import lru_cache

import torch
from PIL import Image
from pydantic import BaseModel
from transformers import AutoModelForImageTextToText, AutoProcessor

from services.hf_models import best_device, local_model
from services.llm import json_instructions, read_answer

MAX_IMAGE_SIDE = 1280  # px; larger pages are scaled down, which is much faster on the CPU
MAX_NEW_TOKENS = 600
one_at_a_time = threading.Lock()  # one model in memory, so one question at a time


@lru_cache(maxsize=1)
def load(repo: str):
    folder = local_model(repo)
    size_gb = sum(file.stat().st_size for file in folder.glob("*.safetensors")) / 1e9
    device = best_device(needed_gb=size_gb + 1.5)  # weights + ~1.5 GB for the page and the answer
    processor = AutoProcessor.from_pretrained(folder)
    model = AutoModelForImageTextToText.from_pretrained(folder, dtype=torch.bfloat16)
    return processor, model.to(device).eval()


def ask_local(prompt: str, answer_type: type[BaseModel] | None, image, repo: str):
    """Ask the local model; image is a services.llm.PageImage or None."""
    processor, model = load(repo)
    if answer_type:
        prompt += "\n\n" + json_instructions(answer_type)
    content: list[dict] = [{"type": "text", "text": prompt}]
    if image:
        content.insert(0, {"type": "image", "image": open_image(image.data)})
    inputs = processor.apply_chat_template(
        [{"role": "user", "content": content}],
        add_generation_prompt=True, tokenize=True, return_dict=True, return_tensors="pt",
        enable_thinking=False,  # Qwen3.5: answer directly, without writing its thoughts first
    ).to(model.device)
    with one_at_a_time, torch.inference_mode():
        # do_sample=False: always the most likely answer, so the same page gives the same result
        output = model.generate(**inputs, max_new_tokens=MAX_NEW_TOKENS, do_sample=False)
    text = processor.decode(output[0, inputs["input_ids"].shape[1]:], skip_special_tokens=True)
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()
    return read_answer(text, answer_type) if answer_type else text


def open_image(data: bytes) -> Image.Image:
    picture = Image.open(io.BytesIO(data)).convert("RGB")
    picture.thumbnail((MAX_IMAGE_SIDE, MAX_IMAGE_SIDE))
    return picture
