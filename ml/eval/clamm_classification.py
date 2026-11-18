"""Test how well the page classifier recognises SCRIPT and CENTURY.

It uses the CLaMM 2017 dataset: 2,000 medieval manuscript images that experts labelled
with their script (12 kinds) and their date. We give images to a model and count how
often its answer matches the expert label.

How to run (see eval/README.md for more):
    docker exec -w /app manulator-ml-1 python -m eval.clamm_classification

Dataset: https://zenodo.org/records/5527690 (free to use, CC BY 4.0)
"""

import argparse
import csv
import hashlib
import io
import json
import random
import re
import time
import urllib.error
import urllib.request
import zipfile
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

from app.config import settings
from services.classification import PROMPT, get_classifier

# ---------- Settings ----------

# The test images are inside one big zip file (3 GB) on Zenodo
ZIP_URL = "https://zenodo.org/records/5527690/files/ICDAR2017_CLaMM_task1_task3.zip?download=1"
LABELS_FILE = "@ICDAR2017_CLaMM_task1_task3.csv"  # the experts' labels, inside the zip

ML_FOLDER = Path(__file__).resolve().parent.parent
IMAGES_FOLDER = ML_FOLDER / "data" / "clamm"  # downloaded images are kept here
ANSWERS_FILE = ML_FOLDER / "results" / "clamm_predictions.jsonl"  # every model answer is saved here

# In the labels file, script and date are numbers. These lists translate them.
SCRIPTS = [  # 1 = Caroline, 2 = Cursiva, ...
    "Caroline", "Cursiva", "Half-Uncial", "Humanistic", "Humanistic Cursive", "Hybrida",
    "Praegothica", "Semihybrida", "Semitextualis", "Southern Textualis", "Textualis", "Uncial",
]
DATES = [  # 1 = before 1000, 2 = 1001-1100, ... (start year, end year)
    (None, 1000), (1001, 1100), (1101, 1200), (1201, 1250), (1251, 1300),
    (1301, 1350), (1351, 1400), (1401, 1425), (1426, 1450), (1451, 1475),
    (1476, 1500), (1501, 1525), (1526, 1550), (1551, 1575), (1576, 1600),
]


# ---------- Downloading single images from the big zip ----------

class RemoteFile:
    """Lets Python's zipfile read the zip on Zenodo as if it were a local file.

    Instead of downloading all 3 GB, it only downloads the bytes that are needed
    (HTTP "range requests"), so we can take out single images.
    """

    def __init__(self, url):
        self.url = url
        self.position = 0
        self.cache_start, self.cache = 0, b""
        content_range = self._download(0, 0)[1]  # looks like "bytes 0-0/3080000000"
        self.size = int(content_range.split("/")[1])

    def _download(self, start, end):
        """Download bytes start..end. Zenodo sometimes says "too many requests": then wait and retry."""
        request = urllib.request.Request(self.url, headers={"Range": f"bytes={start}-{end}"})
        for attempt in range(8):
            try:
                with urllib.request.urlopen(request, timeout=120) as response:
                    return response.read(), response.headers["Content-Range"]
            except urllib.error.HTTPError as error:
                if error.code != 429 or attempt == 7:
                    raise
                wait = int(error.headers.get("Retry-After") or 0) or 5 * 2 ** attempt
                time.sleep(wait)

    # zipfile needs these four methods to read a file
    def seekable(self):
        return True

    def tell(self):
        return self.position

    def seek(self, offset, whence=0):
        if whence == 0:  # from the start
            self.position = offset
        elif whence == 1:  # from the current position
            self.position += offset
        else:  # from the end
            self.position = self.size + offset
        return self.position

    def read(self, size=-1):
        if size is None or size < 0:
            size = self.size - self.position
        size = min(size, self.size - self.position)
        end = self.position + size
        cache_end = self.cache_start + len(self.cache)
        if not (self.cache_start <= self.position and end <= cache_end):
            # Not in the cache: download at least 64 KB, so many small reads need only one download
            download_end = min(self.size, self.position + max(size, 64 * 1024)) - 1
            self.cache = self._download(self.position, download_end)[0]
            self.cache_start = self.position
        offset = self.position - self.cache_start
        data = self.cache[offset:offset + size]
        self.position += len(data)
        return data


