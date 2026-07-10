import csv
import hashlib
import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
CATEGORIES_PATH = DATA_DIR / "categories.json"
CSV_PATH = DATA_DIR / "questions.csv"

DIFFICULTIES = {"Easy", "Medium", "Hard", "Expert"}
CORRECT_OPTIONS = {"A": 0, "B": 1, "C": 2, "D": 3}
REQUIRED_COLUMNS = [
    "category",
    "difficulty",
    "question",
    "option_a",
    "option_b",
    "option_c",
    "option_d",
    "correct_option",
]

OPTIONAL_COLUMNS = {"id"}


def read_categories():
    if not CATEGORIES_PATH.exists():
        raise FileNotFoundError(f"Missing category file: {CATEGORIES_PATH}")

    with CATEGORIES_PATH.open("r", encoding="utf-8") as handle:
        categories = json.load(handle)

    if not isinstance(categories, list):
        raise ValueError("categories.json must be a list of category objects.")

    seen = set()
    for index, category in enumerate(categories, start=1):
        name = str(category.get("name", "")).strip()
        if not name:
            raise ValueError(f"Category row {index} is missing a name.")
        if name in seen:
            raise ValueError(f"Duplicate category in categories.json: {name}")
        for field in ("icon", "desc", "time"):
            if not str(category.get(field, "")).strip():
                raise ValueError(f"Category {name} is missing {field}.")
        seen.add(name)

    return categories


def clean_cell(row, column):
    return str(row.get(column, "")).strip()


def slugify(value):
    value = value.lower().replace("&", "and")
    return re.sub(r"[^a-z0-9]+", "-", value).strip("-") or "question"


def generated_question_id(category, question, options):
    digest_source = "|".join([category, question, *options])
    digest = hashlib.sha1(digest_source.encode("utf-8")).hexdigest()[:10]
    return f"{slugify(category)}-{digest}"


def read_questions(category_names):
    if not CSV_PATH.exists():
        raise FileNotFoundError(f"Missing question file: {CSV_PATH}")

    questions = []
    errors = []
    seen_ids = set()

    with CSV_PATH.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        missing = [column for column in REQUIRED_COLUMNS if column not in (reader.fieldnames or [])]
        unknown = [
            column
            for column in (reader.fieldnames or [])
            if column not in REQUIRED_COLUMNS and column not in OPTIONAL_COLUMNS
        ]
        if missing:
            raise ValueError(f"questions.csv is missing columns: {', '.join(missing)}")
        if unknown:
            raise ValueError(f"questions.csv has unknown columns: {', '.join(unknown)}")

        for row_number, row in enumerate(reader, start=2):
            category = clean_cell(row, "category")
            difficulty = clean_cell(row, "difficulty")
            question = clean_cell(row, "question")
            options = [
                clean_cell(row, "option_a"),
                clean_cell(row, "option_b"),
                clean_cell(row, "option_c"),
                clean_cell(row, "option_d"),
            ]
            correct_option = clean_cell(row, "correct_option").upper()
            question_id = clean_cell(row, "id") or generated_question_id(category, question, options)

            if question_id in seen_ids:
                errors.append(f"row {row_number}: duplicate id '{question_id}'")
            if category not in category_names:
                errors.append(f"row {row_number}: unknown category '{category}'")
            if difficulty not in DIFFICULTIES:
                errors.append(f"row {row_number}: difficulty must be one of {', '.join(sorted(DIFFICULTIES))}")
            if not question:
                errors.append(f"row {row_number}: question is blank")
            if any(not option for option in options):
                errors.append(f"row {row_number}: all four options are required")
            if correct_option not in CORRECT_OPTIONS:
                errors.append(f"row {row_number}: correct_option must be A, B, C, or D")

            if errors and errors[-1].startswith(f"row {row_number}:"):
                continue

            seen_ids.add(question_id)
            questions.append({
                "id": question_id,
                "category": category,
                "difficulty": difficulty,
                "question": question,
                "options": options,
                "correctIndex": CORRECT_OPTIONS[correct_option],
            })

    if errors:
        raise ValueError("Question validation failed:\n" + "\n".join(errors))

    return questions


def validate_category_totals(categories, questions):
    totals = {category["name"]: 0 for category in categories}
    for question in questions:
        totals[question["category"]] += 1

    too_small = [
        f"{category}: {total}"
        for category, total in totals.items()
        if total < 12
    ]
    if too_small:
        raise ValueError(
            "Each category needs at least 12 questions. Current counts: "
            + "; ".join(too_small)
        )


def main():
    categories = read_categories()
    category_names = {category["name"] for category in categories}
    questions = read_questions(category_names)
    validate_category_totals(categories, questions)

    print(f"Validated {len(questions)} questions across {len(categories)} categories.")
    print("No generated question files were written. The app reads data/questions.csv directly.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
