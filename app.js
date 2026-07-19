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
    // Games Played
    { id: "first_quiz", title: "🏆 First Quiz", desc: "Complete any quiz category.", condition: s => s.gamesPlayed >= 1 },
    { id: "regular_player", title: "🎲 Regular Player", desc: "Complete 10 quizzes.", condition: s => s.gamesPlayed >= 10 },
    { id: "quiz_addict", title: "🔥 Quiz Addict", desc: "Complete 50 quizzes.", condition: s => s.gamesPlayed >= 50 },
    { id: "marathon", title: "🏃 Marathon", desc: "Complete 100 quizzes.", condition: s => s.gamesPlayed >= 100 },

    // Correct Answers
    { id: "quiz_rookie", title: "🎯 Quiz Rookie", desc: "Answer 50 questions correctly.", condition: s => s.totalCorrect >= 50 },
    { id: "quiz_champ", title: "🏅 Quiz Champion", desc: "Answer 100 questions correctly.", condition: s => s.totalCorrect >= 100 },
    { id: "quiz_master", title: "👑 Quiz Master", desc: "Answer 500 questions correctly.", condition: s => s.totalCorrect >= 500 },
    { id: "legend", title: "🌟 Quiz Legend", desc: "Answer 1,000 questions correctly.", condition: s => s.totalCorrect >= 1000 },

    // Streaks
    { id: "hot_streak", title: "🔥 Hot Streak", desc: "Get a 25 question streak.", condition: s => s.maxStreak >= 25 },
    { id: "unstoppable", title: "🚀 Unstoppable", desc: "Get a 50 question streak.", condition: s => s.maxStreak >= 50 },
    { id: "streak_legend", title: "💫 Streak Legend", desc: "Get a 100 question streak.", condition: s => s.maxStreak >= 100 },

    // Perfect Scores
    { id: "perfect_score", title: "⭐ Perfect Score", desc: "Earn your first perfect quiz score.", condition: s => s.perfectScores >= 1 },
    { id: "perfectionist", title: "💎 Perfectionist", desc: "Earn 5 perfect quiz scores.", condition: s => s.perfectScores >= 5 },
    { id: "gold_standard", title: "🥇 Gold Standard", desc: "Earn 10 perfect quiz scores.", condition: s => s.perfectScores >= 10 },
    { id: "flawless", title: "✨ Flawless", desc: "Earn 25 perfect quiz scores.", condition: s => s.perfectScores >= 25 },
    { id: "quiz_god", title: "👑 Quiz God", desc: "Earn 50 perfect quiz scores.", condition: s => s.perfectScores >= 50 },

    // Speed
    { id: "speed_demon", title: "⚡ Speed Demon", desc: "Finish a quiz under 30 seconds.", condition: s => s.fastestTime < 30 },
    { id: "lightning", title: "⚡ Lightning Fast", desc: "Finish a quiz under 20 seconds.", condition: s => s.fastestTime < 20 },
    { id: "flash", title: "💨 The Flash", desc: "Finish a quiz under 15 seconds.", condition: s => s.fastestTime < 15 },

    // Categories
    { id: "collector", title: "🗂️ Collector", desc: "Complete 5 categories.", condition: s => s.completedCats.length >= 5 },
    { id: "well_rounded", title: "🎓 Well Rounded", desc: "Complete 10 categories.", condition: s => s.completedCats.length >= 10 },
    { id: "completionist", title: "🏆 Completionist", desc: "Complete every category.", condition: s => s.completedCats.length >= getTotalCategoryCount() },

    // Category Achievements
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

        // NEW: Tracks number of perfect quizzes completed
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
        timerVal: 15,
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
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
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
            // Guard against older saves where fastestTime was corrupted to null by JSON.stringify(Infinity)
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

function getCategoryCompletionScore(questionCount) {
    return Math.ceil(questionCount / 2);
}

function buildQuestionSelection(categoryName, difficultyMode = "all") {
    const answered = getAnsweredQuestionSet();
    const questionCount = getQuizQuestionCount(categoryName);
    const eligibleQuestions = getQuestionPool(categoryName).filter(question => {
        return difficultyMode === "all" || question.d === difficultyMode;
    });
    const freshQuestions = eligibleQuestions.filter(question => !answered.has(question.id));
    const replayQuestions = eligibleQuestions.filter(question => answered.has(question.id));

    return [
        ...shuffleQuestions(freshQuestions),
        ...shuffleQuestions(replayQuestions)
    ].slice(0, questionCount);
}

