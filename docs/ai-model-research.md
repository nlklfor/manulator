 # Summary Research

Based on papers and tool documentation only. Nothing has been tested on our own pages yet. I used Claude to help to compile the tables; I chose the papers and wrote up the findings.

## Scope

Research and datasets cover mostly European manuscripts in Latin script (medieval and early modern)

## Pipeline Proposal

page image → find the lines → read each line → translate the text

Other option would be one VLM that looks at the whole page and writes the text directly.

## 1. Find the lines Task

Model gets the whole page and marks where each line of text is.Reading models only read one line at a time, so this step is necessary.


### Findings 

| Paper | Model | Architecture | Manuscripts used | How well it worked | Available? | Output |
| --- | --- | --- | --- | --- | --- | --- |
| Kiessling et al. 2019 + Kraken docs | Kraken segmenter | U-Net + rules | Arabic/Persian manuscripts; Latin-script archives 1470–1930 | Found almost all lines on simple pages; weaker on margins and decorated text | Yes | Baseline + outline, straightened line images |
| Grüning et al. 2019 | ARU-Net | U-Net + attention + rules | 11th–20th c. archives, incl. medieval Latin | Found almost all lines on simple pages; still good on complex pages | Code on GitHub | Baseline |
| Alberti et al. 2019 | Segmentation + seam carving | ResNet-18 + rules | 11th c. Latin, 14th c. Italian | Near perfect on medieval pages | Code on GitHub | Line outlines |
| Kiessling 2022 | CurT | Transformer | European archives, Latin script | Good, slightly below the others | Not stated | Baseline (curve) |

Note: Kraken's segmenter was not tested on medieval Latin in the paper.



- Papers report very good results on simple single-column pages.
- Notes in the margins are hard to find.
- big decorated letters and multiple columns or text that is slanted
make it harder.
- Most methods use a U-Net: a fully cnn that labels every pixel as "part of a line" or "not a line". Rules then turn this into line positions. Each line is cut out of the original page as its own image, and these line images go to the transcription model.
- Kraken is an open-source tool that does this, free, has pre-trained models, saves lines together with their positions.

suggestion: use Kraken for line finding. Start with its pretrained model and only train it further if it doesn't work well on our pages.


 ## 2. Reading the text (transcription) Task

 Model gets image of a line (from the line finding): handwritten text recognition (HTR). Quality is measured with the character error rate (CER), (the percentage of characters that are wrong).

### Findings 

| Paper | Model | Architecture | Manuscripts used | How well it worked | Available? | Needs lines cut first? |
| --- | --- | --- | --- | --- | --- | --- |
| Meoded 2025 | TrOCR | Transformer encoder–decoder | 16th c. Latin, one writer | About 2 wrong characters per 100 after fine-tuning (only one writer) | Yes | Yes |
| Torres Aguilar & Jolivet 2023 | CNN + LSTM (runs in Kraken) | CNN + BiLSTM | 12th–15th c. Latin and French, many writers | 6–17 wrong characters per 100 on new manuscripts; clearly better after fine-tuning on 10 pages | Yes | Yes |
| Semnani et al. 2025 | CHURRO | Vision-language model | 99k pages, 46 languages | Roughly 30 wrong characters per 100 on handwriting; sometimes invents text | Yes | No |


- CNN + LSTM (e.g. Kraken models): the CNN picks up the stroke shapes, and the LSTM reads them from left to right. Reads one line at a time, so it needs line finding first. Pretrained medieval models exist and can be fine-tuned on a few pages.
- Transformer (e.g. TrOCR): the encoder looks at the line image, and the decoder writes the text. Also reads one line at a time. accurate after fine-tuning, this was tested on a single writer and not multiple.
- VLM (e.g. CHURRO): reads the whole page at once, so no line finding needed. But it gives no line positions, makes more errors on handwriting, hallucinations

- Specialized smaller models perform better than big general ones, model has to match the script
- Fine-tuning works with little data
- VLMs are more prone to hallucination, this is a risk to better avoid for history students

suggestion: use a specialized line model that is already trained on medieval Latin, and fine-tune it on our pages. We can decide between the Kraken-style and the TrOCR-style model after testing both on a few pages.

### PyLaia

Our professor suggested PyLaia instead of Kraken's own reading model. Kraken still does the line finding.

- PyLaia is an open-source HTR toolkit built on PyTorch, maintained by Teklia.
- Same model type as Kraken's reading model: CNN + BiLSTM, trained with CTC on line images and their text. CTC means the training data only needs the text of each line, not where each letter is.
- Reads one line at a time, so it needs line finding first (Kraken).
- Can add a character language model (n-gram) when decoding. It predicts which characters are likely to come next and fixes some reading errors. Teklia reports about 12% lower CER on average with it.
- Gives a confidence score per line, useful to flag lines a person should check.

