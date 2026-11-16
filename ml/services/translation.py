from functools import lru_cache

import numpy as np
import torch
from transformers import AutoModelForCausalLM, AutoModelForSeq2SeqLM, AutoTokenizer, XLMForTokenClassification, \
    AutoModelForMaskedLM, AutoModelForTokenClassification

from app.config import settings

DEFAULT_MODEL = "RomanoAISPEC/helsinki_mul_en_large_cosine_v0"
QWEN_INSTRUCT = "Qwen/Qwen2.5-1.5B-Instruct"
GOOGLE_GEMMA3 = "google/gemma-3-27b-it"
DEFAULT_LANGUAGE = "English"
SENTENCE_SEGMENTER = "RomanoAISPEC/xlmr-latin-sentence-segmenter-la-en_v2"


@lru_cache(maxsize=2)
def load_sentence_segmenter(model_path: str = SENTENCE_SEGMENTER):
    tokenizer = AutoTokenizer.from_pretrained(model_path, token=settings.hf_token)
    model = AutoModelForTokenClassification.from_pretrained(model_path, token=settings.hf_token)
    model.to("cuda" if torch.cuda.is_available() else "cpu")
    return model, tokenizer

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


@lru_cache(maxsize=1)
def load_causal_lm(model_path: str = QWEN_INSTRUCT):
    """
    Loads an instruction-tuned LLM (e.g. Qwen Instruct) and its tokenizer.
    """
    tokenizer = AutoTokenizer.from_pretrained(model_path, token=settings.hf_token)
    model = AutoModelForCausalLM.from_pretrained(
        model_path,
        token=settings.hf_token,
        torch_dtype="auto",  # bf16/fp16 as stored in the checkpoint
    )
    model.to("cuda" if torch.cuda.is_available() else "cpu")
    model.eval()
    return model, tokenizer


# Joins the transcribed lines into one text, in line order,
# so sentences that run over several lines stay together
def combine_lines(lines: list[dict]) -> str:
    ordered = sorted(lines, key=lambda line: line["index"])
    return " ".join(line["text"].strip() for line in ordered if line.get("text"))

# A LLM splits the full text into sentences
# The model is fine tuned on Latin and English,
# so it can handle medieval Latin and the English translation.
def split_into_sentences(text: str, model, tokenizer, window = 250, stride = 150, threshold = 0.6) -> list[str]:
    words = text.split()

    if not words:
        return []
    # initialize empty propbabilities and counts
    probs, counts = np.zeros(len(words)), np.zeros(len(words))

    # overlapping windows, so words near a window edge still get context
    for start in range(0, len(words), stride):
        chunk = words[start:start + window]
        #
        enc = tokenizer(chunk, is_split_into_words=True, truncation=True,
                        max_length=512, return_tensors="pt").to(model.device)

        # Go in inference mode
        with torch.no_grad():
            # compute the probabilities that a token is a ending word
            p = model(**enc).logits.softmax(-1)[0, :, 1].cpu().numpy()

        # initialize empty set of seen words or tokens
        seen = set()

        for tok_idx, wid in enumerate(enc.word_ids()):
            # only process tokens we did not see yet
            if wid is not None and wid not in seen:
                seen.add(wid)
                # relative position to the chunk
                probs[start + wid] += p[tok_idx]
                counts[start + wid] += 1

        if start + window >= len(words):
            break

    probs /= np.maximum(counts, 1)

    sentences = []
    current = []

    for w, p in zip(words, probs):
        current.append(w)
        # if probability is larger than threshold
        # then add the sentence
        if p >= threshold:
            sentences.append(" ".join(current));
            current = []
    if current:
        sentences.append(" ".join(current))
    return sentences


# Translates a whole text with an instruction-tuned LLM
def translate_full_text(
    text: str, model, tokenizer, target_language: str, max_new_tokens: int = 2048
) -> str:

    if not target_language:
        language_instruction = DEFAULT_LANGUAGE
    else:
        language_instruction = target_language
    # In future the user might be able to define the prompt instruction, e.g. "Translate into English, but keep the Latin names of people and places."
    translation_prompt = (
        f"You are an expert in medieval Latin. Translate the user's text into {language_instruction} "
        "faithfully and completely. Do not add, omit or explain anything. "
        "If a word is unreadable or unclear, write [?]. "
        "Answer only with the translation."
    )
    messages = [
        {"role": "system", "content": translation_prompt},
        {"role": "user", "content": text},
    ]
    # Build the prompt in the chat format the model was trained on
    prompt = tokenizer.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True
    )
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

    # Greedy decoding: deterministic and less made-up text
    with torch.no_grad():
        output_ids = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=False,
            pad_token_id=tokenizer.eos_token_id,
        )

    # Decode only the new tokens, not the prompt
    new_tokens = output_ids[0][inputs.input_ids.shape[1] :]
    return tokenizer.decode(new_tokens, skip_special_tokens=True).strip()


# This method translates a single line or sentence
# of text using the given model and tokenizer.
def translate_line(text: str, model, tokenizer) -> str:
    # Tokenize the input text
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=256).to(
        model.device
    )

    # Generate translation
    outputs = model.generate(
        **inputs, max_length=256, num_beams=4, no_repeat_ngram_size=3
    )

    # Decode the output
    translation = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return translation


# run the translation model on the given lines of text
# the user determines whether the translation is done line by line,
# sentence by sentence, or the whole text at once
def run_translation(data: dict, options: dict | None = None) -> list[dict]:
    """
    Translates the given lines using a translation model.

    Args:
        data: A dictionary containing the lines to be translated.
        options: A dictionary containing options for the translation.
            "model" selects the model, QWEN_INSTRUCT by default.

    Returns:
        A list of translated lines. With the LLM the whole text is translated
        at once and returned as one entry with index 0.
    """
    options = options or {}
    translation_type = options["type"]
    # Fallback: the fine-tuned OPUS-MT model translates line by line
    if translation_type == "lines":
        model, tokenizer = load_model(DEFAULT_MODEL)

        translated_lines = []
        # in a first attempt we will try to translate each lines directly, without creating chunks
        for line in data["lines"]:
            input_text = line["text"]
            translated_text = translate_line(input_text, model, tokenizer)
            translated_lines.append({"index": line["index"], "text": translated_text})

        return translated_lines

    # Combine lines into one text to keep sentences intact
    full_text = combine_lines(data["lines"])
    if not full_text:
        return []

    if translation_type == "sentences":
        seg_model, seg_tokenizer = load_sentence_segmenter(SENTENCE_SEGMENTER)
        translation_model, translation_tokenizer = load_model(DEFAULT_MODEL)
        sentences = split_into_sentences(full_text, seg_model, seg_tokenizer)
        translated_sentences = []
        for i, sentence in enumerate(sentences):
            translated_text = translate_line(sentence, translation_model, translation_tokenizer)
            translated_sentences.append({"index": i, "text": translated_text})

        return translated_sentences

    # Default case translation type = full or none, the whole text is translated at once with a LLM
    model_name = QWEN_INSTRUCT

    # Default: the LLM translates the whole text, so sentences across lines stay intact
    model, tokenizer = load_causal_lm(model_name)
    target_language = options.get("target_language")
    return [
        {
            "index": 0,
            "text": translate_full_text(full_text, model, tokenizer, target_language),
        }
    ]
