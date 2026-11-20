#!/usr/bin/env bash
# Test free models that run inside the ML service (no API key, no cost), one after another.
#
# For each Hugging Face model it runs both tests (charters and CLaMM) and saves the output in
# ml/results/local_<model>.txt. Each model is downloaded into ml/models the first time.
#
# Run the default models:         ml/eval/local_models.sh
# Run models of your choice:      ml/eval/local_models.sh Qwen/Qwen3.5-4B Qwen/Qwen3-VL-2B-Instruct
#
# Optional settings, put in front of the command:
#   CLAMM_ARGS="--batch 1"   extra options for the CLaMM test, e.g. a new set of images
#   TAG=batch1               added to the output file names, so earlier results are not overwritten

set -u
cd "$(dirname "$0")/.."  # work in the ml folder
CLAMM_ARGS=${CLAMM_ARGS:-}
TAG=${TAG:-}

if [ $# -gt 0 ]; then
  MODELS=("$@")
else
  MODELS=("Qwen/Qwen3.5-4B" "Qwen/Qwen3-VL-2B-Instruct")
fi

for repo in "${MODELS[@]}"; do
  name=$(basename "$repo" | tr '[:upper:]' '[:lower:]')
  output_file=results/local_$name${TAG:+_$TAG}.txt
  echo "== $repo"
  {
    docker exec -w /app manulator-ml-1 python -m eval.charters_classification --model "local:$repo"
    # One image at a time: the local model answers one question at a time anyway
    docker exec -w /app manulator-ml-1 python -m eval.clamm_classification --model "local:$repo" \
      --workers 1 $CLAMM_ARGS
  } > "$output_file" 2>&1
  grep -E "^local:|=== (Script|Century)|failed" "$output_file" | sed 's/^/   /'
done
