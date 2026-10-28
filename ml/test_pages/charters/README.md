# Charter test set (issue #84)

Eight whole pages of Latin charters, 1291–1462, to develop, test and demo the transcribe feature (#79). Each page comes with its correct text, so we can measure how well the pipeline reads it.

## Why these pages

- **Latin charters, about 1250–1450, Western/Central Europe.** This is where our reading model works: PyLaia HOME-Alcar was trained on charters of this period and reached 8.6% CER on charter lines in spike #22.
- **Whole pages.** Spike #22 only tested charters on lines cut out by people. These pages go through the full pipeline: Kraken finds the lines, PyLaia reads them.
- **Unseen by the model.** Königsfelden is not in PyLaia's training data (HOME-Alcar, Himanis).
- **Correct text written out in full** (*dominus*, not *dñs*), the same way PyLaia writes, so the comparison is fair.

## Source

All pages come from **Charters and Records of Königsfelden Abbey and Bailiwick (1308–1662)**, Staatsarchiv Aargau, collection U.17.

- Dataset: Halter-Pernet, C., Teuscher, S., Hodel, T. et al. (2021), Zenodo, <https://doi.org/10.5281/zenodo.5179361>
- Scholarly edition: <https://www.koenigsfelden.uzh.ch/>
- Licence: text CC BY 4.0, images public domain. Using them in our demo is allowed if we credit the source.

## Pages

| File | Shelfmark | Date | Place | Collection | Lines | CER |
| --- | --- | --- | --- | --- | --- | --- |
| U-17_0002_r | StAAG U.17/0002, recto | 1291 | Säckingen | Latein 1 | 27 | 18.0% |
| U-17_0046_r | StAAG U.17/0046, recto | 1315 | Konstanz | Latein 1 | 25 | 28.4% |
| U-17_0066_r | StAAG U.17/0066, recto | 1319 | Strasbourg | Latein 1 | 40 | 3.7% |
| U-17_0234_r | StAAG U.17/0234, recto | 1350 | Basel | Latein 2 | 24 | 9.4% |
| U-17_0339_r | StAAG U.17/0339, recto | 1367 | – | Latein 2 | 39 | 19.7% |
| U-17_0515_r | StAAG U.17/0515, recto | 1418 | Konstanz | Latein 2 | 26 | 16.7% |
| U-17_0616_r | StAAG U.17/0616, recto | 1442 | Basel | Latein 3 | 32 | 4.5% |
| U-17_0721_r | StAAG U.17/0721, recto | 1462 | Basel | Latein 3 | 34 | 15.4% |
| **Average** | | | | | | **14.5%** |

Dates and places are taken from the dating clause at the end of each charter. "Collection" is the Transkribus collection in the dataset (Königsfelden Latein 1–4).

Each page has two files:

- `<name>.txt`: the correct text, written out in full, one line per row, in reading order (in Git, in this folder)
- `<name>.jpg`: the page image (about 4 MB, under the 20 MB upload limit). Not in Git, because 8 images make the repository 32 MB bigger for everyone. Get them as described below.

## Getting the images

Download the 8 images from our shared Google Drive folder and put them in this folder: https://drive.google.com/drive/folders/1hx6NOF619BJxAaB8GtIcF1iLeBNLYj3R?usp=sharing

The images are ignored by Git (`ml/.gitignore`), so they stay local.

## How the correct text was made

The dataset's PageXML keeps the scribe's abbreviations (`Univˀsis ꝫ singl̄is`) and stores the full form of each one in a tag on the line (`abbrev {offset:3; length:2; expansion:ver;}`). We replaced every abbreviation with its full form (`Universis et singulis`). A few abbreviations have no tag and remain in the text (at most 9 per page), which makes the CER of those pages slightly too high.

## How the CER was measured

Same rules as spike #22 (see `docs/ai-model-research.md`, sections 7 and 10):

- full pipeline: Kraken (default line finder) + PyLaia HOME-Alcar, without language model, run on a MacBook Air
- the text of the whole page is compared with the correct text of the whole page
- before comparing, both texts are cleaned the same way: only letters and spaces, lower case, no accents, j → i, v → u

## Results

- **Average 14.5%, but large differences between pages (3.7% to 28.4%).** Some charters are read almost perfectly, others are hard.
- **Worse than the 8.6% from spike #22**, as expected: there the lines were cut out by people, here Kraken finds them. Spike #22 showed the same effect on registers.
- 5 of 8 pages are above the 10% "usable" limit from spike #22. Users will need to correct the text, and the pages above 15% are the first to look at when we fine-tune.

## Left out (out of scope)

Two pages from collection Latein 4 were tried and left out:

- **U-17_0845_r** (around 1500, letter to King Maximilian): a very large, dense page with hundreds of tiny lines. Kraken found only 11 lines, and the correct text has no tags to write out its abbreviations. CER 99.9%.
- **U-17_0978_r** (16th century letter): a later cursive script that PyLaia was not trained on. CER 59.2%.

They show where the system stops working: very dense documents and later scripts.
