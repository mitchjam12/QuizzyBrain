# QuizzyBrain

QuizzyBrain is a lightweight online quiz game for all ages, with trivia, brain teasers and daily challenges across a wide range of categories.

## Add Questions

Edit `data/questions.csv`.

Use these columns:

```csv
id,category,difficulty,question,option_a,option_b,option_c,option_d,correct_option,answer_mode,canonical_answer,accepted_answers
```

Rules:

- `id` must be unique for each question. If it is left blank, QuizzyBrain creates a stable ID in the browser from the question content.
- `category` must match one of the names in `data/categories.json`.
- `difficulty` must be `Easy`, `Medium`, `Hard`, or `Expert`.
- `answer_mode` can be blank or `choice` for multiple-choice questions, or `text` for typed answers.
- Choice questions need exactly four answer options and a `correct_option` of `A`, `B`, `C`, or `D`.
- Text questions leave the option and `correct_option` fields blank, provide a `canonical_answer`, and can list alternatives in `accepted_answers` separated by `|`.
- Each category needs at least 12 questions, except Brain Teasers, which uses five-question rounds and needs at least five.

Typed answers ignore capitalisation, punctuation, extra spaces, and leading words such as “a”, “an”, and “the”. QuizzyBrain also tolerates a small spelling error for answers of four or more characters. If a typed answer is not recognised, the official answer is revealed and the player can confirm whether they meant the same thing.

Example text-answer row:

```csv
brain-teasers-001,Brain Teasers,Easy,What has keys but can’t open locks?,,,,,,text,Piano,piano|keyboard
```

After editing the CSV, validate the question file:

```powershell
C:\Users\rossj\AppData\Local\Programs\Python\Python314\python.exe tools\build_questions.py
```

The validator checks the CSV and does not write generated question files. The app reads `data/questions.csv` directly in the browser, so the CSV is the single source of truth for questions.

QuizzyBrain remembers completed question IDs on each computer using browser local storage. Category cards appear whenever they have enough fresh questions matching the selected difficulty filter: 12 for standard categories and five for Brain Teasers.

The Daily Challenge uses a deterministic daily mix of standard quiz categories without consuming questions from the regular category freshness pool. Brain Teasers are excluded because they use their own typed-answer format and five-question rounds. After the Daily Challenge is completed, its card shows the saved score and the countdown to the next challenge instead of another play button.

## Run Locally

Run a simple local server from the project folder:

```powershell
C:\Users\rossj\AppData\Local\Programs\Python\Python314\python.exe -m http.server 8765 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8765/`.
