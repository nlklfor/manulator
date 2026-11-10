# Classifier: script

## Summary

Script classification is well studied: CLaMM (ICDAR 2017) is the best dataset and benchmark, with best results of 85.2% on clean scans and 76.5% on mixed scans, CATMuS adds Latin lines from our period including charters, the scripts that matter most for 1201–1400 are Textualis, Semitextualis, Southern Textualis and Cursiva, and three small projects have trained models on CLaMM whose accuracy we still need to check before deciding between one of them and fine-tuning our own.

## Datasets

CLaMM (ICDAR 2017)
- Link: [Zenodo](https://zenodo.org/records/5527690)
- Size: 3,540 training images plus 3,000 test images, 12 script classes, also labelled with date (15 classes)
- Labelled by paleographers from IRHT/CNRS
- Only 734 training images (21%) are from 1201–1400, mostly Textualis, Semitextualis, Southern Textualis and Cursiva
- Images are 300 dpi crops of part of a page, not whole pages
- Probably mostly books, so charters and registers may be few TO BE DETERMINED
- Big download: 12.1 GB

CATMuS Medieval
- Link: [Hugging Face](https://huggingface.co/datasets/CATMuS/medieval) · [Paper](https://malamatenia.github.io/pdfs/catmus.pdf)
- Size: about 195,000 line images from 200+ manuscripts. Each line has script type, century, language and genre
- Only 15,230 lines (41 manuscripts) are Latin from the 13th–14th century, about 8% of the dataset
- 2,728 of those lines are "Documents of practice" (charters, acts), mostly Cursiva
- Has a class Gothic Documentary Script that CLaMM doesn't have, and no Latin Southern Textualis in our period
- The script is set per manuscript, so every line of a manuscript gets the same label
- Line images fit our pipeline: we already detect lines, so the page result would be a vote over its lines

## Benchmarks

CLaMM competition (ICDAR 2017)
- Link: [Results and ranking](https://clamm.irht.cnrs.fr/icdar-2017/results-ranking/)
- Task 1, clean scans (greyscale, 300 dpi): best 85.2% correct (T-DeepCNN)
- Task 2, mixed formats, resolutions and colours, closer to user uploads: best 76.5% correct (CK2)
- Only 4 participants and 6 classifiers, from 2017
- The methods of each team are only in the ICDAR 2017 paper (DOI 10.1109/ICDAR.2017.224) TO CHECK

Studer et al. (2019)
- Link: [arXiv](https://arxiv.org/abs/1905.09113)
- Used: CLaMM 2017, mixed-format subset, 4 standard image models with and without ImageNet pre-training
- Best: Inception V3, 55.5% correct pre-trained, 46.5% without
- Pre-training helps every model, by 3.6 to 10.2 points
- Much lower than the CLaMM winners, so these are simple baselines

CATMuS
- No benchmark for script classification: the paper only reports transcription results (Kraken, PyLaia)

## Pretrained models

A few models already trained to recognise the script on CLaMM exist. They are small projects and their accuracy is not confirmed

Christlein, CLaMM 2016 code
- Link: [GitHub](https://github.com/VChristlein/clamm-icfhr16)
- Trained files included in the repo (trained folder), so it can classify new images without training
- By Christlein, also in the team that won CLaMM 2017 Task 2
- Not deep learning, needs Python 2, so old and harder to run

Deep-Style-Detector
- Link: [GitHub](https://github.com/SarahIsmael/Deep-Style-Detector), trained models on [Google Drive](https://drive.google.com/drive/folders/1foLYb2733MuIYYrhT76Fw4aGsvHdogXV) (Keras .h5 files)
- Master's thesis (Uppsala), trained on CLaMM and e-codices
- Accuracy not checked TO CHECK

Paleographia Digitalis
- Link: [GitHub](https://github.com/MariaJGamboa/PaleographiaDigitalis) · [Live demo](https://sidereus.dev/paleographia-digitalis)
- Student project (Bologna, 2025/26): ConvNeXt-Small and EfficientNet-V2-S trained on CLaMM, 12 classes
- The demo can be tried on one of our pages without installing anything
- 80.4% correct on its own validation split (908 images, 20% random split of CLaMM), not on the official CLaMM test sets, so not directly comparable with 85.2% / 76.5%
- Weakest on scripts we need: Semitextualis and Semihybrida about 60% (F1), Hybrida 69%, Cursiva 76%, Textualis and Southern Textualis 78%
- Trained weights (.pth) are on Kaggle, not in the GitHub repo

If none of these works well enough, we fine-tune our own: Studer et al. suggest Inception V3, VGG19, ResNet152 or DenseNet121, pre-trained on ImageNet and available in [torchvision](https://pytorch.org/vision/stable/models.html)

## Script types

For 1201–1400, four scripts matter: Textualis, Semitextualis, Southern Textualis and Cursiva

| Script | Definition | CLaMM images (all) | CLaMM images 1201–1400 | CATMuS lines, Latin 13th–14th c. |
| --- | --- | --- | --- | --- |
| Textualis | Two-compartment a; f and long s on the line; loopless ascenders (b, h, k, l) | 442 | 293 | 5,845 |
| Semitextualis | Textualis with single-compartment a | 293 | 183 | 2,126 |
| Southern Textualis (Rotunda) | Two-compartment a; f and long s on the line; loopless ascenders. Mediterranean form of Textualis, with round bows (b, c, d, e, h, o, p, q, round r) | 202 | 128 | 0 |
| Cursiva | Single-compartment a; f and long s below the line; loops on ascenders (b, h, k, l) | 395 | 89 | 2,602 |
| Praegothica | Based on Caroline, with lateral compression (narrower letters, fusions); vertical uncial a; f and long s on the line | 411 | 17 | 2,794 |
| Semihybrida | Hybrida with irregularly loopless ascenders (b, h, k, l) | 265 | 16 | 0 |
| Hybrida | Single-compartment a; f and long s below the line; loopless ascenders (b, h, k, l) | 341 | 8 | 886 |
| Gothic Documentary Script | CATMuS label, no published definition found. Closest sourced description: documentary hands (court hands), cursive scripts used for record keeping [1] | 0 | 0 | 473 |
| Caroline | Minuscule; uncial round a, half-uncial d, g with a small round eye; flat-topped t | 356 | 0 | 504 |
| Humanistic Cursive | Humanistic script with cursiva forms and italic slant | 217 | 0 | 0 |
| Uncial | Mostly capital script, almost no ascenders or descenders | 211 | 0 | 0 |
| Humanistic | Imitated from Caroline scripts, with dotted i | 207 | 0 | 0 |
| Half-Uncial | Minuscule; mainly open a; vertical d; 3- or z-shaped g; t with loop on the left | 200 | 0 | 0 |

Definitions: [CLaMM script classes](https://clamm.irht.cnrs.fr/script-classes/), based on B. Bischoff, Paläographie des römischen Altertums und des abendländischen Mittelalters (2009) and A. Derolez, The Palaeography of Gothic Manuscript Books (2003). [1] [Gothic script (palaeography), Wikipedia](https://en.wikipedia.org/wiki/Gothic_script_(palaeography)), citing M. Brown, A Guide to Western Historical Scripts (2007)
