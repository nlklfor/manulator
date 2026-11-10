from functools import lru_cache

import torch
from transformers import (AutoTokenizer, AutoModelForSeq2SeqLM)

from app.config import settings

DEFAULT_MODEL = "RomanoAISPEC/helsinki_mul_en_large_cosine_v0"


@lru_cache(maxsize=2)
def load_model(model_path: str):
    """
    Loads a translation model and tokenizer from the given path.
    """
    # The model is private, so Hugging Face needs the token (HF_TOKEN in ml/.env)
    tokenizer = AutoTokenizer.from_pretrained(model_path, token=settings.hf_token)
    model = AutoModelForSeq2SeqLM.from_pretrained(model_path, token=settings.hf_token)
    model.to("cuda" if torch.cuda.is_available() else "cpu")
    return model, tokenizer


# This method translates a single line of text using the given model and tokenizer.
def translate_line(text: str, model, tokenizer) -> str:
    # Tokenize the input text
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=256).to(model.device)

    # Generate translation
    outputs = model.generate(**inputs, max_length=256, num_beams=4, no_repeat_ngram_size=3)

    # Decode the output
    translation = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return translation

    # run the translation model on the given lines of text
def run_translation(data: dict, options: dict = None) -> list[dict]:
    """
    Translates the given lines using a translation model.

    Args:
        data: A dictionary containing the lines to be translated.
        options: A dictionary containing options for the translation.

    Returns:
        A dictionary containing the translated lines.
    """
    if options and options["target_language"] == "en":
        model_path = "RomanoAISPEC/helsinki_mul_en_large_cosine_v0"
        model, tokenizer = load_model(model_path)
    else:
        model, tokenizer = load_model(DEFAULT_MODEL)

    translated_lines = []
    # in a first attempt we will try to translate each lines directly, without creating chunks
    for line in data["lines"]:
        input_text = line["text"]
        translated_text = translate_line(input_text, model, tokenizer)
        translated_lines.append({"index": line["index"], "text": translated_text})

    return translated_lines
