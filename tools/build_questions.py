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
MINIMUM_QUESTION_COUNTS = {"Brain Teasers": 5}
DEFAULT_MINIMUM_QUESTION_COUNT = 12
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
    "answer_mode",
    "canonical_answer",
    "accepted_answers",
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
    value = row.get(column, "")
    return "" if value is None else str(value).strip()


def slugify(value):
    value = value.lower().replace("&", "and")
    return re.sub(r"[^a-z0-9]+", "-", value).strip("-") or "question"


def generated_question_id(category, question, answer_values):
    digest_source = "|".join([category, question, *answer_values])
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
            answer_mode = clean_cell(row, "answer_mode").lower() or "choice"
            canonical_answer = clean_cell(row, "canonical_answer")
            accepted_answers = [
                answer.strip()
                for answer in clean_cell(row, "accepted_answers").split("|")
                if answer.strip()
            ]
            answer_values = [canonical_answer, *accepted_answers] if answer_mode == "text" else options
            question_id = clean_cell(row, "id") or generated_question_id(category, question, answer_values)

            if question_id in seen_ids:
                errors.append(f"row {row_number}: duplicate id '{question_id}'")
            if category not in category_names:
                errors.append(f"row {row_number}: unknown category '{category}'")
            if difficulty not in DIFFICULTIES:
                errors.append(f"row {row_number}: difficulty must be one of {', '.join(sorted(DIFFICULTIES))}")
            if not question:
                errors.append(f"row {row_number}: question is blank")
            if answer_mode not in {"choice", "text"}:
                errors.append(f"row {row_number}: answer_mode must be choice or text")
            elif answer_mode == "choice":
                if any(not option for option in options):
                    errors.append(f"row {row_number}: all four options are required for choice answers")
                if correct_option not in CORRECT_OPTIONS:
                    errors.append(f"row {row_number}: correct_option must be A, B, C, or D for choice answers")
            else:
                if not canonical_answer:
                    errors.append(f"row {row_number}: canonical_answer is required for text answers")
                if any(options) or correct_option:
                    errors.append(f"row {row_number}: text answers must leave option and correct_option fields blank")

            if errors and errors[-1].startswith(f"row {row_number}:"):
                continue

            seen_ids.add(question_id)
            question_record = {
                "id": question_id,
                "category": category,
                "difficulty": difficulty,
                "question": question,
                "answerMode": answer_mode,
            }
            if answer_mode == "text":
                question_record["canonicalAnswer"] = canonical_answer
                question_record["acceptedAnswers"] = list(dict.fromkeys([canonical_answer, *accepted_answers]))
            else:
                question_record["options"] = options
                question_record["correctIndex"] = CORRECT_OPTIONS[correct_option]
            questions.append(question_record)

    if errors:
        raise ValueError("Question validation failed:\n" + "\n".join(errors))

    return questions


def validate_category_totals(categories, questions):
    totals = {category["name"]: 0 for category in categories}
    for question in questions:
        totals[question["category"]] += 1

    too_small = [
        f"{category}: {total} (minimum {MINIMUM_QUESTION_COUNTS.get(category, DEFAULT_MINIMUM_QUESTION_COUNT)})"
        for category, total in totals.items()
        if total < MINIMUM_QUESTION_COUNTS.get(category, DEFAULT_MINIMUM_QUESTION_COUNT)
    ]
    if too_small:
        raise ValueError(
            "Categories do not have enough questions. Current counts: "
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
