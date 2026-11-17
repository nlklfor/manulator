# Fine-tuning the transcription models (PyLaia and Kraken)

Issue: #124 (PyLaia), #146 (Kraken) · Author: Isabelle Bustamante · Last updated: 17-11-2026

## Question

PyLaia HOME-Alcar (chosen in spike #22) reads charters and registers well, but not other kinds of
manuscripts. After fine-tuning, which model reads best across period, script, language and document
type: PyLaia or Kraken?

## What we tried

| Model | Started from | Why |
|---|---|---|
| PyLaia | [HOME-Alcar](https://huggingface.co/Teklia/pylaia-home-alcar) | The model Manulator uses now |
| Kraken | [CATMuS Medieval](https://zenodo.org/records/21488839) | Broad training data; Kraken also finds the lines |

Both were fine-tuned on the same 42,265 lines from [TRIDIS](https://huggingface.co/datasets/magistermilitum/Tridis).
None of these lines come from pages in the test set, so the models are tested on pages they have
never seen. Kraken trained for 4 epochs and PyLaia for 5. We stopped when one more epoch improved the
result by only about 1 point.

## Test data

The frozen test set `ml/test_set/test_lines.csv`: 9,493 lines from TRIDIS and CATMuS Medieval, never used
for training. Measure: CER (wrong characters ÷ all characters, lower is better), against full words.

## Results

| Model | Before | After |
|---|---|---|
| **Kraken** | 20.1% | **15.8%** |
| PyLaia | 21.7% | 20.2% |

- Kraken is better in almost every group (period, script, language, document type).
- Biggest gains: German 48% → 22%, Dutch 53% → 23%, 16th–17th century 38% → 16%.
- PyLaia was close to Kraken only on charters (18.4% vs 18.8%). On registers it got worse after
  training (17.5% → 23.8%): it learned the new documents but partly forgot the old ones.

## Decision

Use the fine-tuned Kraken for reading the lines. It is 4.4 points better and simpler (one tool, one
Python environment). The model will be on Hugging Face.

## Limitations

- Still about 1 wrong letter in 6, so users must correct the text.
- Tested on cut-out lines; finding the lines on a page adds errors.
- Part of the CATMuS correct text was written out by an LLM (48 of 50 checked lines right).
