/**
 * QuizzyBrain Core Application Architecture Module
 */

// ================= DATA LIBRARY LOADER =================
let QUIZ_BANKS = {};
let CATEGORY_METADATA = {};

const QUESTION_COLUMNS = [
    "id",
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
    "accepted_answers"
];
const CORRECT_OPTION_INDEX = { A: 0, B: 1, C: 2, D: 3 };
const DEFAULT_QUESTION_TIME_LIMIT = 15;
const BRAIN_TEASER_TIME_LIMIT = 60;

function normalizeCategoryMetadata(categories) {
    return categories.reduce((metadata, category) => {
        metadata[category.name] = {
            icon: category.icon,
            desc: category.desc,
            time: category.time
        };
        return metadata;
    }, {});
}

function parseCsvRows(csvText) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        const next = csvText[i + 1];

        if (char === '"' && inQuotes && next === '"') {
            cell += '"';
            i++;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
            row.push(cell);
            cell = "";
        } else if ((char === "\n" || char === "\r") && !inQuotes) {
            if (char === "\r" && next === "\n") i++;
            row.push(cell);
            if (row.some(value => value.trim())) rows.push(row);
            row = [];
            cell = "";
        } else {
            cell += char;
        }
    }

    row.push(cell);
    if (row.some(value => value.trim())) rows.push(row);
    return rows;
}

function slugifyQuestionId(value) {
    return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "question";
}

function generatedQuestionId(category, question, answerValues) {
    const source = [category, question, ...answerValues].join("|");
    let hash = 0;
    for (let i = 0; i < source.length; i++) {
        hash = ((hash << 5) - hash + source.charCodeAt(i)) | 0;
    }
    return `${slugifyQuestionId(category)}-${Math.abs(hash).toString(36)}`;
}

function csvRowsToQuestions(csvText, categoryNames) {
    const rows = parseCsvRows(csvText);
    if (rows.length < 2) return {};

    const headers = rows[0].map(header => header.trim().replace(/^\uFEFF/, ""));
    const missing = QUESTION_COLUMNS.filter(column => !headers.includes(column));
    if (missing.length) {
        throw new Error(`questions.csv is missing columns: ${missing.join(", ")}`);
    }

    const seenIds = new Set();
    return rows.slice(1).reduce((grouped, values, index) => {
        const row = headers.reduce((record, header, headerIndex) => {
            record[header] = (values[headerIndex] || "").trim();
            return record;
        }, {});

        const category = row.category;
        const answerMode = (row.answer_mode || "choice").toLowerCase();
        const options = [row.option_a, row.option_b, row.option_c, row.option_d];
        const correctOption = row.correct_option.toUpperCase();
        const canonicalAnswer = row.canonical_answer;
        const acceptedAnswers = row.accepted_answers
            .split("|")
            .map(answer => answer.trim())
            .filter(Boolean);
        const answerValues = answerMode === "text" ? [canonicalAnswer, ...acceptedAnswers] : options;
        const id = row.id || generatedQuestionId(category, row.question, answerValues);
        const rowNumber = index + 2;

        if (!categoryNames.has(category)) throw new Error(`questions.csv row ${rowNumber}: unknown category "${category}"`);
        if (!row.question) throw new Error(`questions.csv row ${rowNumber}: question is blank`);
        if (!['choice', 'text'].includes(answerMode)) {
            throw new Error(`questions.csv row ${rowNumber}: answer_mode must be choice or text`);
        }
        if (answerMode === "choice") {
            if (options.some(option => !option)) throw new Error(`questions.csv row ${rowNumber}: all four options are required`);
            if (!Object.prototype.hasOwnProperty.call(CORRECT_OPTION_INDEX, correctOption)) {
                throw new Error(`questions.csv row ${rowNumber}: correct_option must be A, B, C, or D`);
            }
        } else {
            if (!canonicalAnswer) {
                throw new Error(`questions.csv row ${rowNumber}: canonical_answer is required for text answers`);
            }
            if (options.some(Boolean) || correctOption) {
                throw new Error(`questions.csv row ${rowNumber}: text answers must leave option and correct_option fields blank`);
            }
        }
        if (seenIds.has(id)) throw new Error(`questions.csv row ${rowNumber}: duplicate id "${id}"`);

        seenIds.add(id);
        grouped[category] = grouped[category] || [];
        const question = {
            id,
            q: row.question,
            d: row.difficulty,
            mode: answerMode
        };
        if (answerMode === "text") {
            question.answer = canonicalAnswer;
            question.accepted = Array.from(new Set([canonicalAnswer, ...acceptedAnswers]));
        } else {
            question.a = options;
            question.c = CORRECT_OPTION_INDEX[correctOption];
        }
        grouped[category].push(question);
        return grouped;
    }, {});
}

