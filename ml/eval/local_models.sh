#!/usr/bin/env bash
# Test free models that run on our own GPU (no API key, no cost).
#
# For each model it: 1. starts llama.cpp's server in Docker with that model (downloads it the first time),
#                    2. runs both tests (charters and CLaMM) against it,
#                    3. saves the output in ml/results/local_<model>.txt.
# At the end it stops the server, so the GPU is free again.
#
# Run all default models:           ml/eval/local_models.sh
# Run one model of your choice:     ml/eval/local_models.sh "ggml-org/gemma-4-12B-it-GGUF:Q4_0"
#   (a model is "huggingface-repo:size". Add "|more server options" after it if needed.)
#
# Optional settings, put in front of the command:
#   PARALLEL=2               send 2 images at a time (faster; needs more GPU memory)
#   CLAMM_ARGS="--batch 1"   extra options for the CLaMM test, e.g. a new set of images
#   TAG=batch1               added to the output file names, so earlier results are not overwritten

set -u
cd "$(dirname "$0")/.."  # work in the ml folder
PARALLEL=${PARALLEL:-1}
CLAMM_ARGS=${CLAMM_ARGS:-}
TAG=${TAG:-}

if [ $# -gt 0 ]; then
  MODELS=("$@")
else
  MODELS=(  # the two best compact models we tested (fit in a 12 GB GPU)
    "ggml-org/gemma-4-12B-it-GGUF:Q4_0"
    "unsloth/Qwen3.5-9B-GGUF:Q6_K"
  )
fi

for model in "${MODELS[@]}"; do
  # Split "repo:size|options" into its parts and make a short name, e.g. "gemma-4-12b-it"
  repo=${model%%|*}
  options=""
  if [[ $model == *"|"* ]]; then options=${model#*|}; fi
  name=$(basename "${repo%%:*}" -GGUF | tr '[:upper:]' '[:lower:]')
  output_file=results/local_$name${TAG:+_$TAG}.txt
  echo "== $name"

  # 1. Start the model server. --reasoning-budget 0 turns off "thinking":
  #    otherwise some models write thousands of words before answering.
  docker rm -f llama-server >/dev/null 2>&1
  docker run -d --name llama-server --gpus all -p 8080:8080 --network manulator_default \
    -e LLAMA_CACHE=/models -v "$HOME/.cache/llama.cpp:/models" \
    ghcr.io/ggml-org/llama.cpp:server-cuda \
    -hf "$repo" --host 0.0.0.0 --port 8080 -ngl 99 \
    -np "$PARALLEL" -c $((16384 * PARALLEL)) --reasoning-budget 0 $options >/dev/null

  # Wait until it is ready (the first time it must download the model, which takes a few minutes)
  until curl -sf localhost:8080/health >/dev/null; do
    if [ "$(docker inspect -f '{{.State.Running}}' llama-server)" != true ]; then
      echo "   the server stopped, skipping this model:"
      docker logs --tail 5 llama-server 2>&1 | sed 's/^/   /'
      continue 2
    fi
    sleep 5
  done

  # 2. Run both tests
  {
    docker exec -w /app manulator-ml-1 python -m eval.charters_classification --model "local:$name"
    docker exec -w /app manulator-ml-1 python -m eval.clamm_classification --model "local:$name" \
      --workers "$PARALLEL" $CLAMM_ARGS
  } > "$output_file" 2>&1

  # 3. Show the main scores
  grep -E "^openai-compatible|=== (Script|Century)|failed" "$output_file" | sed 's/^/   /'
done

docker rm -f llama-server >/dev/null 2>&1  # free the GPU
