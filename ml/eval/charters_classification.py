"""Test the page classifier on 8 whole pages of real medieval charters.

The pages are in ml/test_pages/charters/ (see the README there to download them).
We know the truth for every page: it is a Latin charter, and the README table gives
its year and place. The test checks century, language and document type, and prints
the model's script and region so you can judge them yourself.

How to run (see eval/README.md for more):
    docker exec -w /app manulator-ml-1 python -m eval.charters_classification
"""

import argparse
import re
from pathlib import Path

from eval.clamm_classification import centuries_in, century_of
from app.config import settings
from services.classification import get_classifier


PAGES_FOLDER = Path(__file__).resolve().parent.parent / "test_pages" / "charters"


def read_true_answers():
    """Read the table in the README: | U-17_0002_r | StAAG U.17/0002, recto | 1291 | Säckingen | ..."""
    readme = (PAGES_FOLDER / "README.md").read_text()
    table_row = r"^\|\s*(U-17_\d{4}_r)\s*\|[^|]*\|\s*(\d{4})\s*\|\s*([^|]+?)\s*\|"
    return re.findall(table_row, readme, re.MULTILINE)  # [(file, year, place), ...]


def main():
    parser = argparse.ArgumentParser(description="Test the classifier on 8 charters")
    parser.add_argument("--model", default=settings.classifier_model, help="which model to test, see services/classification.py")
    parser.add_argument("--effort", help="how hard the model thinks, e.g. low or high (Claude default: low)")
    args = parser.parse_args()
    classify, model_name = get_classifier(args.model, args.effort)

    pages = read_true_answers()
    score = {"century": 0, "language": 0, "document_type": 0}
    print(f"{'page':<13}{'year':<6}{'place':<11}| century          script        language  type      region")

    for file, year, place in pages:
        start = f"{file:<13}{year:<6}{place:<11}|"
        image = (PAGES_FOLDER / f"{file}.jpg").read_bytes()  # sent unchanged, like a user upload
        try:
            answer = classify(image, "image/jpeg")
        except Exception as error:
            print(start, f"FAILED: {error}"[:150])
            continue

        century_right = centuries_in(answer.century) == {century_of(int(year))}
        score["century"] += century_right
        score["language"] += answer.language.strip().lower() == "latin"
        score["document_type"] += answer.document_type == "Charter"
        mark = "✓" if century_right else "✗"
        print(start, f"{answer.century[:15]:<15}{mark} {answer.script:<14}{answer.language[:9]:<10}"
                     f"{answer.document_type:<10}{answer.region[:45]}")

    totals = ", ".join(f"{field} {points}/{len(pages)}" for field, points in score.items())
    print(f"\n{model_name}: {totals}")


if __name__ == "__main__":
    main()