function normalizeTextAnswer(value) {
    return String(value || "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[’'`]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/\s+/g, " ")
        .replace(/^(a|an|the)\s+/, "");
}

function getEditDistance(first, second) {
    const previous = Array.from({ length: second.length + 1 }, (_, index) => index);
    for (let firstIndex = 1; firstIndex <= first.length; firstIndex++) {
        let diagonal = previous[0];
        previous[0] = firstIndex;
        for (let secondIndex = 1; secondIndex <= second.length; secondIndex++) {
            const above = previous[secondIndex];
            previous[secondIndex] = Math.min(
                previous[secondIndex] + 1,
                previous[secondIndex - 1] + 1,
                diagonal + (first[firstIndex - 1] === second[secondIndex - 1] ? 0 : 1)
            );
            diagonal = above;
        }
    }
    return previous[second.length];
}

function isAcceptedTextAnswer(value, acceptedAnswers) {
    const candidate = normalizeTextAnswer(value);
    if (!candidate) return false;

    return acceptedAnswers.some(answer => {
        const expected = normalizeTextAnswer(answer);
        if (candidate === expected) return true;

        const shortestLength = Math.min(candidate.length, expected.length);
        const longestLength = Math.max(candidate.length, expected.length);
        if (shortestLength < 3 || longestLength < 4 || candidate[0] !== expected[0]) return false;
        const allowedDistance = longestLength >= 8 ? 2 : 1;
        return getEditDistance(candidate, expected) <= allowedDistance;
    });
}

async function loadQuestionLibrary() {
    const [categoriesResponse, questionsResponse] = await Promise.all([
        fetch("data/categories.json"),
        fetch("data/questions.csv")
    ]);

    if (!categoriesResponse.ok) throw new Error("Could not load data/categories.json.");
    if (!questionsResponse.ok) throw new Error("Could not load data/questions.csv.");

    const categories = await categoriesResponse.json();
    const categoryNames = new Set(categories.map(category => category.name));

    QUIZ_BANKS = csvRowsToQuestions(await questionsResponse.text(), categoryNames);
    CATEGORY_METADATA = normalizeCategoryMetadata(categories);
}

// Achievement Definition Bank
const ACHIEVEMENTS_REGISTRY = [
    { id: "first_quiz", title: "🏆 First Quiz", desc: "Complete any quiz category.", condition: s => s.gamesPlayed >= 1 },
    { id: "regular_player", title: "🎲 Regular Player", desc: "Complete 10 quizzes.", condition: s => s.gamesPlayed >= 10 },
    { id: "quiz_addict", title: "🔥 Quiz Addict", desc: "Complete 50 quizzes.", condition: s => s.gamesPlayed >= 50 },
    { id: "marathon", title: "🏃 Marathon", desc: "Complete 100 quizzes.", condition: s => s.gamesPlayed >= 100 },
    { id: "quiz_rookie", title: "🎯 Quiz Rookie", desc: "Answer 50 questions correctly.", condition: s => s.totalCorrect >= 50 },
    { id: "quiz_champ", title: "🏅 Quiz Champion", desc: "Answer 100 questions correctly.", condition: s => s.totalCorrect >= 100 },
    { id: "quiz_master", title: "👑 Quiz Master", desc: "Answer 500 questions correctly.", condition: s => s.totalCorrect >= 500 },
    { id: "legend", title: "🌟 Quiz Legend", desc: "Answer 1,000 questions correctly.", condition: s => s.totalCorrect >= 1000 },
    { id: "hot_streak", title: "🔥 Hot Streak", desc: "Get a 25 question streak.", condition: s => s.maxStreak >= 25 },
    { id: "unstoppable", title: "🚀 Unstoppable", desc: "Get a 50 question streak.", condition: s => s.maxStreak >= 50 },
    { id: "streak_legend", title: "💫 Streak Legend", desc: "Get a 100 question streak.", condition: s => s.maxStreak >= 100 },
    { id: "perfect_score", title: "⭐ Perfect Score", desc: "Earn your first perfect quiz score.", condition: s => s.perfectScores >= 1 },
    { id: "perfectionist", title: "💎 Perfectionist", desc: "Earn 5 perfect quiz scores.", condition: s => s.perfectScores >= 5 },
    { id: "gold_standard", title: "🥇 Gold Standard", desc: "Earn 10 perfect quiz scores.", condition: s => s.perfectScores >= 10 },
    { id: "flawless", title: "✨ Flawless", desc: "Earn 25 perfect quiz scores.", condition: s => s.perfectScores >= 25 },
    { id: "quiz_god", title: "👑 Quiz God", desc: "Earn 50 perfect quiz scores.", condition: s => s.perfectScores >= 50 },
    { id: "speed_demon", title: "⚡ Speed Demon", desc: "Finish a quiz under 30 seconds.", condition: s => s.fastestTime < 30 },
    { id: "lightning", title: "⚡ Lightning Fast", desc: "Finish a quiz under 20 seconds.", condition: s => s.fastestTime < 20 },
    { id: "flash", title: "💨 The Flash", desc: "Finish a quiz under 15 seconds.", condition: s => s.fastestTime < 15 },
    { id: "collector", title: "🗂️ Collector", desc: "Complete 5 categories.", condition: s => s.completedCats.length >= 5 },
    { id: "well_rounded", title: "🎓 Well Rounded", desc: "Complete 10 categories.", condition: s => s.completedCats.length >= 10 },
    { id: "completionist", title: "🏆 Completionist", desc: "Complete every category.", condition: s => s.completedCats.length >= getTotalCategoryCount() },
    { id: "bookworm", title: "📚 Bookworm", desc: "Complete Books.", condition: s => s.completedCats.includes("Books") },
    { id: "gamer", title: "🎮 Gamer", desc: "Complete Video Games.", condition: s => s.completedCats.includes("Video Games") },
    { id: "explorer", title: "🌍 Explorer", desc: "Complete Countries.", condition: s => s.completedCats.includes("Countries") },
    { id: "food_expert", title: "🍕 Food Expert", desc: "Complete Food.", condition: s => s.completedCats.includes("Food") },
    { id: "emoji_genius", title: "😂 Emoji Genius", desc: "Complete Emoji Quiz.", condition: s => s.completedCats.includes("Emoji Quiz") },
    { id: "sports_fan", title: "🏅 Sports Fan", desc: "Complete Sports.", condition: s => s.completedCats.includes("Sports") },
    { id: "sports_legend", title: "⚽ Sports Legend", desc: "Complete Sports Players.", condition: s => s.completedCats.includes("Sports Players") },
    { id: "movie_buff", title: "🎬 Movie Buff", desc: "Complete Movie Characters.", condition: s => s.completedCats.includes("Movie Characters") },
    { id: "strategist", title: "♟️ Strategist", desc: "Complete Board Games.", condition: s => s.completedCats.includes("Board Games") },
    { id: "brainiac", title: "🧠 Brainiac", desc: "Complete Brain Teasers.", condition: s => s.completedCats.includes("Brain Teasers") },
    { id: "aussie_expert", title: "🇦🇺 Aussie Expert", desc: "Complete all Australian categories.", condition: s =>
        [
            "Australian Geography",
            "Australian Wildlife",
            "Aussie Slang",
            "AFL Trivia"
        ].every(cat => s.completedCats.includes(cat))
    }
];

// ================= GLOBAL APPLICATION STATE =================
let state = {
    userStats: {
        gamesPlayed: 0,
        totalAnswered: 0,
        totalCorrect: 0,
        maxStreak: 0,
        perfectScores: 0,
        favCategory: "N/A",
        fastestTime: Number.MAX_SAFE_INTEGER,
        completedCats: [],
        catCounts: {},
        unlockedAchievements: [],
        answeredQuestionIds: [],
        dailyChallengeResult: null
    },

    activeQuiz: {
        category: null,
        difficulty: "all",
        questions: [],
        currentIdx: 0,
        score: 0,
        streak: 0,
        maxStreakThisRun: 0,
        startTime: null,
        timerVal: DEFAULT_QUESTION_TIME_LIMIT,
        timerLimit: DEFAULT_QUESTION_TIME_LIMIT,
        timerId: null,
        isDaily: false,
        isFinished: false,
        answerLocked: false,
        awaitingSelfAssessment: false,
        dailySeed: null
    }
};

// ================= NATIVE SYNTHESIZED WEB AUDIO ENGINE =================
const AudioEngine = {
    ctx: null,
    init() { 
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)(); 
        }
    },
    play(type) {
        if (!document.getElementById("toggle-sound").checked) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        if (type === "click") {
            osc.frequency.setValueAtTime(400, now);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
            osc.start(now); osc.stop(now + 0.05);
        } else if (type === "correct") {
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.setValueAtTime(659.25, now + 0.08);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
            osc.start(now); osc.stop(now + 0.25);
        } else if (type === "wrong") {
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.linearRampToValueAtTime(110, now + 0.2);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
            osc.start(now); osc.stop(now + 0.25);
        } else if (type === "victory") {
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.setValueAtTime(659.25, now + 0.1);
            osc.frequency.setValueAtTime(783.99, now + 0.2);
            osc.frequency.setValueAtTime(1046.50, now + 0.3);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
            osc.start(now); osc.stop(now + 0.6);
        }
    }
};