### Pretrained models we can test

Both PyLaia (CNN + BiLSTM) and TrOCR (transformer), so we compare the two model types.

| Model | Type | Trained on | Note |
| --- | --- | --- | --- |
| Teklia/pylaia-home-alcar | PyLaia | Himanis (French) + HOME-Alcar (Latin), medieval | lines resized to 128 px height |
| Teklia/pylaia-himanis | PyLaia | Himanis (French) + HOME-Alcar (Latin), medieval | lines resized to 128 px height |
| johnlockejrr/pylaia_catmus_medieval | PyLaia | CATMuS medieval, Latin and Romance languages | made by one person, not Teklia |
| dh-unibe/trocr-medieval-escriptmask | TrOCR | CREMMA, HIMANIS, Itinera Nova, Königsfelden charters | University of Bern, generic model for medieval Latin scripts |
| medieval-data/trocr-medieval-latin-caroline | TrOCR | CATMuS medieval, Caroline script | Caroline is the script of our Saint Gall test page; model page says it needs more fine-tuning |

- We test all models on the same pages (Saint Gall).
- None of the models was trained on Saint Gall, so we expect a higher CER on our pages.
- TrOCR's decoder writes the text piece by piece like a language model, so it can invent text that is not on the page. PyLaia can't do that as easily.

plan: Kraken finds the lines, then PyLaia and TrOCR models read the same line images, and we compare their CER on the Saint Gall pages.

## 3. Translation 

The Latin text from gets translated into a modern language

### Findings

### Translation

| Paper | Model | Architecture | Texts used | How well it worked | Available? | Key point for us |
| --- | --- | --- | --- | --- | --- | --- |
| Bui et al. 2026 | HTR model + GPT-4o | Specialized HTR + LLM that sees image and text | Medieval manuscripts, Latin → English | Moderate: meaning often right, but details missing or wrong | Paid | Simplest setup worked best |
| Rosu 2025 | LITERA | Chain of LLM calls | Clean Latin → English | Good on clean text | Paid; free version weaker | Literal translation works well |


- one paper matched our pipeline for medieval Latin manuscripts: a specialized reading model, then an LLM that gets both the image and the transcription and translates it. 
- Translation of medieval manuscripts is still hard: old Latin, abbreviations, and reading errors from the transcription step.
- A line on a manuscript page ends wherever the page ends, not where the sentence ends. So one line is often a fragment
- free open-source model fine-tuned on Latin is possible, but worse than paid
- All papers only translated into English. French or German isn't tested anywhere.
- LLMs sometimes refused to translate very noisy text, sometiemes fluent translations were produced but with  wrong translations
- One paper (LITERA) shows that a literal translation, close to the Latin structure, works well and is easier to check.


## Sources

### Line finding
- Rabaev & Litvak (2025): Survey of text line segmentation and baseline detection in historical documents. *IJDAR*.
- Kiessling, Stökl Ben Ezra & Miller (2019): BADAM, a dataset for baseline detection in Arabic-script manuscripts (basis of Kraken's line finding). *HIP '19*.
- Kraken documentation: <https://kraken.re>
- eScriptorium documentation: <https://escriptorium.readthedocs.io>

### Transcription
- Meoded (2025): HTR of historical manuscripts using transformer-based models (TrOCR). *arXiv*.
- Torres Aguilar & Jolivet (2023): HTR for documentary medieval manuscripts. *JDMDH*.
- Semnani et al. (2025): CHURRO, a vision-language model for historical text recognition. *arXiv*.
- Teklia (2024): improvements to PyLaia (confidence scores, language models). *arXiv* 2404.18722.
- PyLaia code: <https://github.com/jpuigcerver/PyLaia>
- Model pages: <https://huggingface.co/Teklia/pylaia-home-alcar>, <https://huggingface.co/Teklia/pylaia-himanis>, <https://huggingface.co/johnlockejrr/pylaia_catmus_medieval>, <https://huggingface.co/dh-unibe/trocr-medieval-escriptmask>, <https://huggingface.co/medieval-data/trocr-medieval-latin-caroline>

### Translation
- Bui et al. (2026): Evaluating translation pipelines for medieval Latin manuscripts. *arXiv*.
- Rosu (2025): LITERA, LLM-based Latin-to-English translation. *NAACL Findings*.
- Momtaz et al. (2025): Kraken and ByT5 pipeline for early printed books. *Electronics*.

### Test data (Saint Gall / IAM-HistDB)
- Fischer et al. (2011): Transcription alignment of Latin manuscripts (Saint Gall dataset). *HIP '11*.
- Fischer et al. (2010): Ground truth creation for handwriting recognition in historical documents (IAM-HistDB). *DAS '10*.
