# Classifier: document type

Task: #159 · Spike: #160

Goal: recognise the type of a manuscript page from how it looks (its layout),
independent of language. Example: two columns of text → codex-like page.

Status: research done (steps 1–5 of #159). Everything below comes from the
linked pages. Items marked "to verify" were not read in detail.

**Key finding:** no public dataset labels medieval pages as "charter / register
/ codex / letter", and no model predicts these types. What exists is research on page-level layout and page-type
classification (columns, tables, text-only, graphics, illustrations, blank
pages). So we define our document types by visual structure and either map
existing labels onto them or label a small set ourselves.

## Datasets

| Name | What the labels are | Size | Licence / access | Fit for us |
|---|---|---|---|---|
| [Large Labeled Dataset for Complex Layout Analysis of Medieval Manuscripts (DIVA-UTP, Fribourg)](https://zenodo.org/records/20282994) | Pixel-level layout classes: background, decoration, filler, text, main body, drop caps | 1,800 pages (1,200 train / 300 val / 300 test), from e-codices | CC BY-NC 4.0, open download (about 1 GB). Non-commercial is fine for a university project | Good. Not page-level types, but we can derive them (share of decoration vs. text, number of text blocks) |
| [ATRIUM page classification set (Czech Academy of Sciences archive)](https://arxiv.org/html/2606.07558v1) | 11 page types: plain text (handwritten, printed, typed), table/form layouts, drawings, photos | about 48,500 annotated pages | Published in the LINDAT repository (more than 35 GB). CC BY-NC 4.0, according to the [model card](https://huggingface.co/ufal/vit-historical-page) | Partly. Pages are from 1920–2020, not medieval. Useful for methods and as a pretraining source |
| [Complex Layout Classification, CLC (Hebrew pages)](https://arxiv.org/html/2606.17355) | 8 page layout classes (separator-defined layouts) | 155 pages | Images and labels on GitHub (TAU-CH/midrash_clc). Licence not stated | Low. Hebrew only, very specific layouts. Small-data example |
| [Vatican manuscript illustrations dataset](https://arxiv.org/html/2609.33449v1) | 22 classes of illustration crops, including Blank Page and Text Only Page | 15,000 crops | Not released yet. Authors plan to release annotations and a script to rebuild from IIIF. Images cannot be redistributed | Low for now. Interesting for the "other / blank" classes |
| [CATMuS Medieval](https://huggingface.co/datasets/CATMuS/medieval/blob/main/README.md) | Metadata includes genre and script (exact columns to verify) | 160,000+ lines, 200+ manuscripts | CC-BY-4.0 | Possible. Check whether the genre field helps. It is line-level, so it needs grouping by page |
| [Survey of Historical Document Image Datasets](https://arxiv.org/pdf/2203.08504) | Overview paper | n/a | n/a | Use it to find more datasets (to read) |

Not suitable: RVL-CDIP (modern documents such as letters, memos, invoices). It
matters only because the pretrained models below were trained on it.

## Benchmarks

| Paper | Task | Model | Result |
|---|---|---|---|
| [Page image classifier for century-spanning archives](https://arxiv.org/html/2606.07558v1) | 11 page types on 48,500 pages | RegNetY-16GF; also ViT-large, CLIP | 99.16% top-1 accuracy (RegNetY-16GF), 99.12% (ViT-large), random forest baseline about 75%. CLIP agreed with the image models on under 65% of unlabeled pages, so the authors advise against it for sorting |
| [Complex Layout Classification in the Wild](https://arxiv.org/html/2606.17355) | 8 layout classes, 31 test pages | ConvNeXt-Tiny with layout-preserving augmentation | 90% accuracy, 0.88 macro-F1. ViT-B/16 and ResNet-18 only reached 23% on this tiny set |
| [Visual classification of manuscript illustrations](https://arxiv.org/html/2609.33449v1) | 22 classes, 15,000 crops | Fine-tuned ConvNeXt | 88.9% accuracy, 81.3% macro-F1. Zero-shot CLIP only about 58% |
| [DiT: Document Image Transformer](https://arxiv.org/pdf/2203.02378) | RVL-CDIP (16 modern document classes) | DiT | Modern documents only (letters, forms, invoices), so not comparable with our pages. We did not take its numbers over |

What this tells us:

- Fine-tuned ConvNeXt, ViT or RegNet models work well for page-level layout classes.
- Zero-shot CLIP is clearly weaker, so it is only a quick baseline.
- Layout-preserving augmentation (no rotating or cropping away the structure) helped a lot on small data.
- The 99% and 90% results come from easier or smaller datasets than ours. Treat them as an upper bound, not a promise.

## Pretrained models

None of these knows medieval document types out of the box. Each needs
fine-tuning on our own labeled pages, or can serve as a feature extractor.

| Model | Notes |
|---|---|
| [microsoft/dit-base-finetuned-rvlcdip](https://huggingface.co/microsoft/dit-base-finetuned-rvlcdip) | Document Image Transformer fine-tuned on RVL-CDIP (16 modern classes). Meant to be fine-tuned further. Licence: check the model metadata |
| [`ufal/vit-historical-page`](https://huggingface.co/ufal/vit-historical-page) | The only model we found that is trained on historical page images (about 48,500 Czech archive pages, 1920–2020). Model MIT, training data CC BY-NC 4.0. It predicts 11 content classes, not our types: e.g. `TEXT_HW` (handwritten text), `LINE_HW` (handwritten table or form), `TEXT_P` (printed text), `DRAW` (drawings). Several map to ours (`LINE_HW` → register, `DRAW` → illuminated, `TEXT_P` → printed), but `TEXT_HW` covers both charter and codex. Versions are picked by name (`v1.4`–`v5.4`; `main` is an older one); reported top-1 accuracy 94.6–95.9% on its own data. Runs with `transformers`, also on Colab. Code: [`ufal/atrium-page-classification`](https://github.com/ufal/atrium-page-classification) |
| ConvNeXt-Tiny (ImageNet) | Best backbone in the Hebrew layout paper. Small starting point for fine-tuning |
| CLIP ViT-B/16 | Zero-shot baseline only |

## Document types

We classify by layout only, not by content or language.

| Type | What the page looks like |
|---|---|
| Charter | One sheet, one wide block of text, no columns, often seals or seal strips and fold marks |
| Codex | A page of a bound book: one or two columns of text, margins, sometimes initials |
| Register | Many short entries: lists, ruled rows or columns, dates or amounts, notes in the margin |
| Illuminated | Decoration or pictures take a large part of the page: miniatures, borders, large initials |
| Other | Blank pages and flyleaves, fragments (torn pieces), early printed pages |

## Test pages

54 pages, labelled by layout. The list with labels and notes is in
[`document-type-test-pages.csv`](document-type-test-pages.csv). The images
are not in Git (same approach as `ml/test_pages/charters`), they are in our
shared Google Drive folder: <https://drive.google.com/drive/folders/1zD2nV1Sq-C3Ys9Z9_zq7Q0IPq7Jj6Mxf?usp=sharing>.

| Type | Pages | Notes |
|---|---|---|
| Charter | 10 | |
| Codex | 10 | `codex_01` is mostly one big initial and could also count as illuminated |
| Register | 10 | 2 two-page spreads; `register_09` is verse, not a real register, to replace |
| Illuminated | 12 | |
| Other | 12 | 4 blank, 5 fragments, 3 printed; no binding images yet |

Where the pages come from, and what we may do with them:

| Source | Licence of the images | Note |
|---|---|---|
| [e-codices](https://e-codices.ch/en/info/terms) (Swiss manuscripts) | Creative Commons, non-commercial: free for research and teaching | Cite as "Location, library, shelfmark, page (www.e-codices.ch)" |
| [manuscript.ku.dk](https://manuscript.ku.dk/freetext_box/about_haandskrift/) (Arnamagnæan Institute, University of Copenhagen) | Not stated on the site | Ask before sharing outside the team |
| [Europeana](https://www.europeana.eu) | Different for each item (its rights statement) | Copy the statement of each page |
| [National Library of Scotland](https://www.nls.uk/copyright) (media.nls.uk) | Digitisation released as CC0; out-of-copyright works can usually be reused | Check the statement of each item |
| Wikipedia / Wikimedia Commons | Different for each file, often public domain | Copy the licence from the file page |

Rules:

- File names are `<type>_<nn>`, and `other_<kind>_<nn>` for the other class (blank, fragment, printed).
- CSV columns: `file`, `type`, `source`, `licence`, `hard` (a page we expect to be difficult), `note`.
- **Use: internal evaluation only.** The exact source of most pages was not recorded when they were downloaded. 21 pages are probably from e-codices (the image server's tag is in the file), 2 are known from the scan (Zentralbibliothek Zürich, ULB Düsseldorf), and 31 come from one of the sources below. So the images stay in the team's Drive folder: not in Git, not in a demo, not shared outside the team. The test set for a public result (next ticket) records the link of every page when it is downloaded.
- The pages do not overlap `ml/test_pages/` or the e-NDP pages from spike #22.

## Recommendation

There is no ready-made dataset or model for our five types. Plan for the next
ticket:

1. **Baseline:** run `ufal/vit-historical-page` unchanged on the test pages and
   map its labels to ours. This shows how far a model trained on historical
   pages gets without any training, and where it fails (charter vs codex).
2. **Training data:** build it from open collections in which every page has
   the same type, so the label comes from the collection: Königsfelden charters
   ([Zenodo](https://doi.org/10.5281/zenodo.5179361)), e-NDP registers
   ([Zenodo](https://zenodo.org/records/7575693), 512 pages, CC BY 4.0), codex
   and decorated pages from e-codices (the DIVA-UTP set,
   [Zenodo](https://zenodo.org/records/20282994), 1,800 pages, CC BY-NC 4.0),
   and early printed books. A few hundred pages per type should be enough: the
   Hebrew layout paper reached 90% with 155 pages.
3. **Model:** fine-tune a pretrained backbone (`ufal/vit-historical-page` or
   ConvNeXt-Tiny) on our five classes.
4. **Check:** evaluate only on the test pages above, which come from other
   sources than the training data. If each type came from one collection, the
   model could learn the scan style instead of the layout; a good score on
   pages from other sources shows it learned the layout.
