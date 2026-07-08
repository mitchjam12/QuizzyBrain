# QuizzyBrain

QuizzyBrain is a lightweight kids quiz game.

## Add Questions

Edit `data/questions.csv`.

Use these columns:

```csv
category,difficulty,question,option_a,option_b,option_c,option_d,correct_option
```

Rules:

- `category` must match one of the names in `data/categories.json`.
- `difficulty` must be `Easy`, `Medium`, `Hard`, or `Expert`.
- `correct_option` must be `A`, `B`, `C`, or `D`.
- Each question needs exactly four answer options.
- Each category needs at least 12 questions.

After editing the CSV, rebuild the app question library:

```powershell
C:\Users\rossj\AppData\Local\Programs\Python\Python314\python.exe tools\build_questions.py
```

The builder validates the CSV and updates:

- `data/questions.json`
- `data/question-library.js`

The app uses `data/question-library.js` in the browser.

## Run Locally

Open `index.html` in a browser.
