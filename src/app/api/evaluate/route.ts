import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { messages, domain } = body;

        if (!messages) {
            return NextResponse.json({ error: 'Missing messages' }, { status: 400 });
        }

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'Server misconfiguration: API key missing' }, { status: 500 });
        }

        const transcript = messages.map((m: any) => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.content}`).join('\n');

        const schema = {
            description: "A list of interview question evaluations",
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    question: {
                        type: SchemaType.STRING,
                        description: "The specific question the interviewer asked.",
                    },
                    answer: {
                        type: SchemaType.STRING,
                        description: "The candidate's core answer.",
                    },
                    score: {
                        type: SchemaType.NUMBER,
                        description: "Score from 1 to 10.",
                    },
                    feedback: {
                        type: SchemaType.STRING,
                        description: "Short feedback on this specific answer.",
                    },
                    suggestion: {
                        type: SchemaType.STRING,
                        description: "How to handle this question better next time.",
                    },
                },
                required: ["question", "answer", "score", "feedback", "suggestion"],
            },
        };

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });

        const prompt = `You are an expert ${domain} Interview Evaluator. You just finished a mock interview with a candidate.
Below is the full transcript of your conversation. 
You MUST evaluate the candidate's performance across the entire interview.
Extract EVERY distinct technical or behavioral question asked by the interviewer, summarize the candidate's response, and provide the scoring.

Transcript:
${transcript}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const evaluationArray = JSON.parse(response.text());

        if (Array.isArray(evaluationArray) && evaluationArray.length > 0) {
            return NextResponse.json(evaluationArray);
        } else {
            throw new Error('Could not extract valid evaluation array from AI response.');
        }

    } catch (error: any) {
        console.error("Gemini Evaluation Error:", error);
        return NextResponse.json({ error: "Failed to evaluate" }, { status: 500 });
    }
}
