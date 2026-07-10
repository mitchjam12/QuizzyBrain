# QuizzyBrain

QuizzyBrain is a lightweight kids quiz game.

## Add Questions

Edit `data/questions.csv`.

Use these columns:

```csv
id,category,difficulty,question,option_a,option_b,option_c,option_d,correct_option
```

Rules:

- `id` must be unique for each question. If it is left blank, QuizzyBrain creates a stable ID in the browser from the question content.
- `category` must match one of the names in `data/categories.json`.
- `difficulty` must be `Easy`, `Medium`, `Hard`, or `Expert`.
- `correct_option` must be `A`, `B`, `C`, or `D`.
- Each question needs exactly four answer options.
- Each category needs at least 12 questions.

After editing the CSV, validate the question file:

```powershell
C:\Users\rossj\AppData\Local\Programs\Python\Python314\python.exe tools\build_questions.py
```

The validator checks the CSV and does not write generated question files. The app reads `data/questions.csv` directly in the browser, so the CSV is the single source of truth for questions.

QuizzyBrain remembers completed question IDs on each computer using browser local storage. Category cards only appear when they can build a 12-question quiz from fresh questions. If a difficulty has fewer than 12 fresh questions, QuizzyBrain starts with that difficulty and fills the rest from the same category.

## Run Locally

Run a simple local server from the project folder:

```powershell
C:\Users\rossj\AppData\Local\Programs\Python\Python314\python.exe -m http.server 8765 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8765/`.
