# Testing the page classifier

Measures how often the classifier ([services/classification.py](../services/classification.py)) guesses a page's script and century correctly, on pages where experts know the answer.

- `clamm_classification.py`: script and century on 240 expert-labelled images from CLaMM 2017 (20 per script)
- `charters_classification.py`: century, language and document type on 8 Latin charters ([test_pages/charters](../test_pages/charters/README.md))

## Run

```bash
docker exec -w /app manulator-ml-1 python -m eval.clamm_classification
docker exec -w /app manulator-ml-1 python -m eval.charters_classification
```

Options: `--model local:gemma-4-12b-it` (another model), `--batch 1` (240 new images). Answers are saved, so reruns are free.

## Choose the model

Set `CLASSIFIER_MODEL` in `ml/.env`, then `docker compose restart ml`:

- `claude-haiku-5-5` (default, cheap) or `claude-sonnet-5-5` (best, ~10x the price): needs `ANTHROPIC_API_KEY`
- `local:gemma-4-12b-it` or `local:qwen3.5-9b` (free, on our GPU): start llama.cpp with that model first:

```bash
docker run -d --name llama-server --gpus all -p 8080:8080 --network manulator_default \
  -e LLAMA_CACHE=/models -v "$HOME/.cache/llama.cpp:/models" ghcr.io/ggml-org/llama.cpp:server-cuda \
  -hf ggml-org/gemma-4-12B-it-GGUF:Q4_0 --host 0.0.0.0 --port 8080 -ngl 99 -c 16384 --reasoning-budget 0
```

For Qwen3.5-9B use `-hf unsloth/Qwen3.5-9B-GGUF:Q6_K`. The name after `local:` is only a label: the app uses the model the container runs.

`local_models.sh` tests several free models in a row.

## Results (two sets of 240 images)

| Model | Script | Century | Cost per page |
| --- | --- | --- | --- |
| **Claude Sonnet 5.5** | **49%** | **68%** | ~$0.01 |
| Claude Haiku 5.5 (default) | 24% | 47% | <$0.001 |
| Gemma 4 12B (own GPU)* | 19% | 31% | free |
| Qwen3.5-9B (own GPU)* | 11% | 19% | free |

\* measured before the local model was set to temperature 0 (same answer every time); rerun to update.

Random guessing gives 8% on script; the best CLaMM 2017 system reached 85%. Only Sonnet is useful for script and century. All models get language and document type almost always right.
