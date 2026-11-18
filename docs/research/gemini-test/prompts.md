# Prompts used

Copied exactly as sent. `{TEXT}` is replaced by the page text from `original.txt`

## Language

```
Which language is this text written in? Answer with JSON only.
Choose one value: ["Latin", "French", "German", "Italian", "Spanish", "Dutch", "English", "other", "unknown"]
Format: {"language": "..."}

Text:
{TEXT}
```

## Summary

```
Summarise this medieval Latin charter in English in 3 to 4 short sentences (at most 80 words): who is involved, what is agreed or transferred, where and when.
Use the modern name of a place when you are sure (e.g. Basilee -> Basel). Use only what is in the text. If something is not stated, say so instead of guessing.

Text:
{TEXT}
```

## Translation

```
Translate this medieval Latin charter into English. The transcription lines were joined into running text.
Split the text into sentences and translate each sentence. Use the modern English or local name of a place or person when you are sure (e.g. Basilee -> Basel), otherwise keep the Latin form. Do not add explanations.
Answer with JSON only, in this format:
{"sentences": [{"latin": "...", "english": "..."}]}

Text:
{TEXT}
```

## Categorization (not run yet, needs the page image)

```
You are helping to catalogue a medieval manuscript page. Look at the image and answer with JSON only, no other text.
Choose exactly one value from each list. If you are not sure, answer "unknown". Do not invent values.

century: ["XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "unknown"]
script: ["Caroline", "Cursiva", "Half-Uncial", "Humanistic", "Humanistic Cursive", "Hybrida", "Praegothica", "Semihybrida", "Semitextualis", "Southern Textualis", "Textualis", "Uncial", "unknown"]
region: ["France", "German lands", "Swiss lands", "Italy", "Iberia", "Low Countries", "British Isles", "other", "unknown"]
document_type: ["charter", "register", "codex", "letter", "other", "unknown"]

Answer in this format:
{"century": "...", "script": "...", "region": "...", "document_type": "..."}
```
