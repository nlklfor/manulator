# Gemini hand test (#206)

Tested on 16.11.2026 in Google AI Studio, by Gui with Claude

## Result

Gemini is good enough for language detection, translation and summary, so we can start #204. Categorization from the page image is not tested yet

| Page | Year | Place | Language | Summary | Translation | Categorization |
| --- | --- | --- | --- | --- | --- | --- |
| U-17_0002_r | 1291 | Säckingen | Latin ✅ | ✅ 78 words, 25 s | ✅ 8 sentences, 44 s | not run |
| U-17_0234_r | 1350 | Basel | Latin ✅ | ✅ 72 words, 22 s | ✅ 6 sentences, 75 s | not run |
| U-17_0616_r | 1442 | Basel | Latin ✅ | ✅ 78 words, 49 s | ✅ 10 sentences, 65 s | not run |

Times are how long Gemini took to answer

## Setup

- Model: Gemini 4 Hydrogen (`gemini-4-hydrogen`), free tier in Google AI Studio
- Thinking level: High, Google Search grounding off
- A new chat for every test, so earlier answers don't influence the next one
- Pages: 3 Königsfelden charters from `ml/test_pages/charters/` (images from the original dataset on Zenodo, doi 10.5281/zenodo.5179361)
- Input: the correct transcription, lines joined into running text (`original.txt`)
- About 20 requests in total, no free-tier limit was hit

## What worked

- Language: Latin on all 3 pages, answer exactly in the asked JSON format
- Summary: right people, places and dates on all 3 pages (24 March 1291, Basel 1350, 10 April 1442), under 80 words, says "not stated" instead of guessing
- Translation: valid JSON, one Latin sentence with its English per entry, so the backend can link sentences back to lines
- Modern place names when asked: Reitnau, Othmarsingen, Hendschiken, Dottikon, Beromünster, Säckingen, Königsfelden, Erlinsbach, Schinznach

## Problems

- Slow with thinking on High: summary 20 to 50 s, translation 45 to 75 s. Try a lower thinking level, or show a loading state in the app
- The number of sentences changes between runs (the 1350 charter came back once as 7 and once as 6 sentences), so the backend must not expect a fixed number
- The last line of the 1442 charter ("excerpta gratia Johannes Werneri", a chancery note) was translated literally as "Extracted by grace"
- A first version of the prompts kept place names in Latin (Basilee, Seconiensi) and ignored "numbered list". The prompts in `prompts.md` fix both

## Not done yet

- Categorization from the page image: AI Studio asks to accept that uploaded images may be used by Google to improve its products. Needs the team's OK first

## Files

- `prompts.md`: the exact prompts
- `<page>/original.txt`: the Latin text sent to Gemini
- `<page>/summary.md`, `<page>/translation.json`, `<page>/translation.md` (readable side by side), `<page>/language.json`: Gemini's answers