// ================= APPLICATION CORE ENGINE INITS =================
document.addEventListener("DOMContentLoaded", initializeApplication);

async function initializeApplication() {
    try {
        loadProgressFromStorage();
        renderParticleBackground();
        await loadQuestionLibrary();
        renderCategoryGrid();
        setupCoreEventListeners();
        updateDashboardDisplays();
        initDailyChallengeEngine();
    } catch (e) {
        console.error("QuizzyBrain startup failed:", e);
        const targetGrid = document.getElementById("categories-grid");
        if (targetGrid) {
            targetGrid.innerHTML = `<p class="grid-empty-state-text">Question library could not be loaded.</p>`;
        }
    }
}

// ================= STORAGE MANAGEMENT INTERFACE =================
function loadProgressFromStorage() {
    let saved = null;
    try {
        saved = localStorage.getItem("quizzybrain_userdata");
    } catch (e) {
        console.warn("localStorage unavailable in this context; stats won't persist.", e);
        return;
    }
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (typeof parsed.fastestTime !== "number") parsed.fastestTime = Number.MAX_SAFE_INTEGER;
            state.userStats = { ...state.userStats, ...parsed };
            if (!Array.isArray(state.userStats.answeredQuestionIds)) {
                state.userStats.answeredQuestionIds = [];
            }
        } catch (e) { console.error("Failed to load saved stats from localStorage, starting fresh.", e); }
    }
}

function saveProgressToStorage() {
    try {
        localStorage.setItem("quizzybrain_userdata", JSON.stringify(state.userStats));
    } catch (e) {
        console.warn("localStorage unavailable in this context; progress won't be saved.", e);
    }
}

function getAnsweredQuestionSet() {
    return new Set(state.userStats.answeredQuestionIds || []);
}

function getQuestionPool(categoryName) {
    return QUIZ_BANKS[categoryName] || [];
}

function markQuestionsAnswered(questions) {
    const answered = getAnsweredQuestionSet();
    questions.forEach(question => {
        if (question.id) answered.add(question.id);
    });
    state.userStats.answeredQuestionIds = Array.from(answered);
    saveProgressToStorage();
}

function getUnansweredQuestionPool(categoryName) {
    const answered = getAnsweredQuestionSet();
    return getQuestionPool(categoryName).filter(question => !answered.has(question.id));
}

