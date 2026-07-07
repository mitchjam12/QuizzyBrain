// ================= INFINITE QUESTION ENGINE =================

let GENERATED_QUESTIONS = JSON.parse(
    localStorage.getItem("quizzybrain_generated_questions")
) || [];


function saveGeneratedQuestions(){

    localStorage.setItem(
        "quizzybrain_generated_questions",
        JSON.stringify(GENERATED_QUESTIONS)
    );

}



// Get questions for a category

function getQuestionPool(category){

    let stored = GENERATED_QUESTIONS.filter(
        q => q.category === category
    );


    let existing = QUIZ_BANKS[category] || [];


    return [
        ...existing,
        ...stored
    ];

}



// Add new generated questions

function addGeneratedQuestions(newQuestions){

    GENERATED_QUESTIONS.push(...newQuestions);

    saveGeneratedQuestions();

}



// Create automatic questions

function createGeneratedQuestion(
    category,
    question,
    answers,
    correct,
    difficulty="Medium"
){

    return {

        id:
        "generated_" +
        Date.now() +
        Math.random(),

        category:category,

        q:question,

        a:answers,

        c:correct,

        d:difficulty

    };

}