function getFreshQuestionCount(categoryName, difficultyMode = "all") {
    const freshQuestions = getUnansweredQuestionPool(categoryName);
    if (difficultyMode === "all") return freshQuestions.length;
    return freshQuestions.filter(question => question.d === difficultyMode).length;
}

function getAvailableCategoryNames(difficultyMode = "all") {
    return Object.keys(QUIZ_BANKS).filter(categoryName => {
        const eligibleCount = getQuestionPool(categoryName).filter(question => {
            return difficultyMode === "all" || question.d === difficultyMode;
        }).length;
        return eligibleCount >= getQuizQuestionCount(categoryName);
    });
}

// ================= CANVAS PARTICLE ENGINE INTERFACE =================
function renderParticleBackground() {
    const canvas = document.getElementById("particle-canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        console.warn("Canvas 2D context unavailable; skipping decorative particle background.");
        return;
    }
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
    targetGrid.innerHTML = "";
    
    getAvailableCategoryNames(diffFilter).forEach(catName => {
        const meta = CATEGORY_METADATA[catName];

        if (!meta) return;
        
        // Search Filter Execution
        if (filterTerm && !catName.toLowerCase().includes(filterTerm.toLowerCase()) && !meta.desc.toLowerCase().includes(filterTerm.toLowerCase())) {
            return;
        }

        const freshCount = getFreshQuestionCount(catName, diffFilter);
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
                <span>📋 ${freshCount > 0 ? `${freshCount} fresh Qs` : "Replay ready"}</span>
                <span>⚡ ${diffFilter === 'all' ? 'Mixed' : diffFilter}</span>
                <span>⏱️ ${meta.time}</span>
            </div>
        `;
        card.style.animationDelay = `${targetGrid.children.length * 60}ms`;

        // Interactivity Bindings
        const startQuizAction = () => { AudioEngine.play("click"); initQuizEngine(catName, diffFilter); };
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
    // Stats Matrix Render
    document.getElementById("stat-games").innerText = state.userStats.gamesPlayed;
    const acc = state.userStats.totalAnswered > 0 ? Math.round((state.userStats.totalCorrect / state.userStats.totalAnswered) * 100) : 0;
    document.getElementById("stat-accuracy").innerText = `${acc}%`;
    document.getElementById("stat-streak").innerText = state.userStats.maxStreak;
    document.getElementById("stat-fav").innerText = state.userStats.favCategory;

    // Achievements Status Grid Generator
    const achContainer = document.getElementById("achievements-container");
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
    renderCompletedQuestions();
}
// ================= DAILY CHALLENGE GENERATOR =================

function getDailySeed() {
    const today = new Date();

    return today.getFullYear() +
        "-" +
        (today.getMonth() + 1) +
        "-" +
        today.getDate();
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
// ================= DAILY CHALLENGE CONFIG MODULES =================
function initDailyChallengeEngine() {
    let displayedSeed = getDailySeed();

    function refreshCountdown() {
        const now = new Date();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const diff = tomorrow - now;
        
        const hrs = String(Math.floor((diff / (1000 * 60 * 60)) % 24)).padStart(2, '0');
        const mins = String(Math.floor((diff / (1000 * 60)) % 60)).padStart(2, '0');
        const secs = String(Math.floor((diff / 1000) % 60)).padStart(2, '0');
        
        document.getElementById("daily-countdown").innerText = `${hrs}:${mins}:${secs}`;

        const currentSeed = getDailySeed();
        if (currentSeed !== displayedSeed) {
            displayedSeed = currentSeed;
            updateDailyChallengeCard();
        }
    }
    setInterval(refreshCountdown, 1000);
    refreshCountdown();
    updateDailyChallengeCard();
}

// ================= EVENT LISTENER HUBS =================
function setupCoreEventListeners() {
    // Top Hero Scroller
    document.getElementById("btn-start-exploring").addEventListener("click", () => {
        AudioEngine.play("click");
        setActiveHomeTab("play-panel");
        document.getElementById("category-search").scrollIntoView({ behavior: 'smooth' });
        document.getElementById("category-search").focus();
    });

    document.querySelectorAll(".home-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            AudioEngine.play("click");
            setActiveHomeTab(tab.dataset.tabTarget);
        });
    });

    // Search input framework
    document.getElementById("category-search").addEventListener("input", (e) => {
        const diff = document.getElementById("difficulty-select").value;
        renderCategoryGrid(e.target.value, diff);
    });

    // Difficulty filtering interaction selector
    document.getElementById("difficulty-select").addEventListener("change", (e) => {
        AudioEngine.play("click");
        const term = document.getElementById("category-search").value;
        renderCategoryGrid(term, e.target.value);
    });

    // Abandon In-game arena logic controller
    document.getElementById("btn-abort-quiz").addEventListener("click", () => {
        AudioEngine.play("click");
        clearInterval(state.activeQuiz.timerId);
        document.body.classList.remove("quiz-active");
        exitFullscreenMode();
        renderCategoryGrid(
            document.getElementById("category-search").value,
            document.getElementById("difficulty-select").value
        );
        setActiveHomeTab("play-panel");
        switchViewSection("home-screen");
    });

    // Report Card Navigation Action Controls Matrix
 document.getElementById("btn-play-daily").addEventListener("click", () => {
    AudioEngine.play("click");
    startDailyQuiz();
});
    document.getElementById("res-btn-home").addEventListener("click", () => {
        AudioEngine.play("click");
        renderCategoryGrid(
            document.getElementById("category-search").value,
            document.getElementById("difficulty-select").value
        );
        setActiveHomeTab("play-panel");
        switchViewSection("home-screen");
    });
    document.getElementById("res-btn-retry").addEventListener("click", () => {
        AudioEngine.play("click");
        const previousQuiz = state.activeQuiz;
        if (previousQuiz.isDaily) {
            startDailyQuiz();
            return;
        }
        initQuizEngine(previousQuiz.category, previousQuiz.difficulty);
    });
    document.getElementById("res-btn-random").addEventListener("click", () => {
        AudioEngine.play("click");
        const keys = getAvailableCategoryNames("all");
        if (keys.length === 0) {
            setActiveHomeTab("play-panel");
            switchViewSection("home-screen");
            renderCategoryGrid();
            return;
        }
        const randKey = keys[Math.floor(Math.random() * keys.length)];
        initQuizEngine(randKey, "all");
    });
    document.getElementById("res-btn-next").addEventListener("click", () => {
        AudioEngine.play("click");
        const keys = getAvailableCategoryNames("all");
        if (keys.length === 0) {
            setActiveHomeTab("play-panel");
            switchViewSection("home-screen");
            renderCategoryGrid();
            return;
        }
        let currIdx = keys.indexOf(state.activeQuiz.category);
        let nextIdx = (currIdx + 1) % keys.length;
        initQuizEngine(keys[nextIdx], "all");
    });
}

function setActiveHomeTab(targetId) {
    document.querySelectorAll(".home-tab").forEach(tab => {
        const isActive = tab.dataset.tabTarget === targetId;
        tab.classList.toggle("active", isActive);
        tab.setAttribute("aria-selected", String(isActive));
    });

    document.querySelectorAll(".home-tab-panel").forEach(panel => {
        const isActive = panel.id === targetId;
        panel.classList.toggle("active", isActive);
        panel.hidden = !isActive;
    });

    if (targetId === "completed-panel") {
        renderCompletedQuestions();
    }
}

function startDailyQuiz(){

    if (getTodaysDailyChallengeResult()) {
        updateDailyChallengeCard();
        return;
    }

    const dailyQuestions = generateDailyChallenge();

    if (dailyQuestions.length < 12) {
        alert("There are not enough fresh questions left for today's challenge.");
        renderCategoryGrid(
            document.getElementById("category-search").value,
            document.getElementById("difficulty-select").value
        );
        return;
    }

    state.activeQuiz = {

        category:"Daily Challenge",
        difficulty:"Mixed",
        questions:dailyQuestions,

        currentIdx:0,
        score:0,
        streak:0,
        maxStreakThisRun:0,

        startTime:Date.now(),
        timerVal:15,
        timerId:null,
        isDaily:true,
        isFinished:false,
        answerLocked:false,
        awaitingSelfAssessment:false,
        dailySeed:getDailySeed()
    };


    document.getElementById("quiz-category-title").innerText =
        "Daily Challenge";

    document.getElementById("quiz-difficulty-title").innerText =
        "Mixed";


    document.body.classList.add("quiz-active");

    enterFullscreenMode();

    switchViewSection("quiz-screen");

    presentQuestionIndexScenario();
}
// ================= FULLSCREEN QUIZ MODE =================
function enterFullscreenMode() {
    const el = document.documentElement;
    const request = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (request) {
        try {
            const result = request.call(el);
            if (result && result.catch) result.catch(() => {}); // ignore rejection (e.g. permission/gesture issues)
        } catch (e) { /* fullscreen not available in this context; app still works windowed */ }
    }
}

function exitFullscreenMode() {
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
    if (!isFullscreen) return;
    const exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if (exit) {
        try {
            const result = exit.call(document);
            if (result && result.catch) result.catch(() => {});
        } catch (e) { /* ignore */ }
    }
}

function switchViewSection(targetId) {

    // Remove focus before hiding sections
    if (document.activeElement) {
        document.activeElement.blur();
    }


    document.querySelectorAll(".view-section").forEach(view => {

        if (view.id === targetId) {

            view.classList.remove("hidden");
            view.removeAttribute("aria-hidden");
            view.removeAttribute("inert");

        } else {

            view.classList.add("hidden");
            view.setAttribute("aria-hidden", "true");
            view.setAttribute("inert", "");

        }

    });


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

// ================= RUNTIME CORE INTERACTIVE QUIZ ENGINE =================

function getQuestionPool(categoryName) {
    if (!categoryName) {
        return [];
    }

    return QUIZ_BANKS[categoryName] || [];
}

function getTotalCategoryCount() {
    return Object.keys(CATEGORY_METADATA).length || Object.keys(QUIZ_BANKS).length;
}


function initQuizEngine(categoryName, difficultyMode = "all", isDaily = false) {
    const selectedQuestions = buildQuestionSelection(categoryName, difficultyMode);
    const requiredQuestionCount = getQuizQuestionCount(categoryName);

    if (selectedQuestions.length < requiredQuestionCount) {
        alert(`Not enough questions are available for ${categoryName}.`);
        renderCategoryGrid(
            document.getElementById("category-search").value,
            document.getElementById("difficulty-select").value
        );
        return;
    }

    state.activeQuiz = {
        category: categoryName,
        difficulty: difficultyMode,
        questions: selectedQuestions,
        currentIdx: 0,
        score: 0,
        streak: 0,
        maxStreakThisRun: 0,
        startTime: Date.now(),
        timerVal: 15,
        timerId: null,
        isDaily: isDaily,
        isFinished: false,
        answerLocked: false,
        awaitingSelfAssessment: false,
        dailySeed: null
    };

    document.getElementById("quiz-category-title").innerText = categoryName;
    document.getElementById("quiz-difficulty-title").innerText =
        difficultyMode === "all" ? "Mixed" : difficultyMode;

    document.body.classList.add("quiz-active");
    enterFullscreenMode();
    switchViewSection("quiz-screen");
    presentQuestionIndexScenario();
}

function presentQuestionIndexScenario() {
    const active = state.activeQuiz;
    clearInterval(active.timerId);

    if (active.isFinished) {
        return;
    }

    if (active.currentIdx >= active.questions.length) {
        terminateQuizPipeline();
        return;
    }

    // Refresh Score Indicators
    document.getElementById("quiz-live-score").innerText = `Score: ${active.score * 100}`;
    document.getElementById("quiz-question-counter").innerText = `Question ${active.currentIdx + 1} of ${active.questions.length}`;
    
    // Progression Fill Vector update
    const percentWidth = ((active.currentIdx + 1) / active.questions.length) * 100;
    document.getElementById("quiz-progress-fill").style.width = `${percentWidth}%`;

    const dataObj = active.questions[active.currentIdx];
    document.getElementById("question-text-content").innerText = dataObj.q;
    active.answerLocked = false;
    active.awaitingSelfAssessment = false;

    const answersGrid = document.getElementById("quiz-answers-stack");
    answersGrid.innerHTML = "";
    answersGrid.classList.toggle("text-answer-mode", dataObj.mode === "text");

    if (dataObj.mode === "text") {
        renderTextAnswerPrompt(dataObj, answersGrid);
    } else {
        // Shuffle and inject answer options while preserving their original indexes.
        let selectionOptions = dataObj.a.map((ansText, originalIndex) => ({ text: ansText, id: originalIndex }));
        for (let i = selectionOptions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [selectionOptions[i], selectionOptions[j]] = [selectionOptions[j], selectionOptions[i]];
        }

        selectionOptions.forEach(opt => {
            const btn = document.createElement("button");
            btn.className = "answer-option-btn";
            btn.innerText = opt.text;
            btn.dataset.optId = opt.id;
            btn.addEventListener("click", () => evaluateUserSelection(opt.id, btn));
            answersGrid.appendChild(btn);
        });
    }

    // Reset countdown timer clock layout variables
    if (document.getElementById("toggle-timer").checked) {
        document.getElementById("quiz-timer-container").style.display = "block";
        active.timerVal = 15;
        executeTimerTickCycle();
        active.timerId = setInterval(executeTimerTickCycle, 1000);
    } else {
        document.getElementById("quiz-timer-container").style.display = "none";
    }
}

function renderTextAnswerPrompt(question, answersGrid) {
    const form = document.createElement("form");
    form.className = "text-answer-panel";

    const label = document.createElement("label");
    label.setAttribute("for", "text-answer-input");
    label.innerText = "Type your answer";

    const controls = document.createElement("div");
    controls.className = "text-answer-controls";

    const input = document.createElement("input");
    input.id = "text-answer-input";
    input.className = "text-answer-input";
    input.type = "text";
    input.autocomplete = "off";
    input.maxLength = 100;
    input.placeholder = "Your answer…";

    const submitButton = document.createElement("button");
    submitButton.className = "btn btn-primary text-answer-submit";
    submitButton.type = "submit";
    submitButton.innerText = "Check answer";

    const feedback = document.createElement("div");
    feedback.className = "text-answer-feedback";
    feedback.setAttribute("aria-live", "polite");
    feedback.hidden = true;

    input.addEventListener("input", () => input.setCustomValidity(""));
    form.addEventListener("submit", event => {
        event.preventDefault();
        evaluateTextAnswer(question, input, submitButton, form, feedback);
    });

    controls.append(input, submitButton);
    form.append(label, controls, feedback);
    answersGrid.appendChild(form);
    requestAnimationFrame(() => input.focus());
}

function evaluateTextAnswer(question, input, submitButton, panel, feedback) {
    const active = state.activeQuiz;
    if (active.isFinished || active.answerLocked) return;

    const value = input.value.trim();
    if (!value) {
        input.setCustomValidity("Enter an answer first.");
        input.reportValidity();
        return;
    }

    clearInterval(active.timerId);
    active.answerLocked = true;
    input.disabled = true;
    submitButton.disabled = true;

    if (isAcceptedTextAnswer(value, question.accepted)) {
        feedback.hidden = false;
        feedback.innerText = "That counts!";
        completeQuestionAnswer(true, panel);
        return;
    }

    active.awaitingSelfAssessment = true;
    feedback.hidden = false;
    feedback.innerHTML = "";

    const message = document.createElement("p");
    message.innerText = `The expected answer is “${question.answer}”. Did you mean the same thing?`;

    const actions = document.createElement("div");
    actions.className = "self-assessment-actions";

    const countButton = document.createElement("button");
    countButton.type = "button";
    countButton.className = "btn btn-primary";
    countButton.innerText = "Yes, count it";
    countButton.addEventListener("click", () => resolveTextSelfAssessment(true, panel));

    const incorrectButton = document.createElement("button");
    incorrectButton.type = "button";
    incorrectButton.className = "btn btn-secondary";
    incorrectButton.innerText = "Not quite";
    incorrectButton.addEventListener("click", () => resolveTextSelfAssessment(false, panel));

    actions.append(countButton, incorrectButton);
    feedback.append(message, actions);
    countButton.focus();
}

function resolveTextSelfAssessment(isCorrect, panel) {
    const active = state.activeQuiz;
    if (!active.awaitingSelfAssessment || active.isFinished) return;
    active.awaitingSelfAssessment = false;
    panel.querySelectorAll("button").forEach(button => button.disabled = true);
    completeQuestionAnswer(isCorrect, panel);
}

function handleTextAnswerTimeout(question) {
    const active = state.activeQuiz;
    if (active.answerLocked || active.isFinished) return;
    active.answerLocked = true;

    const panel = document.querySelector(".text-answer-panel");
    if (panel) {
        panel.querySelectorAll("input, button").forEach(control => control.disabled = true);
        const feedback = panel.querySelector(".text-answer-feedback");
        feedback.hidden = false;
        feedback.innerText = `Time’s up. The answer is “${question.answer}”.`;
    }
    completeQuestionAnswer(false, panel);
}

function executeTimerTickCycle() {
    const active = state.activeQuiz;
    document.getElementById("quiz-timer-text").innerText = active.timerVal;
    
    // Circular structural path perimeter dashboard update calculation
    const pathFillPercent = (active.timerVal / 15) * 100;
    document.getElementById("timer-progress-path").setAttribute("stroke-dasharray", `${pathFillPercent}, 100`);

    if (active.timerVal <= 0) {
        clearInterval(active.timerId);
        const question = active.questions[active.currentIdx];
        if (question.mode === "text") {
            handleTextAnswerTimeout(question);
        } else {
            evaluateUserSelection(-1, null);
        }
    }
    active.timerVal--;
}

function evaluateUserSelection(selectedId, selectedButtonNode) {
    const active = state.activeQuiz;
    clearInterval(active.timerId);

    if (active.isFinished || active.answerLocked || active.currentIdx >= active.questions.length) {
        return;
    }
    active.answerLocked = true;

    const correctId = active.questions[active.currentIdx].c;
    const buttons = document.querySelectorAll(".answer-option-btn");
    
    // Disable alternative input clicks during processing window actions
    buttons.forEach(b => b.style.pointerEvents = "none");

    const isCorrect = selectedId === correctId;
    if (!isCorrect) {
        // Highlight the correct option by its original index, not by matching
        // rendered text — text-matching breaks if two answers are identical strings.
        buttons.forEach(b => {
            if (Number(b.dataset.optId) === correctId) {
                b.classList.add("correct-pulse");
            }
        });
    }
    completeQuestionAnswer(isCorrect, selectedButtonNode);
}

function completeQuestionAnswer(isCorrect, selectedNode) {
    const active = state.activeQuiz;
    clearInterval(active.timerId);
    active.awaitingSelfAssessment = false;

    if (isCorrect) {
        AudioEngine.play("correct");
        if (selectedNode) selectedNode.classList.add("correct-pulse");
        active.score++;
        active.streak++;
        if (active.streak > active.maxStreakThisRun) active.maxStreakThisRun = active.streak;
    } else {
        AudioEngine.play("wrong");
        if (selectedNode) selectedNode.classList.add("incorrect-pulse");
        active.streak = 0;
    }

    // Brief presentation transition gap pause window before proceeding array indexing items
    setTimeout(() => {
        active.currentIdx++;
        if (active.currentIdx >= active.questions.length) {
            terminateQuizPipeline();
            return;
        }
        presentQuestionIndexScenario();
    }, 1400);
}

// ================= REPORT SUMMARY COMPILATION MANAGEMENT =================
function terminateQuizPipeline() {
    const active = state.activeQuiz;
    if (active.isFinished) {
        return;
    }
    active.isFinished = true;
    clearInterval(active.timerId);

    const durationSecs = Math.round((Date.now() - active.startTime) / 1000);
    const accuracyVal = Math.round((active.score / active.questions.length) * 100);
    const avgTimePerQ = (durationSecs / active.questions.length).toFixed(1);

    AudioEngine.play("victory");

    // Podium Medal Scoring Evaluation logic checks
    let medal = "🥉 Bronze";
    let message = "Almost there! Try again and beat your score!";
    if (active.score === active.questions.length) {
        medal = "🥇 Gold";
        message = "Outstanding! You're a QuizzyBrain Master!";
        triggerConfettiCascadeAnimation();
    } else if (active.score >= Math.ceil(active.questions.length * 0.75)) {
        medal = "🥈 Silver";
        message = "Great work! Keep practicing!";
    }

    // Display updates processing inputs
    document.getElementById("result-medal-podium").innerText = medal.split(" ")[0];
    document.getElementById("result-heading").innerText = medal.substring(2) + " Tier Awarded!";
    document.getElementById("result-feedback-text").innerText = message;
    document.getElementById("result-fraction-score").innerText = `${active.score} / ${active.questions.length}`;
    document.getElementById("result-percentage-score").innerText = `${accuracyVal}% Total Accuracy Rating`;
    
    document.getElementById("res-m-time").innerText = `${Math.floor(durationSecs / 60)}m ${durationSecs % 60}s`;
    document.getElementById("res-m-avg").innerText = `${avgTimePerQ}s`;
    document.getElementById("res-m-streak").innerText = active.maxStreakThisRun;
    document.getElementById("res-m-cat").innerText = active.category;
    const retryButton = document.getElementById("res-btn-retry");
    retryButton.hidden = active.isDaily;
    retryButton.style.display = active.isDaily ? "none" : "";

   // Mutate and sync long term lifetime historical records metrics telemetry
state.userStats.gamesPlayed++;
state.userStats.totalAnswered += active.questions.length;
state.userStats.totalCorrect += active.score;

// Perfect score tracking
if (active.score === active.questions.length) {
    state.userStats.perfectScores++;
}

if (active.maxStreakThisRun > state.userStats.maxStreak) {
    state.userStats.maxStreak = active.maxStreakThisRun;
}

if (durationSecs < state.userStats.fastestTime) {
    state.userStats.fastestTime = durationSecs;
}
    const completionScore = getCategoryCompletionScore(active.questions.length);
    if (!state.userStats.completedCats.includes(active.category) && active.score >= completionScore) {
        state.userStats.completedCats.push(active.category);
    }

    // Tracks favorite category preferences
    state.userStats.catCounts[active.category] = (state.userStats.catCounts[active.category] || 0) + 1;
    let maxCount = 0, fav = "N/A";
    Object.keys(state.userStats.catCounts).forEach(c => {
        if (state.userStats.catCounts[c] > maxCount) { maxCount = state.userStats.catCounts[c]; fav = c; }
    });
    state.userStats.favCategory = fav;

    // Evaluate potential newly met achievements benchmarks targets criteria
    ACHIEVEMENTS_REGISTRY.forEach(ach => {
        if (!state.userStats.unlockedAchievements.includes(ach.id) && ach.condition(state.userStats)) {
            state.userStats.unlockedAchievements.push(ach.id);
        }
    });

    if (active.isDaily) {
        state.userStats.dailyChallengeResult = {
            date: active.dailySeed,
            score: active.score,
            total: active.questions.length
        };
        updateDailyChallengeCard();
    } else {
        markQuestionsAnswered(active.questions);
    }
    saveProgressToStorage();
    updateDashboardDisplays();
    renderCategoryGrid(
        document.getElementById("category-search").value,
        document.getElementById("difficulty-select").value
    );
    document.body.classList.remove("quiz-active");
    exitFullscreenMode();
    switchViewSection("results-screen");
}

// ================= AUXILIARY DESIGN EFFECT ENGINE FUNCTIONS =================
function triggerConfettiCascadeAnimation() {
    const box = document.querySelector(".confetti-holder-box");
    box.innerHTML = "";
    for (let i = 0; i < 100; i++) {
        const conf = document.createElement("div");
        conf.style.position = "absolute";
        conf.style.width = "8px";
        conf.style.height = "8px";
        conf.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
        conf.style.left = `${Math.random() * 100}%`;
        conf.style.top = `${Math.random() * 40}%`;
        conf.style.borderRadius = "50%";
        conf.style.opacity = Math.random();
        conf.style.transform = `rotate(${Math.random() * 360}deg)`;
        box.appendChild(conf);
        
        // Native programmatic drift configuration parameters fall animation paths
        let currentTop = parseFloat(conf.style.top);
        function fall() {
            currentTop += 0.8;
            conf.style.top = `${currentTop}%`;
            if (currentTop < 100) requestAnimationFrame(fall);
            else conf.remove();
        }
        requestAnimationFrame(fall);
    }
}