# ---------- Checking the century ----------

def century_of(year):
    """1291 -> 13 (the 13th century), 1300 -> 13, 1301 -> 14."""
    return (year - 1) // 100 + 1


def centuries_in(answer):
    """Find the centuries a model's answer talks about.

    "13th century" -> {13}    "c. 1250" -> {13}    "1300s" -> {14}    "unknown" -> {}
    """
    found = set()
    for number in re.findall(r"\b(\d{1,2})\s*(?:st|nd|rd|th)\b", answer.lower()):  # "13th"
        found.add(int(number))
    for year, plural_s in re.findall(r"\b(\d{3,4})(s?)\b", answer):  # "1250" or "1300s"
        year = int(year)
        if plural_s and year % 100 == 0:  # "1300s" means 1300-1399, the 14th century
            found.add(year // 100 + 1)
        else:
            found.add(century_of(year))
    return found


def check_century(answer, date_label):
    """Compare the model's century with the true date. Returns "correct", "off by 1", "wrong" or "unknown"."""
    start, end = DATES[date_label - 1]
    if start is None:  # "before 1000": any century up to the 10th is right
        true_centuries = set(range(1, 11))
    else:
        true_centuries = {century_of(end)}

    answered = centuries_in(answer)
    if not answered:
        return "unknown"
    if answered <= true_centuries:
        return "correct"
    closest = min(abs(a - t) for a in answered for t in true_centuries)
    return "off by 1" if closest == 1 else "wrong"


# ---------- Main program ----------

def to_jpeg(path):
    """The images are TIFF files, but the AI APIs only accept JPEG or PNG."""
    buffer = io.BytesIO()
    Image.open(path).convert("L").save(buffer, "JPEG", quality=90)
    return buffer.getvalue()


def main():
    parser = argparse.ArgumentParser(description="Test the classifier on CLaMM 2017")
    parser.add_argument("--model", default=settings.classifier_model,
                        help="which model to test, e.g. claude-haiku-5-5 or local:gemma-4-12b-it")
    parser.add_argument("--effort", help="how hard the model thinks, e.g. low or high (Claude default: low)")
    parser.add_argument("--per-class", type=int, default=20, help="images per script (default 20, so 240 in total)")
    parser.add_argument("--batch", type=int, default=0,
                        help="0 = the usual images; 1, 2, ... = new images, never used in an earlier batch")
    parser.add_argument("--workers", type=int, default=8, help="how many images to send to the model at once")
    args = parser.parse_args()

    classify, model_name = get_classifier(args.model, args.effort)
    # A short code for "this model + this prompt". Saved answers are only reused when both are the same.
    prompt_code = hashlib.sha256(PROMPT.encode()).hexdigest()[:8]
    run_name = f"{model_name}/{prompt_code}"

    IMAGES_FOLDER.mkdir(parents=True, exist_ok=True)
    ANSWERS_FILE.parent.mkdir(parents=True, exist_ok=True)

    # Step 1: open the zip on Zenodo and read the experts' labels
    archive = zipfile.ZipFile(RemoteFile(ZIP_URL))
    path_in_zip = {Path(name).name: name for name in archive.namelist()}

    def download(file_name):
        """Take one file out of the zip, unless we downloaded it before."""
        local_path = IMAGES_FOLDER / file_name
        if not local_path.exists():
            local_path.write_bytes(archive.read(path_in_zip[file_name]))
        return local_path

    images = []
    with open(download(LABELS_FILE), encoding="latin-1") as f:
        for row in csv.DictReader(f, delimiter=";"):
            if row["FILE_NAME"] in path_in_zip:  # one image in the labels file is missing from the zip
                images.append({
                    "file": row["FILE_NAME"],
                    "script": SCRIPTS[int(row["Script_type_ICDAR2017"]) - 1],
                    "date": int(row["DATE_ICDAR"]),
                })

    # Step 2: pick the same number of images for every script, so rare scripts count as much as common ones
    used_before = set()
    for batch in range(args.batch + 1):  # earlier batches are picked again, only to skip their images
        images_by_script = defaultdict(list)
        for image in images:
            if image["file"] not in used_before:
                images_by_script[image["script"]].append(image)
        randomness = random.Random(batch)  # same batch number = same images every time
        sample = []
        for script in SCRIPTS:
            how_many = min(args.per_class, len(images_by_script[script]))
            sample += randomness.sample(images_by_script[script], how_many)
        used_before |= {image["file"] for image in sample}

    # Step 3: reuse answers saved by an earlier run, ask the model only about the rest
    saved = {}
    if ANSWERS_FILE.exists():
        for line in ANSWERS_FILE.read_text().splitlines():
            answer = json.loads(line)
            if answer.get("run") == run_name:
                saved[answer["file"]] = answer
    to_ask = [image for image in sample if image["file"] not in saved]
    print(f"{len(sample)} images picked, {len(to_ask)} still to ask {run_name}")

    with ThreadPoolExecutor(2) as pool:  # download 2 at a time: Zenodo blocks faster downloading
        list(pool.map(lambda image: download(image["file"]), to_ask))

    def ask_model(image):
        try:
            answer = classify(to_jpeg(download(image["file"])), "image/jpeg")
            return {**image, "run": run_name, "prediction": answer.model_dump()}
        except Exception as error:  # one failed image should not stop the whole test
            return {**image, "error": f"{type(error).__name__}: {error}"}

    errors = []
    with ThreadPoolExecutor(args.workers) as pool, open(ANSWERS_FILE, "a") as answers_file:
        for result in pool.map(ask_model, to_ask):
            if "error" in result:
                errors.append(result["error"][:80])
            else:
                saved[result["file"]] = result
                answers_file.write(json.dumps(result) + "\n")

    # Step 4: print the scores
    answered = [saved[image["file"]] for image in sample if image["file"] in saved]
    print_report(answered, errors)


def percent(part, total):
    return f"{part}/{total} ({100 * part / total:.0f}%)" if total else "0/0"


def print_report(results, errors):
    for r in results:
        r["century_check"] = check_century(r["prediction"]["century"], r["date"])

    # Script: how often is the answer exactly the expert's script?
    right = sum(r["prediction"]["script"] == r["script"] for r in results)
    print(f"\n=== Script: {percent(right, len(results))} correct (best system in the 2017 competition: 85.2%)")
    for script in SCRIPTS:
        of_this_script = [r for r in results if r["script"] == script]
        right = sum(r["prediction"]["script"] == script for r in of_this_script)
        top_answers = Counter(r["prediction"]["script"] for r in of_this_script).most_common(3)
        top_text = ", ".join(f"{answer} {count}" for answer, count in top_answers)
        print(f"{script:<20}{percent(right, len(of_this_script)):>12}   model answered: {top_text}")

    # Century: how often is the century right, and how far off is it otherwise?
    right = sum(r["century_check"] == "correct" for r in results)
    print(f"\n=== Century: {percent(right, len(results))} exactly right")
    print("All outcomes:", dict(Counter(r["century_check"] for r in results).most_common()))
    for number, (start, end) in enumerate(DATES, start=1):
        of_this_date = [r for r in results if r["date"] == number]
        if of_this_date:
            label = f"before {end}" if start is None else f"{start}-{end}"
            right = sum(r["century_check"] == "correct" for r in of_this_date)
            off_by_one = sum(r["century_check"] == "off by 1" for r in of_this_date)
            print(f"{label:<16}{percent(right, len(of_this_date)):>12}   off by 1: {off_by_one}")

    # The dataset has no labels for these, so we only show what the model said
    print("\n=== No expert labels for these, only the model's answers")
    for field in ("language", "region", "document_type"):
        print(f"{field}:", dict(Counter(r["prediction"][field] for r in results).most_common(8)))

    if errors:
        print(f"\n{len(errors)} images failed:", Counter(errors).most_common(5))


if __name__ == "__main__":
    main()