function shuffleQuestions(questions) {
    const shuffled = [...questions];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function getQuizQuestionCount(categoryName) {
    return categoryName === "Brain Teasers" ? 5 : 12;
}

function getQuestionTimeLimit(categoryName) {
    return categoryName === "Brain Teasers" ? BRAIN_TEASER_TIME_LIMIT : DEFAULT_QUESTION_TIME_LIMIT;
}

function buildQuestionSelection(categoryName, difficultyMode = "all") {
    const freshQuestions = getUnansweredQuestionPool(categoryName);
    const questionCount = getQuizQuestionCount(categoryName);

    if (difficultyMode === "all") {
        return shuffleQuestions(freshQuestions).slice(0, questionCount);
    }
    return shuffleQuestions(freshQuestions.filter(question => question.d === difficultyMode)).slice(0, questionCount);
}

function getFreshQuestionCount(categoryName, difficultyMode = "all") {
    const freshQuestions = getUnansweredQuestionPool(categoryName);
    if (difficultyMode === "all") return freshQuestions.length;
    return freshQuestions.filter(question => question.d === difficultyMode).length;
}

function getAvailableCategoryNames(difficultyMode = "all") {
    return Object.keys(QUIZ_BANKS).filter(categoryName => {
        return getFreshQuestionCount(categoryName, difficultyMode) >= getQuizQuestionCount(categoryName);
    });
}

// ================= IN-GAME LIVE TIMER CORE ENGINE =================
function startLiveQuizTimer() {
    stopLiveQuizTimer();
    
    const timerToggle = document.getElementById("toggle-timer");
    const timerCircle = document.getElementById("quiz-timer-container");
    
    if (timerToggle && !timerToggle.checked) {
        if (timerCircle) timerCircle.style.display = "none";
        return;
    }
    if (timerCircle) timerCircle.style.removeProperty("display");

    state.activeQuiz.timerVal = state.activeQuiz.timerLimit;
    updateTimerVisualLayout();

    state.activeQuiz.timerId = setInterval(() => {
        state.activeQuiz.timerVal--;
        updateTimerVisualLayout();

        if (state.activeQuiz.timerVal <= 0) {
            stopLiveQuizTimer();
            handleQuizTimeOutEvent();
        }
    }, 1000);
}

function stopLiveQuizTimer() {
    if (state.activeQuiz.timerId) {
        clearInterval(state.activeQuiz.timerId);
        state.activeQuiz.timerId = null;
    }
}

function updateTimerVisualLayout() {
    const textVal = document.getElementById("quiz-timer-text");
    const progressPath = document.getElementById("timer-progress-path");
    
    if (textVal) textVal.innerText = state.activeQuiz.timerVal;
    
    if (progressPath) {
        const percentage = (state.activeQuiz.timerVal / state.activeQuiz.timerLimit) * 100;
        progressPath.setAttribute("stroke-dasharray", `${percentage}, 100`);
    }
}

function handleQuizTimeOutEvent() {
    AudioEngine.play("wrong");
    state.activeQuiz.streak = 0;
    
    const activeQuestion = state.activeQuiz.questions[state.activeQuiz.currentIdx];
    
    if (activeQuestion.mode === "choice") {
        lockChoiceSelectionLayout(null, activeQuestion.c);
    } else {
        lockTextInputFormLayout(false, activeQuestion.answer);
    }
}

// ================= CORE ENGINE SCENE-SWITCHING RUNTIME =================
function initQuizEngine(categoryName, difficultyMode = "all", isDaily = false) {
    stopLiveQuizTimer();
    
    let selection = [];
    if (isDaily) {
        selection = generateDailyChallenge();
    } else {
        selection = buildQuestionSelection(categoryName, difficultyMode);
    }

    if (selection.length === 0) {
        alert("Not enough fresh questions available right now!");
        return;
    }

    state.activeQuiz = {
        category: categoryName,
        difficulty: difficultyMode,
        questions: selection,
        currentIdx: 0,
        score: 0,
        streak: 0,
        maxStreakThisRun: 0,
        startTime: Date.now(),
        timerVal: getQuestionTimeLimit(categoryName),
        timerLimit: getQuestionTimeLimit(categoryName),
        timerId: null,
        isDaily: isDaily,
        isFinished: false,
        answerLocked: false,
        awaitingSelfAssessment: false,
        dailySeed: isDaily ? getDailySeed() : null
    };

    switchViewportContext("game-view");
    renderActiveQuizQuestion();
}

function renderActiveQuizQuestion() {
    state.activeQuiz.answerLocked = false;
    state.activeQuiz.awaitingSelfAssessment = false;
    
    const activeQuestion = state.activeQuiz.questions[state.activeQuiz.currentIdx];
    
    const card = document.getElementById("quiz-question-card");
    if (card) card.className = "glass-panel active-card";
    
    const progressTxt = document.getElementById("quiz-progress-txt");
    if (progressTxt) progressTxt.innerText = `Question ${state.activeQuiz.currentIdx + 1} of ${state.activeQuiz.questions.length}`;
    
    const progressFill = document.getElementById("quiz-progress-fill");
    if (progressFill) progressFill.style.width = `${((state.activeQuiz.currentIdx) / state.activeQuiz.questions.length) * 100}%`;
    
    const currentStreak = document.getElementById("quiz-current-streak");
    if (currentStreak) currentStreak.innerText = state.activeQuiz.streak;
    
    const questionText = document.getElementById("quiz-question-text");
    if (questionText) questionText.innerText = activeQuestion.q;

    const choiceContainer = document.getElementById("quiz-choices-box");
    const textInputForm = document.getElementById("quiz-text-input-form");
    const selfAssessBox = document.getElementById("quiz-self-assessment-box");
    const btnNext = document.getElementById("btn-quiz-next");

    if (choiceContainer) choiceContainer.innerHTML = "";
    if (textInputForm) textInputForm.style.display = "none";
    if (selfAssessBox) selfAssessBox.style.display = "none";
    if (btnNext) btnNext.style.display = "none";

    if (activeQuestion.mode === "choice") {
        if (choiceContainer) {
            choiceContainer.style.display = "grid";
            activeQuestion.a.forEach((choiceText, index) => {
                const button = document.createElement("button");
                button.className = "choice-option-btn glass-panel";
                button.innerHTML = `
                    <span class="choice-prefix">${String.fromCharCode(65 + index)}</span>
                    <span class="choice-text"></span>
                `;
                button.querySelector(".choice-text").innerText = choiceText;
                button.addEventListener("click", () => handleChoiceSelectionClick(index));
                choiceContainer.appendChild(button);
            });
        }
    } else {
        if (textInputForm) textInputForm.style.display = "block";
        const inputField = document.getElementById("quiz-text-answer-field");
        if (inputField) {
            inputField.value = "";
            inputField.disabled = false;
            inputField.focus();
        }
        const submitBtn = document.getElementById("btn-submit-text-answer");
        if (submitBtn) submitBtn.disabled = false;
    }

    startLiveQuizTimer();
}

function handleChoiceSelectionClick(chosenIdx) {
    if (state.activeQuiz.answerLocked) return;
    state.activeQuiz.answerLocked = true;
    stopLiveQuizTimer();

    const activeQuestion = state.activeQuiz.questions[state.activeQuiz.currentIdx];
    const isCorrect = chosenIdx === activeQuestion.c;

    if (isCorrect) {
        AudioEngine.play("correct");
        state.activeQuiz.score++;
        state.activeQuiz.streak++;
        if (state.activeQuiz.streak > state.activeQuiz.maxStreakThisRun) {
            state.activeQuiz.maxStreakThisRun = state.activeQuiz.streak;
        }
    } else {
        AudioEngine.play("wrong");
        state.activeQuiz.streak = 0;
    }

    lockChoiceSelectionLayout(chosenIdx, activeQuestion.c);
}

function lockChoiceSelectionLayout(chosenIdx, correctIdx) {
    const box = document.getElementById("quiz-choices-box");
    if (!box) return;
    const buttons = box.children;
    for (let i = 0; i < buttons.length; i++) {
        buttons[i].classList.add("disabled");
        if (i === correctIdx) {
            buttons[i].classList.add("correct");
        } else if (i === chosenIdx) {
            buttons[i].classList.add("wrong");
        }
    }
    showNextQuestionControl();
}

function submitTextAnswerForm() {
    if (state.activeQuiz.answerLocked) return;
    const answerInput = document.getElementById("quiz-text-answer-field");
    if (!answerInput) return;
    const rawVal = answerInput.value.trim();
    if (!rawVal) return;

    state.activeQuiz.answerLocked = true;
    stopLiveQuizTimer();
    answerInput.disabled = true;
    
    const submitBtn = document.getElementById("btn-submit-text-answer");
    if (submitBtn) submitBtn.disabled = true;

    const activeQuestion = state.activeQuiz.questions[state.activeQuiz.currentIdx];
    const matchesAnswerKey = isAcceptedTextAnswer(rawVal, activeQuestion.accepted);

    if (activeQuestion.category === "Brain Teasers") {
        const sab = document.getElementById("quiz-self-assessment-box");
        if (sab) sab.style.display = "block";
        const rca = document.getElementById("reveal-canonical-answer");
        if (rca) rca.innerText = activeQuestion.answer;
        state.activeQuiz.awaitingSelfAssessment = true;
    } else {
        if (matchesAnswerKey) {
            AudioEngine.play("correct");
            state.activeQuiz.score++;
            state.activeQuiz.streak++;
            if (state.activeQuiz.streak > state.activeQuiz.maxStreakThisRun) {
                state.activeQuiz.maxStreakThisRun = state.activeQuiz.streak;
            }
        } else {
            AudioEngine.play("wrong");
            state.activeQuiz.streak = 0;
        }
        lockTextInputFormLayout(matchesAnswerKey, activeQuestion.answer);
    }
}

function lockTextInputFormLayout(isCorrect, answerText) {
    const wrapper = document.getElementById("quiz-text-input-form");
    if (!wrapper) return;
    const responseBox = document.createElement("div");
    responseBox.className = `text-feedback-box glass-panel ${isCorrect ? 'correct' : 'wrong'}`;
    responseBox.innerHTML = `
        <p><strong>${isCorrect ? '✨ Correct!' : '❌ Incorrect'}</strong></p>
        <p class="canonical-reveal-txt">Answer: ${answerText}</p>
    `;
    wrapper.appendChild(responseBox);
    showNextQuestionControl();
}

function processSelfAssessmentScore(userAssessedCorrect) {
    if (!state.activeQuiz.awaitingSelfAssessment) return;
    state.activeQuiz.awaitingSelfAssessment = false;

    if (userAssessedCorrect) {
        AudioEngine.play("correct");
        state.activeQuiz.score++;
        state.activeQuiz.streak++;
        if (state.activeQuiz.streak > state.activeQuiz.maxStreakThisRun) {
            state.activeQuiz.maxStreakThisRun = state.activeQuiz.streak;
        }
    } else {
        AudioEngine.play("wrong");
        state.activeQuiz.streak = 0;
    }

    const sab = document.getElementById("quiz-self-assessment-box");
    if (sab) sab.style.display = "none";
    showNextQuestionControl();
}

// ================= RESULTS COMPILER & STATE UPDATER =================
function compileQuizSessionSummary() {
    stopLiveQuizTimer();
    state.activeQuiz.isFinished = true;
    AudioEngine.play("victory");

    const duration = Math.round((Date.now() - state.activeQuiz.startTime) / 1000);
    const totalQuestions = state.activeQuiz.questions.length;
    const finalScore = state.activeQuiz.score;
    const isPerfect = finalScore === totalQuestions;

    if (!state.activeQuiz.isDaily) {
        state.userStats.gamesPlayed++;
        state.userStats.totalAnswered += totalQuestions;
        state.userStats.totalCorrect += finalScore;

        if (state.activeQuiz.maxStreakThisRun > state.userStats.maxStreak) {
            state.userStats.maxStreak = state.activeQuiz.maxStreakThisRun;
        }
        if (isPerfect) state.userStats.perfectScores++;

        if (duration < state.userStats.fastestTime) {
            state.userStats.fastestTime = duration;
        }

        const cat = state.activeQuiz.category;
        state.userStats.catCounts[cat] = (state.userStats.catCounts[cat] || 0) + 1;
        if (!state.userStats.completedCats.includes(cat)) {
            state.userStats.completedCats.push(cat);
        }

        let topCat = "N/A";
        let topCount = 0;
        Object.keys(state.userStats.catCounts).forEach(c => {
            if (state.userStats.catCounts[c] > topCount) {
                topCount = state.userStats.catCounts[c];
                topCat = c;
            }
        });
        state.userStats.favCategory = topCat;

        markQuestionsAnswered(state.activeQuiz.questions);
    } else {
        state.userStats.dailyChallengeResult = {
            date: state.activeQuiz.dailySeed,
            score: finalScore,
            total: totalQuestions
        };
        saveProgressToStorage();
        updateDailyChallengeCard();
    }

    const incomingBadges = [];
    ACHIEVEMENTS_REGISTRY.forEach(ach => {
        if (!state.userStats.unlockedAchievements.includes(ach.id) && ach.condition(state.userStats)) {
            state.userStats.unlockedAchievements.push(ach.id);
            incomingBadges.push(ach.title);
        }
    });

    saveProgressToStorage();
    updateDashboardDisplays();

    const resTitle = document.getElementById("res-title");
    if (resTitle) resTitle.innerText = state.activeQuiz.isDaily ? "Daily Challenge Complete!" : "Quiz Finished!";
    
    const resCat = document.getElementById("res-category");
    if (resCat) resCat.innerText = state.activeQuiz.category;
    
    const resScore = document.getElementById("res-score");
    if (resScore) resScore.innerText = `${finalScore} / ${totalQuestions}`;
    
    const resTime = document.getElementById("res-time");
    if (resTime) resTime.innerText = `${duration} seconds`;
    
    const resStreak = document.getElementById("res-streak");
    if (resStreak) resStreak.innerText = state.activeQuiz.maxStreakThisRun;

    const badgeAlertBox = document.getElementById("res-badges-box");
    if (badgeAlertBox) {
        if (incomingBadges.length > 0) {
            badgeAlertBox.style.display = "block";
            badgeAlertBox.innerHTML = `<h3>🎉 Unlocked Achievements!</h3><p>${incomingBadges.join(", ")}</p>`;
        } else {
            badgeAlertBox.style.display = "none";
        }
    }

    switchViewportContext("results-view");
}

function showNextQuestionControl() {
    const btnNext = document.getElementById("btn-quiz-next");
    if (!btnNext) return;
    btnNext.style.display = "inline-flex";
    btnNext.focus();
    
    if (state.activeQuiz.currentIdx === state.activeQuiz.questions.length - 1) {
        btnNext.innerText = "Finish Quiz 🏁";
    } else {
        btnNext.innerText = "Next Question ➡️";
    }
}

function advanceQuizSequence() {
    const feedbackBox = document.querySelector(".text-feedback-box");
    if (feedbackBox) feedbackBox.remove();

    if (state.activeQuiz.currentIdx < state.activeQuiz.questions.length - 1) {
        state.activeQuiz.currentIdx++;
        renderActiveQuizQuestion();
    } else {
        compileQuizSessionSummary();
    }
}

// ================= CANVAS PARTICLE ENGINE INTERFACE =================
function renderParticleBackground() {
    const canvas = document.getElementById("particle-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let particles = [];
    
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener("resize", resize);
    resize();

    for (let i = 0; i < 40; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 4 + 2,
            dx: (Math.random() - 0.5) * 0.4,
            dy: (Math.random() - 0.5) * 0.4,
            color: Math.random() > 0.5 ? 'rgba(74, 119, 255, 0.15)' : 'rgba(157, 78, 221, 0.12)'
        });
    }

    function loop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.x += p.dx;
            p.y += p.dy;
            if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
        });
        requestAnimationFrame(loop);
    }
    loop();
}

