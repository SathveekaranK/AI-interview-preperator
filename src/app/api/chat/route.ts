import { NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        // Extract history for conversational context and the domain context
        const { messages, domain, category } = body;

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Missing chat messages' }, { status: 400 });
        }

        if (!OPENROUTER_API_KEY) {
            return NextResponse.json({ error: 'Server misconfiguration: API key missing' }, { status: 500 });
        }

        const payload = {
            model: 'openai/gpt-oss-120b:free',
            messages: [
                {
                    role: 'system',
                    content: `You are an expert ${domain} Technical and HR Interviewer. You are conducting an interactive mock interview. 
The current focus is: ${category} questions.

Instructions:
1. Act naturally as a conversational interviewer. 
2. Ask ONE question at a time. Wait for the user to answer.
3. If the user answers, briefly acknowledge it (e.g., "Good point", "I see"), then ask your NEXT question.
4. If their answer is too short or vague, you can ask a follow-up probing question.
5. Do NOT provide an overall score or evaluation right now. Just keep the interview conversation going. Keep your responses concise.`
                },
                ...messages
            ]
        };

        console.log("Sending payload to OpenRouter:", JSON.stringify(payload));

        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 15000); // 15 second timeout

        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "HTTP-Referer": "http://localhost:3000",
                    "X-Title": "AI Interview App",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload),
                signal: abortController.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.text();
                console.error("OpenRouter API Failed:", response.status, errorData);
                throw new Error(`OpenRouter API responded with status ${response.status}: ${errorData}`);
            }

            const data = await response.json();
            console.log("OpenRouter Response Data:", JSON.stringify(data));

            if (data.choices && data.choices[0]?.message?.content) {
                return NextResponse.json({
                    reply: data.choices[0].message.content
                });
            } else {
                console.error("Invalid OpenRouter Response:", data);
                throw new Error('Could not extract valid response from AI.');
            }

        } catch (error: any) {
            console.error("Fetch Execution Error:", error);
            if (error.name === 'AbortError') {
                return NextResponse.json({
                    reply: "The interviewer is taking a bit too long to respond. Could you repeat that or let me try to reboot our connection?"
                });
            }
            throw error;
        }

    } catch (error: any) {
        console.error("Full Chat Route Error:", error);
        return NextResponse.json({
            reply: `Internal Interviewer Error: ${error.message || "Unknown error occurred"}`
        });
    }
}
