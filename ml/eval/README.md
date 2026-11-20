# Testing the page classifier

Measures how often the classifier ([services/classification.py](../services/classification.py)) guesses a page's script and century correctly, on pages where experts know the answer.

- `clamm_classification.py`: script and century on 240 expert-labelled images from CLaMM 2017 (20 per script)
- `charters_classification.py`: century, language and document type on 8 Latin charters ([test_pages/charters](../test_pages/charters/README.md))

## Run

```bash
docker exec -w /app manulator-ml-1 python -m eval.clamm_classification
docker exec -w /app manulator-ml-1 python -m eval.charters_classification
```

Options: `--model local:Qwen/Qwen3.5-4B` (another model), `--batch 1` (240 new images). Answers are saved, so reruns are free.

## Choose the model

Set `CLASSIFIER_MODEL` in `ml/.env`, then `docker compose restart ml`:

- `claude-haiku-5-5` (default, cheap) or `claude-sonnet-5-5` (best, ~10x the price): needs `ANTHROPIC_API_KEY`
- `local:Qwen/Qwen3.5-4B` (free, runs inside the ML service like the translation models): any vision-language model from Hugging Face, written `local:<repo>`. It is downloaded into `ml/models` the first time (~9 GB) and uses the GPU when there is room, else the CPU (a few minutes per page). To give the ML service the GPU: `docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d`.

`local_models.sh` tests several free models in a row.

## Results (two sets of 240 images)

| Model | Script | Century | Cost per page |
| --- | --- | --- | --- |
| **Claude Sonnet 5.5** | **49%** | **68%** | ~$0.01 |
| Claude Haiku 5.5 (default) | 24% | 47% | <$0.001 |
| Gemma 4 12B (llama.cpp, own GPU)* | 19% | 31% | free |
| Qwen3.5-9B (own GPU)* | 11% | 19% | free |

\* measured before the local model was set to temperature 0 (same answer every time); rerun to update.

Random guessing gives 8% on script; the best CLaMM 2017 system reached 85%. Only Sonnet is useful for script and century. All models get language and document type almost always right.