// ================= RENDER DYNAMIC COMPONENT INTERFACES =================
function renderCategoryGrid(filterTerm = "", diffFilter = "all") {
    const targetGrid = document.getElementById("categories-grid");
    if (!targetGrid) return;
    targetGrid.innerHTML = "";
    
    getAvailableCategoryNames(diffFilter).forEach(catName => {
        const meta = CATEGORY_METADATA[catName];
        if (!meta) return;
        
        if (filterTerm && !catName.toLowerCase().includes(filterTerm.toLowerCase()) && !meta.desc.toLowerCase().includes(filterTerm.toLowerCase())) {
            return;
        }

        const questionCount = getQuizQuestionCount(catName);

        const card = document.createElement("div");
        card.className = "glass-panel category-card";
        card.setAttribute("tabindex", "0");
        card.setAttribute("role", "button");
        card.setAttribute("aria-label", `Play ${catName} Category. ${questionCount} questions. Duration ${meta.time}`);

        card.innerHTML = `
            <div class="cat-icon-frame">${meta.icon}</div>
            <h3>${catName}</h3>
            <p>${meta.desc}</p>
            <div class="cat-meta-footer">
                <span>📋 ${questionCount} Questions</span>
                <span>⚡ ${diffFilter === 'all' ? 'Mixed' : diffFilter}</span>
                <span>⏱️ ${meta.time}</span>
            </div>
        `;
        card.style.animationDelay = `${targetGrid.children.length * 60}ms`;

        const startQuizAction = () => { 
            AudioEngine.play("click"); 
            initQuizEngine(catName, diffFilter); 
        };
        card.addEventListener("click", startQuizAction);
        card.addEventListener("keydown", (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startQuizAction(); } });

        targetGrid.appendChild(card);
    });

    if (targetGrid.children.length === 0) {
        targetGrid.innerHTML = `<p class="grid-empty-state-text">No categories have enough fresh questions for this filter.</p>`;
    }
}

