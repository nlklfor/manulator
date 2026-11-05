# Translation models
  
  Issue: #141 · Story: #140 · Author: Romano Brentani · Last updated: 03-11-2026
  
  ## Question
  
  Which model translates our corrected Latin transcriptions into English well enough for a
  researcher to check the content?
  
  ## What we tried
  Models: google/mT5-small, google/ mT5-base, Helsinki-NLP/opus-mt-la-en.
  The model ByT5 has not been tested yet, but it might be a good option for noisy input (OCR errors, abbreviations, spelling variations).

  ## Train Data
  On Hugging face the follwing datasets might be suitable for training a translation model from Latin to English:
  - [grosenthal/latin_english_parallel](https://huggingface.co/datasets/grosenthal/latin_english_parallel))
  - [Geremia23/AquinasLatinEnglish]([https://huggingface.co/datasets/opus-mt-la-en-2](https://huggingface.co/datasets/Geremia23/AquinasLatinEnglish))
  - [LatinNLP/latin-summarizer-dataset](https://huggingface.co/datasets/LatinNLP/latin-summarizer-dataset)
  - 

  
  ## Test data
  The test data is a set of 10 Latin sentences with reference English translations. The set mixes
  encyclopedic sentences, well-known classical and biblical quotes, and medieval manuscript-style
  phrases (colophon, testament formula), because our input comes from manuscripts. The sentences are:

  | # | Latin | English reference |
  |---|-------|-------------------|
  | 1 | Roma est caput Italiae. | Rome is the capital of Italy. |
  | 2 | Gallia est omnis divisa in partes tres. | All Gaul is divided into three parts. |
  | 3 | Carolus Magnus anno 800 Romae imperator coronatus est. | Charlemagne was crowned emperor in Rome in the year 800. |
  | 4 | Monachi in monasterio libros antiquos diligenter describebant. | The monks in the monastery carefully copied old books. |
  | 5 | In principio erat Verbum, et Verbum erat apud Deum. | In the beginning was the Word, and the Word was with God. |
  | 6 | Danubius post Volgam flumen longissimum Europae est. | After the Volga, the Danube is the longest river in Europe. |
  | 7 | Hic liber scriptus est manu fratris Johannis anno Domini 1342. | This book was written by the hand of Brother John in the year of the Lord 1342. |
  | 8 | Medicus aegroto aquam calidam cum melle bibere iussit. | The physician ordered the sick man to drink warm water with honey. |
  | 9 | Si vis pacem, para bellum. | If you want peace, prepare for war. |
  | 10 | Item lego ecclesiae sancti Petri decem solidos pro anima mea. | Likewise, I bequeath ten shillings to the church of Saint Peter for my soul. |

  ## Results

  We fine-tuned `Helsinki-NLP/opus-mt-la-en` on 36,000 sentence pairs from
  `grosenthal/latin_english_parallel`. The fine-tuned model reached a BLEU score of about 35 and a
  chrF score of about 60.

  | Model | Training data | BLEU | chrF |
  |-------|---------------|------|------|
  | Helsinki-NLP/opus-mt-la-en (fine-tuned) | grosenthal/latin_english_parallel, 36,000 pairs | ~35 | ~60 |

  ## Decision
  Fine-tuned Opus-MT (BLEU ~35, chrF ~60) provides translations good enough for content checking. It is chosen as the baseline model; outputs must be reviewed by a researcher, and evaluation on real manuscript text is still required.

  ## Limitations

  - **Small test set:** 10 sentences are not enough for reliable scores. One sentence can shift
    BLEU by several points, so the test set only works as a sanity check.
  - **Possible overlap with training data:** well-known texts (Caesar, the Vulgate Bible) are
    likely part of `grosenthal/latin_english_parallel`. The model may have memorised them, which
    makes the scores look better than they are.
  - **Domain gap:** the training data is mostly clean classical Latin. Our input is medieval
    Latin from manuscripts, with different vocabulary, spelling (e.g. u/v, i/j, e for ae) and
    abbreviations. Scores on manuscript text are likely lower.
  - **Noisy input not tested:** we only tested clean, corrected text. Transcription or OCR
    errors that are not caught by the correction step will lower the quality further.
  - **Partial training data:** only 36,000 of the roughly 100,000 available pairs were used.
    More data could improve the results.
  - **Metric limits:** BLEU and chrF compare the output with a single reference translation.
    A correct translation with different wording gets a low score, and a fluent translation
    with a wrong detail (name, number, negation) can still score well. A researcher should
    check a sample of translations by hand.
  - **Sentence-level only:** the model translates sentence by sentence and has no context from
    the rest of the document. Long sentences may be cut off at the maximum input length.

  ## Sources

  -
