const express = require("express");
const cors = require("cors");
require("dotenv").config();

const OpenAI = require("openai");

const app = express();

app.use(cors());
app.use(express.json());

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});


app.post("/question", async (req,res)=>{

    try {

        const response =
        await client.chat.completions.create({

            model:"gpt-5-mini",

            messages:[
                {
                    role:"user",
                    content:
                    `Create one ${req.body.category} quiz question.

                    Return JSON:
                    {
                    "q":"",
                    "a":["","","",""],
                    "c":0,
                    "d":"Easy"
                    }`
                }
            ]

        });


        res.json(
            JSON.parse(
                response.choices[0].message.content
            )
        );


    } catch(error){

        res.status(500).json({
            error:"Generation failed"
        });

    }

});
    

app.listen(3000,()=>{
    console.log(
    "QuizzyBrain generator running"
    );
});