function getAnsweredQuestionsByCategory() {
    const answered = getAnsweredQuestionSet();
    const grouped = {};

    Object.keys(QUIZ_BANKS).forEach(categoryName => {
        getQuestionPool(categoryName).forEach(question => {
            if (!answered.has(question.id)) return;
            grouped[categoryName] = grouped[categoryName] || [];
            grouped[categoryName].push(question);
        });
    });
    return grouped;
}

function renderCompletedQuestions() {
    const container = document.getElementById("completed-questions-container");
    const countBadge = document.getElementById("completed-question-count");
    if (!container || !countBadge) return;

    const grouped = getAnsweredQuestionsByCategory();
    const categoryNames = Object.keys(grouped).sort();
    const total = categoryNames.reduce((sum, categoryName) => sum + grouped[categoryName].length, 0);
    countBadge.innerText = `${total} done`;
    container.innerHTML = "";

    if (total === 0) {
        container.innerHTML = `<p class="grid-empty-state-text">Completed quiz questions will appear here after a quiz is finished.</p>`;
        return;
    }

    categoryNames.forEach(categoryName => {
        const group = document.createElement("details");
        group.className = "completed-category";
        group.open = true;
        group.innerHTML = `
            <summary>
                <span>${categoryName}</span>
                <strong>${grouped[categoryName].length}</strong>
            </summary>
            <div class="completed-question-items"></div>
        `;

        const items = group.querySelector(".completed-question-items");
        grouped[categoryName]
            .sort((a, b) => a.q.localeCompare(b.q))
            .forEach(question => {
                const item = document.createElement("article");
                item.className = "completed-question-card";

                const questionText = document.createElement("p");
                questionText.className = "completed-question-text";
                questionText.innerText = question.q;

                const answerText = document.createElement("p");
                answerText.className = "completed-answer-text";
                const answerLabel = document.createElement("span");
                answerLabel.innerText = "Answer";
                const correctAnswer = question.mode === "text"
                    ? question.answer
                    : question.a[question.c];
                answerText.append(answerLabel, ` ${correctAnswer}`);

                item.append(questionText, answerText);
                items.appendChild(item);
            });

        container.appendChild(group);
    });
}

