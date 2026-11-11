# Classifier: period
  
  Task: #153 · Spike: #160
  
  ## How to fill this in
  
  1. **Datasets**: Search for collections of manuscript pages where someone
  already wrote down the period (century) of each page. For each one, write its
  name, a link, how many pages it has, and whether we're allowed to use it. 
  2. **Benchmarks**: Search for papers or competitions that tried to recognise
  the period automatically. Write down what they used and how well it worked
  (e.g. "85% correct").
  3. **Pretrained models**: List models that already recognise the period and
  that we could try without training our own. Add a link for each. 
  
  
## 1. Datasets

| Dataset | Document type | Period | Language | Region | Date label | Size | Licence | Reference | Download |
|---|---|---|---|---|---|---|---|---|---|
| CATMuS Medieval | Literary, religious, documentary | 7th–16th c. | Latin, French, Italian, Spanish, Middle Dutch, others | Western Europe | Century per line | 195k lines, 200+ MSS | CC BY 4.0 | Clérice et al., ICDAR 2024 | [Hugging Face (Parquet)](https://huggingface.co/datasets/CATMuS/medieval/tree/main) |
| CLaMM 2017 | Books (codices) | 6th–16th c. | Latin | Western Europe | 15 date classes per page | 3,540 train + 3,000 test pages, 12.1 GB | CC BY 4.0 | Cloppet et al., ICDAR 2017 | [Train](https://zenodo.org/records/5527690/files/ICDAR2017_CLaMM_Training.zip?download=1), [Test](https://zenodo.org/records/5527690/files/ICDAR2017_CLaMM_task1_task3.zip?download=1) |
| ICDAR 2021 HDC (dating) | Books, charters | Medieval | Latin script | Europe | Year interval per page | 12,810 pages, 28 GB | CC BY 4.0 | Seuret et al., ICDAR 2021 | [dating.tar.gz](https://zenodo.org/records/4836687/files/dating.tar.gz?download=1) |
| MPS | Charters | 14th–16th c. | Middle Dutch | Low Countries | Year per charter | 19 GB | CC BY 4.0 | He, Samara, Burgers & Schomaker, ICFHR 2014 | [MPS .tgz](https://zenodo.org/records/1194357/files/MPS-dating-of-historical-handwriting.tgz?download=1) |
| DIVA-HisDB | Codices | 11th, 14th c. | Latin, Italian | Switzerland, Italy | Century per codex | 150 pages | Non-commercial | Simistira et al., ICFHR 2016 | [Dataset page](https://www.unifr.ch/inf/diva/en/research/software-data/diva-hisdb.html) |
| Saint Gall | Hagiography | 9th c. | Latin | Switzerland | Single century | 60 pages, 1,410 lines | Research, registration | Fischer, Frinken, Fornés & Bunke, HIP 2011 | [Registration](https://fki.tic.heia-fr.ch/databases/saint-gall-database) |
| Parzival | Epic poetry | 13th c. | Middle High German | German-speaking area | Single century | 47 pages | Research, registration | Fischer, Keller, Frinken & Bunke, 2012 | [Registration](https://fki.tic.heia-fr.ch/databases/parzival-database) |
| Vat. gr. 2228, Phil. gr. 130 | Rhetorical treatises with commentary | 14th c. | Greek | Byzantine | Single century | 46 PAGE-XML pages (images from library viewers) | CC BY-SA 4.0 | Andersen, MacDougall, Valori, Yousef & Pizzone, 2026 | [dataset.zip](https://zenodo.org/records/19425687/files/dataset.zip?download=1) |
| Stavronikita 53 | Codex | 14th c. | Greek | Mount Athos | Single century | 54 pages, 1,038 lines | Open access | Pratikakis, Papazoglou, Symeonidis & Tsochatzidis, 2021 | [ΧΦ53.zip](https://zenodo.org/records/5595669/files/%CE%A7%CE%A653.zip?download=1) |
| Stavronikita 114 | Codex | 15th c. | Greek | Mount Athos | Single century | 44 pages, 1,051 lines | Open access | Pratikakis, Papazoglou, Symeonidis & Tsochatzidis, 2021 | [ΧΦ114.zip](https://zenodo.org/records/5578251/files/%CE%A7%CE%A6114.zip?download=1) |
| READ-BAD (cBAD) | Archival documents | 15th–20th c. | Multilingual | Europe (9 archives) | Collection only | 2,035 pages, 4.2 GB | Open access | Grüning, Labahn, Diem, Kleber & Fiel, DAS 2018 | [cBAD v4 .zip](https://zenodo.org/records/1491441/files/READ-ICDAR2017-cBAD-dataset-v4.zip?download=1) |
| RASM2018 | Scientific manuscripts | 8th–19th c. | Arabic | Islamic world | Collection only | ~100 pages | Open access | Clausner et al., ICFHR 2018 | [DOI 10.23636/1135](https://doi.org/10.23636/1135) |


CATMuS can be downloaded in full with `huggingface-cli download CATMuS/medieval --repo-type dataset`;

## 2. Benchmarks

| Benchmark | Metric | Best result | Model | Source |
|---|---|---|---|---|
| CLaMM 2017 (15 classes) | Accuracy | **37.9 %** (chance 6.7 %) | ResNet-152, ImageNet-pretrained | [Studer et al. 2019](https://arxiv.org/abs/1905.09113) |
| ICDAR 2021 HDC | MAE (years) | **21.9** | Text-line CNN (Brno) | [Kišš et al. 2022](https://arxiv.org/abs/2201.09575) |
| MPS | MAE (years) | **≈ 10** | Handcrafted features + SVR | [He et al. 2016](https://zenodo.org/records/1194357) |
| DIVA-HisDB | MAE (years) | **5.4** | EfficientNet-B2, evidential regression | [Chodavarapu 2026](https://arxiv.org/abs/2605.06475) (preprint) |


Findings:
- ImageNet pretraining adds 6–17 points on CLaMM (ResNet-152: 20.6 % to 37.9 %).
- Text lines beat random patches (HDC 2021: 21.9 vs 32.5 years).
- Models fail on scripts not seen in training (DIVA-HisDB: >300 years error).

## 3. Test pages

| Set | Pages | Purpose |
|---|---|---|
| CLaMM 2017 test | 2,000 | Comparison with published results |
| CATMuS test split | ~5 per century, 9th–15th c. | Fits our project |
| Saint Gall, Parzival, DIVA-HisDB | 2–3 per manuscript | Unseen manuscripts, known century |


## 4. Recommended models

No public model is trained for manuscript dating. All candidates are fine-tuned on date labels. 

| Rank | Model | Family | Params | Why | Evidence |
|---|---|---|---|---|---|
| 1 | **DINOv3 ViT-S/16, ViT-B/16** | Self-supervised ViT | 21M / 86M | Strongest general image features; fine stroke and texture detail | Tibetan manuscript script classification with ViT-S/16 ([OpenPecha](https://api-inference.pages.dev/openpecha/tibetan-script-classifier)) |
| 2 | **ResNet-50 / ResNet-152** | CNN, ImageNet | 25M / 60M | Only model family with a published dating score | 37.9 % on CLaMM 2017 (ResNet-152) |
| 3 | EfficientNet-B2 / ConvNeXt-T | CNN | 9M / 29M | Light and fast; suited to small datasets | MAE 5.4 years on DIVA-HisDB (EfficientNet-B2) |
| 4 | TrOCR-medieval encoder only | ViT trained on medieval handwriting | ~86M (encoder) | Features already tuned to medieval scripts; text-line input | HTR on CATMuS ([HF](https://huggingface.co/medieval-data/trocr-medieval-base)); dating untested |
| 5 | SigLIP 2 ViT-B/16 | Image-text ViT | ~86M (image encoder) | Robust general features | Not tested on dating |
| 6 | DiT-base | ViT trained on document images | 86M | Pretrained on documents rather than photos | Document classification; dating untested |


Fine-tuning plan:
1. **Linear probe** on frozen features (DINOv3 ViT-B, TrOCR encoder, ResNet-152), to compare which features hold the most date information.
2. **Full fine-tuning** of the best backbone on CATMuS text lines (fp16, batch 16–32; use gradient accumulation if memory runs out).
3. **LoRA** as a fallback if full fine-tuning overfits.


### Training choices:
- Input: text lines, averaged to a page prediction.
- Target: ordered centuries (ordinal loss or year regression); report accuracy and MAE.
- Predict script type alongside century.
- Split by manuscript, so no manuscript appears in both train and test.