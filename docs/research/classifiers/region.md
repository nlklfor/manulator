# Classifier: region

Task: #158 · Spike: #160

## Datasets
I found the following datasets that might be useful for training a region classifier. 
However, these datasets are limited to specific regions (e.g. France). Also those datasets provide samples as lines. 
So for training it might be necessary to either crop the lines from the pages or stack 4-6 lines from the same manuscripts into a squared image. Have a look at the following datasets:
[ICDAR 2021 Historical Document Classification Dataset for Task 3 - Location](https://zenodo.org/records/4836707?utm_source=chatgpt.com)    ICDAR 2021 Historical Document Classification Dataset for Task 3 - Location
[CATMuS Medieval Dataset](https://huggingface.co/datasets/CATMuS/medieval)
[CATMuS medieval-segmentation](https://huggingface.co/datasets/CATMuS/medieval-segmentation)

## Benchmarks

We do not build our own benchmark. We evaluate on the existing splits of the datasets listed above:

| Benchmark | Split | Label | Metric |
|---|---|---|---|
| [ICDAR 2021 HDC Task 3 – Location](https://zenodo.org/records/4836707) | Official train set (record 4836707) / test set ([record 7849576](https://zenodo.org/records/7849576)) | Location of the manuscript | Accuracy / macro-F1 (comparable with the competition results) |
| [CATMuS Medieval](https://huggingface.co/datasets/CATMuS/medieval) | Official `train` / `validation` / `test` splits | `region` column | Macro-F1, confusion matrix |

Notes:

- **Do not use CATMuS' `gen_split` column.** It puts lines of every manuscript into train, val and test
  (90/5/5), so the model can memorise individual manuscripts instead of learning the region.
- CATMuS consists of line images. For DINOv2, lines from the same manuscript are stacked into a
  roughly square tile (see Datasets).
- Results are reported per manuscript (average of the predictions for all its lines/tiles).

## Test pages

## Pretrained models

Image models (main approach):

| Model | Source | Why |
|---|---|---|
| ResNet-50 / EfficientNet (ImageNet) | [timm](https://huggingface.co/timm) | Simple baseline, fine-tuned on crops |
| **DINOv2** (ViT-B/L) | [facebook/dinov2-base](https://huggingface.co/facebook/dinov2-base) | Strong self-supervised features. First choice. |
| CLIP / SigLIP | [google/siglip-base-patch16-224](https://huggingface.co/google/siglip-base-patch16-224) | Cheap embeddings for linear probe |
| DiT | [microsoft/dit-base](https://huggingface.co/microsoft/dit-base) | Pretrained on document images |

Training plan for DINOv2:

1. **Linear probe:** freeze the backbone, extract CLS + mean patch embeddings, train a logistic
   regression. Fast baseline.
2. **Fine-tune:** `AutoModelForImageClassification.from_pretrained("facebook/dinov2-base", num_labels=K)`,
   LR ~1e-5 for the backbone and ~1e-3 for the head, freeze the first ~8 blocks at the start,
   class-weighted loss. Augment with random crop, slight rotation, colour jitter and grayscale to reduce
   the scan-style confound.
3. **Optional:** continue self-supervised DINO pretraining on unlabelled manuscript crops before
   fine-tuning.

Text models (optional, uses our HTR output): character n-gram classifier or
[XLM-R](https://huggingface.co/FacebookAI/xlm-roberta-base) on the transcription. Spelling and dialect
forms (e.g. Picard vs. Parisian Old French) indicate the region. Can be combined with the image model
(late fusion).