function updateDashboardDisplays() {
    const gamesEl = document.getElementById("stat-games");
    if (gamesEl) gamesEl.innerText = state.userStats.gamesPlayed;
    
    const accuracyEl = document.getElementById("stat-accuracy");
    if (accuracyEl) {
        const acc = state.userStats.totalAnswered > 0 ? Math.round((state.userStats.totalCorrect / state.userStats.totalAnswered) * 100) : 0;
        accuracyEl.innerText = `${acc}%`;
    }
    
    const streakEl = document.getElementById("stat-streak");
    if (streakEl) streakEl.innerText = state.userStats.maxStreak;
    
    const favEl = document.getElementById("stat-fav");
    if (favEl) favEl.innerText = state.userStats.favCategory;

    const achContainer = document.getElementById("achievements-container");
    if (achContainer) {
        achContainer.innerHTML = "";
        ACHIEVEMENTS_REGISTRY.forEach(ach => {
            const isUnlocked = state.userStats.unlockedAchievements.includes(ach.id);
            const achNode = document.createElement("div");
            achNode.className = `achievement-item ${isUnlocked ? 'unlocked' : 'locked'}`;
            achNode.innerHTML = `
                <div class="ach-icon">${ach.title.split(" ")[0]}</div>
                <div class="ach-info">
                    <h4>${ach.title.substring(2)}</h4>
                    <p>${ach.desc} ${isUnlocked ? '✅' : '🔒'}</p>
                </div>
            `;
            achContainer.appendChild(achNode);
        });
    }
    renderCompletedQuestions();
}

// ================= DAILY CHALLENGE GENERATOR =================
function getDailySeed() {
    const today = new Date();
    return today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate();
}

function seededRandom(seed) {
    let x = 0;
    for (let i = 0; i < seed.length; i++) {
        x += seed.charCodeAt(i);
    }
    return Math.sin(x) * 10000 % 1;
}

function dailyQuestionScore(seed, question) {
    return seededRandom(`${seed}-${question.id || question.q}`);
}

function seededQuestionSort(seed, questions) {
    return [...questions].sort((a, b) => dailyQuestionScore(seed, a) - dailyQuestionScore(seed, b));
}

function generateDailyChallenge() {
    const seed = getDailySeed();
    const categoryNames = Object.keys(QUIZ_BANKS).filter(categoryName => categoryName !== "Brain Teasers");
    const selected = [];
    const selectedIds = new Set();

    seededQuestionSort(seed, categoryNames.map(name => ({ id: name, q: name }))).forEach(categoryRef => {
        const categoryQuestions = seededQuestionSort(seed, getQuestionPool(categoryRef.id));
        if (categoryQuestions.length === 0 || selected.length >= 12) return;
        selected.push(categoryQuestions[0]);
        selectedIds.add(categoryQuestions[0].id);
    });

    const remainingQuestions = [];
    categoryNames.forEach(categoryName => {
        getQuestionPool(categoryName).forEach(question => {
            if (!selectedIds.has(question.id)) remainingQuestions.push(question);
        });
    });

    seededQuestionSort(seed, remainingQuestions).forEach(question => {
        if (selected.length >= 12) return;
        selected.push(question);
    });

    return selected.slice(0, 12);
}

function getTodaysDailyChallengeResult() {
    const result = state.userStats.dailyChallengeResult;
    if (!result || result.date !== getDailySeed()) return null;
    if (!Number.isInteger(result.score) || !Number.isInteger(result.total)) return null;
    if (result.total < 1 || result.score < 0 || result.score > result.total) return null;
    return result;
}

