import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { messages, domain, category } = body;

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Missing chat messages' }, { status: 400 });
        }

        if (!GEMINI_API_KEY) {
            return NextResponse.json({ error: 'Server misconfiguration: API key missing' }, { status: 500 });
        }

        const formattedMessages = [
            {
                role: "user",
                parts: [{
                    text: `You are an expert ${domain} Technical and HR Interviewer.
You are conducting an interactive mock interview.
The current focus is: ${category} questions.

Instructions:
1. Ask ONE question at a time.
2. Wait for the user answer.
3. Briefly acknowledge responses.
4. Ask probing follow-ups if needed.
5. Do NOT give final evaluation yet.
Keep responses concise.`
                }]
            },
            ...messages.map((msg: any) => ({
                role: msg.role === "assistant" ? "model" : "user",
                parts: [{ text: msg.content }]
            }))
        ];

        const payload = {
            contents: formattedMessages
        };

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API error: ${errorText}`);
        }

        const data = await response.json();

        const reply =
            data.candidates?.[0]?.content?.parts?.[0]?.text ||
            "The interviewer is thinking... Try again.";

        return NextResponse.json({ reply });

    } catch (error: any) {
        return NextResponse.json({
            reply: `Internal Interviewer Error: ${error.message || "Unknown error"}`
        });
    }
}