from functools import lru_cache

import torch
import numpy as np
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

from app.config import settings


@lru_cache(maxsize=2)
def load_correction_model(model_path: str):
    """
    Loads a correction model and tokenizer from the given path.
    """
    # The model is private, so Hugging Face needs the token (HF_TOKEN in ml/.env)
    tokenizer = AutoTokenizer.from_pretrained(model_path, token=settings.hf_token)
    model = AutoModelForSeq2SeqLM.from_pretrained(model_path, token=settings.hf_token)
    model.to("cuda" if torch.cuda.is_available() else "cpu")
    return model, tokenizer


# This method corrects a single line or sentence
# of text using the given model and tokenizer.
def correct_line(text: str, model, tokenizer) -> str:
    # Tokenize the input text
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=512).to(
        model.device
    )

    # Generate correction
    outputs = model.generate(
        **inputs, max_length=512, num_beams=4, no_repeat_ngram_size=3
    )

    # Decode the output
    correction = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return correction


def run_correction(data: dict, options: dict = None) -> dict:
    model_id = settings.correction_model
    model, tokenizer = load_correction_model(model_id)
    options = options or {}
    correction_type = options["type"]
    # Fallback: the fine-tuned OPUS-MT model translates line by line
    result = {}
    if correction_type == "lines":
        for line in data["lines"]:
            input_line = line["text"].strip()
            if input_line == "":
                # skip empty lines
                continue

            corrected_line = correct_line(input_line, model, tokenizer)

            # compute the edit distance between the original and corrected line
            corrections = string_edit_distance(input_line, corrected_line)
            index = line["index"]
            result.update({
                index: {
                    "original": input_line,
                    "corrected": corrected_line,
                    "corrections": corrections,
                    # Note: No confidence values are added yet
                    # The confidence must be read from the database
                    "confidence": 0.0
                }
            })

    return result


# This method computes the edit distance between two strings and returns a list of corrections.
# It returns the list of corrections in the order they appear in the original string
# The corrections represent the edit operations needed to transform the original string into the corrected string.
def string_edit_distance(original: str, corrected: str) -> list[dict]:
    n, m = len(original), len(corrected)

    D = np.zeros((n + 1, m + 1), dtype=int)
    P = np.zeros((n + 1, m + 1), dtype=int)  # 1 = diag, 2 = up, 3 = left

    DIAG, UP, LEFT = 1, 2, 3
    c_del, c_ins = 1, 1

    for i in range(1, n + 1):
        D[i, 0] = D[i - 1, 0] + c_del
        P[i, 0] = UP

    for j in range(1, m + 1):
        D[0, j] = D[0, j - 1] + c_ins
        P[0, j] = LEFT

    for i in range(1, n + 1):
        for j in range(1, m + 1):
            c_sub = 0 if original[i - 1] == corrected[j - 1] else 1
            m1 = D[i - 1, j - 1] + c_sub
            m2 = D[i - 1, j] + c_del
            m3 = D[i, j - 1] + c_ins
            D[i, j] = min(m1, m2, m3)
            # case substitution
            if D[i, j] == m1:
                P[i, j] = DIAG
            # case deletion
            elif D[i, j] == m2:
                P[i, j] = UP
            # case insertion
            else:
                P[i, j] = LEFT

    # Backtrace: follow P from (n, m) to (0, 0)
    corrections = []
    i, j = n, m
    while i > 0 or j > 0:
        if P[i, j] == DIAG:
            if original[i - 1] != corrected[j - 1]:
                corrections.append({"type": "substitution", "original": original[i - 1],
                                    "corrected": corrected[j - 1], "start": i - 1, "end": i})
            i, j = i - 1, j - 1
        elif P[i, j] == UP:
            corrections.append({"type": "deletion", "original": original[i - 1],
                                "corrected": "", "start": i - 1, "end": i})
            i = i - 1
        else:
            corrections.append({"type": "insertion", "original": "",
                                "corrected": corrected[j - 1], "start": i, "end": i})
            j = j - 1
    # turn the correction list
    corrections.reverse()
    return corrections
