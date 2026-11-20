"""Write a short English summary of a translated manuscript page.

The translated text is sent to a language model together with PROMPT (below). The model is
the same as for classifying pages: CLASSIFIER_MODEL in ml/.env (see services/llm.py).
A researcher reads the summary to decide quickly whether the page is worth reading in full.
"""

from pydantic import BaseModel

from app.config import settings
from services.llm import get_model

PROMPT = """Below is the English translation of one page of a medieval manuscript. The page was read by handwriting recognition and then translated by machine, so the text may contain wrong words, garbled passages, broken sentences and Latin words left untranslated.

Summarise the page in English for a historian who wants to decide quickly whether it is worth reading in full.
- Write 3 to 5 short sentences, at most 100 words in total, as one plain paragraph (no headings, lists or markdown). Leave out minor details such as witnesses, seals, legal formulas and titles to stay short.
- Start with what kind of text it is (e.g. a charter, letter, chronicle entry, sermon) and its main point.
- Then give the essentials, as far as the text states them: who is involved, what is granted, sold, agreed, decided or described, where, and when.
- Give names and places as they appear in the text. Use a modern place name only when you are sure (e.g. Basilee -> Basel).
- Copy dates in the text's own words; do not convert them yourself. A medieval date such as "the ninth day before the Kalends of April" is NOT in April (it is 24 March): only add the modern date in brackets when you are sure, e.g. "the ninth day before the Kalends of April (24 March) 1291".
- Use only what is in the text: do not add background knowledge and do not guess. If a key point (e.g. the date) is missing or unreadable, say so briefly.
- If the text is too garbled to understand, say that in one sentence and summarise only the parts that are clear.

Translated text:
{text}"""


class Summary(BaseModel):
    summary: str


def summarize_text(text: str) -> Summary:
    """Ask the app's model (CLASSIFIER_MODEL in ml/.env) for a summary of a translated page."""
    ask, _ = get_model(settings.classifier_model)
    # Asked as plain text, not in a JSON format: inside JSON, Gemma 4 ended summaries mid-sentence
    summary = ask(PROMPT.format(text=text.strip())).strip()
    if not summary:
        raise RuntimeError("The model gave an empty summary")
    return Summary(summary=summary)