function updateDailyChallengeCard() {
    const result = getTodaysDailyChallengeResult();
    const statusText = document.getElementById("daily-status-text");
    const countdownLabel = document.getElementById("daily-countdown-label");
    const playButton = document.getElementById("btn-play-daily");

    if (!statusText || !countdownLabel || !playButton) return;

    if (result) {
        statusText.innerText = `Today’s score: ${result.score} / ${result.total}`;
        countdownLabel.innerText = "Next challenge in: ";
        playButton.hidden = true;
        playButton.style.display = "none";
        return;
    }

    statusText.innerText = `Ready for challenge puzzle of ${new Date().toDateString()}!`;
    countdownLabel.innerText = "Resets in: ";
    playButton.hidden = false;
    playButton.style.removeProperty("display");
}

function initDailyChallengeEngine() {
    let displayedSeed = getDailySeed();

    function refreshCountdown() {
        const now = new Date();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const diff = tomorrow - now;
        
        const hrs = String(Math.floor((diff / (1000 * 60 * 60)) % 24)).padStart(2, '0');
        const mins = String(Math.floor((diff / (1000 * 60)) % 60)).padStart(2, '0');
        const secs = String(Math.floor((diff / 1000) % 60)).padStart(2, '0');
        
        const countdownEl = document.getElementById("daily-countdown");
        if (countdownEl) countdownEl.innerText = `${hrs}:${mins}:${secs}`;

        const currentSeed = getDailySeed();
        if (currentSeed !== displayedSeed) {
            displayedSeed = currentSeed;
            updateDailyChallengeCard();
            renderCategoryGrid();
        }
    }
    setInterval(refreshCountdown, 1000);
    refreshCountdown();
    updateDailyChallengeCard();
}

// ================= VIEWPORT ROUTING LOGIC ENGINE =================
function switchViewportContext(viewId) {
    const homeView = document.getElementById("home-view");
    const gameView = document.getElementById("game-view");
    const resultsView = document.getElementById("results-view");

    if (homeView) homeView.style.display = "none";
    if (gameView) gameView.style.display = "none";
    if (resultsView) resultsView.style.display = "none";

    const activeView = document.getElementById(viewId);
    if (activeView) activeView.style.removeProperty("display");
    
    if (viewId === "home-view") {
        renderCategoryGrid();
    }
}

function setActiveHomeTab(tabId) {
    document.querySelectorAll(".home-tab").forEach(tab => {
        const target = tab.dataset.tabTarget;
        const panel = document.getElementById(target);
        if (target === tabId) {
            tab.classList.add("active");
            tab.setAttribute("aria-selected", "true");
            if (panel) { panel.classList.add("active"); panel.removeAttribute("hidden"); }
        } else {
            tab.classList.remove("active");
            tab.setAttribute("aria-selected", "false");
            if (panel) { panel.classList.remove("active"); panel.setAttribute("hidden", "true"); }
        }
    });
}

function getTotalCategoryCount() {
    return Object.keys(QUIZ_BANKS).length;
}

function exitToDashboardView() {
    AudioEngine.play("click");
    stopLiveQuizTimer();
    switchViewportContext("home-view");
}

// ================= EVENT LISTENER HUBS =================
function setupCoreEventListeners() {
    const btnStart = document.getElementById("btn-start-exploring");
    if (btnStart) {
        btnStart.addEventListener("click", () => {
            AudioEngine.play("click");
            setActiveHomeTab("play-panel");
            const searchInput = document.getElementById("category-search");
            if (searchInput) {
                searchInput.scrollIntoView({ behavior: 'smooth' });
                searchInput.focus();
            }
        });
    }

    document.querySelectorAll(".home-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            AudioEngine.play("click");
            setActiveHomeTab(tab.dataset.tabTarget);
        });
    });

    const searchInput = document.getElementById("category-search");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const diffSelect = document.getElementById("difficulty-select");
            const diff = diffSelect ? diffSelect.value : "all";
            renderCategoryGrid(e.target.value, diff);
        });
    }

    const diffSelect = document.getElementById("difficulty-select");
    if (diffSelect) {
        diffSelect.addEventListener("change", (e) => {
            const searchEl = document.getElementById("category-search");
            const term = searchEl ? searchEl.value : "";
            renderCategoryGrid(term, e.target.value);
        });
    }

    const textForm = document.getElementById("quiz-text-input-form");
    if (textForm) {
        textForm.addEventListener("submit", (e) => {
            e.preventDefault();
            submitTextAnswerForm();
        });
    }

    const btnAssessTrue = document.getElementById("btn-assess-true");
    if (btnAssessTrue) {
        btnAssessTrue.addEventListener("click", () => processSelfAssessmentScore(true));
    }
    const btnAssessFalse = document.getElementById("btn-assess-false");
    if (btnAssessFalse) {
        btnAssessFalse.addEventListener("click", () => processSelfAssessmentScore(false));
    }

    const btnNext = document.getElementById("btn-quiz-next");
    if (btnNext) {
        btnNext.addEventListener("click", () => {
            AudioEngine.play("click");
            advanceQuizSequence();
        });
    }

    const quitButtons = document.querySelectorAll("#btn-quit-quiz, #btn-return-home");
    quitButtons.forEach(btn => {
        btn.addEventListener("click", exitToDashboardView);
    });

    const btnPlayDaily = document.getElementById("btn-play-daily");
    if (btnPlayDaily) {
        btnPlayDaily.addEventListener("click", () => {
            AudioEngine.play("click");
            initQuizEngine("Daily Challenge", "all", true);
        });
    }
}
