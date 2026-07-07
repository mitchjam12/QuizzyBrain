export default {
async fetch(request, env) {

    const url = new URL(request.url);


    // Get random questions
    if(url.pathname === "/api/questions") {

        const category = url.searchParams.get("category");


        const result = await env.DB.prepare(
        `
        SELECT *
        FROM questions
        WHERE category = ?
        ORDER BY RANDOM()
        LIMIT 12
        `
        )
        .bind(category)
        .all();


        return Response.json(result.results);
    }



    // Daily challenge
    if(url.pathname === "/api/daily") {


        const today = new Date()
        .toISOString()
        .split("T")[0];


        const challenge =
        await env.DB.prepare(
        `
        SELECT *
        FROM daily_challenge
        WHERE date = ?
        `
        )
        .bind(today)
        .all();



        return Response.json(challenge.results);
    }



    return new Response(
        "QuizzyBrain API running"
    );

}
};
