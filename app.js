/**
 * QuizzyBrain Core Application Architecture Module
 */

// ================= DATA LIBRARY LOADER =================
let QUIZ_BANKS = {};
let CATEGORY_METADATA = {};

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

function loadQuestionLibrary() {
    const library = window.QUIZZYBRAIN_LIBRARY;

    if (!library || !library.questionBanks || !Array.isArray(library.categories)) {
        throw new Error("Question library failed to load. Rebuild data/question-library.js from data/questions.csv.");
    }

    QUIZ_BANKS = library.questionBanks;
    CATEGORY_METADATA = normalizeCategoryMetadata(library.categories);
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
        answeredQuestionIds: []
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
        isFinished: false
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
document.addEventListener("DOMContentLoaded", () => {
    const steps = [
        loadProgressFromStorage,
        renderParticleBackground,
        loadQuestionLibrary,
        renderCategoryGrid,
        setupCoreEventListeners,
        updateDashboardDisplays,
        initDailyChallengeEngine
    ];
    steps.forEach(step => {
        try { step(); } catch (e) { console.error(`QuizzyBrain startup step "${step.name}" failed:`, e); }
    });
});

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

function buildQuestionSelection(categoryName, difficultyMode = "all") {
    const freshQuestions = getUnansweredQuestionPool(categoryName);

    if (difficultyMode === "all") {
        return shuffleQuestions(freshQuestions).slice(0, 12);
    }

    const preferred = freshQuestions.filter(question => question.d === difficultyMode);
    const fillers = freshQuestions.filter(question => question.d !== difficultyMode);
    return [
        ...shuffleQuestions(preferred),
        ...shuffleQuestions(fillers)
    ].slice(0, 12);
}

function getAvailableCategoryNames(difficultyMode = "all") {
    return Object.keys(QUIZ_BANKS).filter(categoryName => {
        return buildQuestionSelection(categoryName, difficultyMode).length >= 12;
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
    
    Object.keys(QUIZ_BANKS).forEach(catName => {
        const meta = CATEGORY_METADATA[catName];

        if (!meta) return;
        
        // Search Filter Execution
        if (filterTerm && !catName.toLowerCase().includes(filterTerm.toLowerCase()) && !meta.desc.toLowerCase().includes(filterTerm.toLowerCase())) {
            return;
        }

        const questionsGroup = buildQuestionSelection(catName, diffFilter);
        const freshCount = getUnansweredQuestionPool(catName).length;
        
        // Hide categories that cannot offer a full fresh quiz.
        if (questionsGroup.length < 12) return;

        const card = document.createElement("div");
        card.className = "glass-panel category-card";
        card.setAttribute("tabindex", "0");
        card.setAttribute("role", "button");
        card.setAttribute("aria-label", `Play ${catName} Category. 12 questions. Duration ${meta.time}`);

        card.innerHTML = `
            <div class="cat-icon-frame">${meta.icon}</div>
            <h3>${catName}</h3>
            <p>${meta.desc}</p>
            <div class="cat-meta-footer">
                <span>📋 ${freshCount} fresh Qs</span>
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
        targetGrid.innerHTML = `<p class="grid-empty-state-text">No categories have 12 fresh questions for this filter.</p>`;
    }
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
    const categoryNames = Object.keys(QUIZ_BANKS);
    const selected = [];
    const selectedIds = new Set();

    seededQuestionSort(seed, categoryNames.map(name => ({ id: name, q: name }))).forEach(categoryRef => {
        const categoryQuestions = seededQuestionSort(seed, getUnansweredQuestionPool(categoryRef.id));
        if (categoryQuestions.length === 0 || selected.length >= 12) return;
        selected.push(categoryQuestions[0]);
        selectedIds.add(categoryQuestions[0].id);
    });

    const remainingQuestions = [];
    categoryNames.forEach(categoryName => {
        getUnansweredQuestionPool(categoryName).forEach(question => {
            if (!selectedIds.has(question.id)) remainingQuestions.push(question);
        });
    });

    seededQuestionSort(seed, remainingQuestions).forEach(question => {
        if (selected.length >= 12) return;
        selected.push(question);
    });

    return selected.slice(0, 12);
}
// ================= DAILY CHALLENGE CONFIG MODULES =================
function initDailyChallengeEngine() {
    function refreshCountdown() {
        const now = new Date();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const diff = tomorrow - now;
        
        const hrs = String(Math.floor((diff / (1000 * 60 * 60)) % 24)).padStart(2, '0');
        const mins = String(Math.floor((diff / (1000 * 60)) % 60)).padStart(2, '0');
        const secs = String(Math.floor((diff / 1000) % 60)).padStart(2, '0');
        
        document.getElementById("daily-countdown").innerText = `${hrs}:${mins}:${secs}`;
    }
    setInterval(refreshCountdown, 1000);
    refreshCountdown();

    const todayStr = new Date().toDateString();
    document.getElementById("daily-status-text").innerText = `Ready for challenge puzzle of ${todayStr}!`;
}

// ================= EVENT LISTENER HUBS =================
function setupCoreEventListeners() {
    // Top Hero Scroller
    document.getElementById("btn-start-exploring").addEventListener("click", () => {
        AudioEngine.play("click");
        document.getElementById("category-search").scrollIntoView({ behavior: 'smooth' });
        document.getElementById("category-search").focus();
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
            switchViewSection("home-screen");
            renderCategoryGrid();
            return;
        }
        let currIdx = keys.indexOf(state.activeQuiz.category);
        let nextIdx = (currIdx + 1) % keys.length;
        initQuizEngine(keys[nextIdx], "all");
    });
}
function startDailyQuiz(){

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
        isFinished:false
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

    if (selectedQuestions.length < 12) {
        alert(`Not enough fresh questions are available for ${categoryName}.`);
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
        isFinished: false
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

    // Shuffle and inject answer options configuration array mapping index maps
    const answersGrid = document.getElementById("quiz-answers-stack");
    answersGrid.innerHTML = "";

    // Array construction map tracking original index placements
    let selectionOptions = dataObj.a.map((ansText, originalIndex) => ({ text: ansText, id: originalIndex }));
    
    // Shuffle Selection options array placement order
    for (let i = selectionOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [selectionOptions[i], selectionOptions[j]] = [selectionOptions[j], selectionOptions[i]];
    }

    selectionOptions.forEach(opt => {
        const btn = document.createElement("button");
        btn.className = "answer-option-btn";
        btn.innerText = opt.text;
        btn.dataset.optId = opt.id; // original index, used later to reliably find the correct button

        btn.addEventListener("click", () => evaluateUserSelection(opt.id, btn));
        answersGrid.appendChild(btn);
    });

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

function executeTimerTickCycle() {
    const active = state.activeQuiz;
    document.getElementById("quiz-timer-text").innerText = active.timerVal;
    
    // Circular structural path perimeter dashboard update calculation
    const pathFillPercent = (active.timerVal / 15) * 100;
    document.getElementById("timer-progress-path").setAttribute("stroke-dasharray", `${pathFillPercent}, 100`);

    if (active.timerVal <= 0) {
        clearInterval(active.timerId);
        evaluateUserSelection(-1, null); // Timeout event registered as incorrect selection parameter triggers
    }
    active.timerVal--;
}

function evaluateUserSelection(selectedId, selectedButtonNode) {
    const active = state.activeQuiz;
    clearInterval(active.timerId);

    if (active.isFinished || active.currentIdx >= active.questions.length) {
        return;
    }

    const correctId = active.questions[active.currentIdx].c;
    const buttons = document.querySelectorAll(".answer-option-btn");
    
    // Disable alternative input clicks during processing window actions
    buttons.forEach(b => b.style.pointerEvents = "none");

    if (selectedId === correctId) {
        AudioEngine.play("correct");
        if (selectedButtonNode) selectedButtonNode.classList.add("correct-pulse");
        active.score++;
        active.streak++;
        if (active.streak > active.maxStreakThisRun) active.maxStreakThisRun = active.streak;
    } else {
        AudioEngine.play("wrong");
        if (selectedButtonNode) selectedButtonNode.classList.add("incorrect-pulse");
        active.streak = 0;

        // Highlight the correct option by its original index, not by matching
        // rendered text — text-matching breaks if two answers are identical strings.
        buttons.forEach(b => {
            if (Number(b.dataset.optId) === correctId) {
                b.classList.add("correct-pulse");
            }
        });
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
    if (active.score === 12) {
        medal = "🥇 Gold";
        message = "Outstanding! You're a QuizzyBrain Master!";
        triggerConfettiCascadeAnimation();
    } else if (active.score >= 9) {
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
    if (!state.userStats.completedCats.includes(active.category) && active.score >= 6) {
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

    markQuestionsAnswered(active.questions);
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
