import { NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { question, answer } = body;

        if (!question || !answer) {
            return NextResponse.json({ error: 'Missing question or answer' }, { status: 400 });
        }

        if (!OPENROUTER_API_KEY) {
            return NextResponse.json({ error: 'Server misconfiguration: API key missing' }, { status: 500 });
        }

        const payload = {
            model: 'google/gemini-2.0-flash-lite-preview-02-05:free',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert Technical and HR Interviewer. Your goal is to evaluate candidate answers objectively. You MUST respond with ONLY a raw JSON object without markdown formatting, using this exact schema: {"score": 7, "feedback": "Your short feedback here", "suggestion": "A suggestion to improve"}. Provide a score from 1 to 10 based on completeness, clarity, and relevance.'
                },
                {
                    role: 'user',
                    content: `Question: ${question}\nCandidate Answer: ${answer}`
                }
            ]
        };

        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 12000); // 12 second timeout

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
                throw new Error(`OpenRouter API responded with status ${response.status}`);
            }

            const data = await response.json();

            let evaluationArgs = null;
            if (data.choices && data.choices[0]?.message?.content) {
                let textContent = data.choices[0].message.content.trim();

                // Remove potential markdown code blocks
                if (textContent.startsWith('```json')) {
                    textContent = textContent.replace(/^```json/, '').replace(/```$/, '').trim();
                } else if (textContent.startsWith('```')) {
                    textContent = textContent.replace(/^```/, '').replace(/```$/, '').trim();
                }

                try {
                    evaluationArgs = JSON.parse(textContent);
                } catch (e) {
                    console.error("Failed to parse content as JSON", e, "Raw text:", textContent);
                }
            }

            if (evaluationArgs && evaluationArgs.score !== undefined) {
                return NextResponse.json({
                    score: evaluationArgs.score,
                    feedback: evaluationArgs.feedback || "Good effort.",
                    suggestion: evaluationArgs.suggestion || "Keep practicing."
                });
            } else {
                throw new Error('Could not extract valid evaluation from AI response.');
            }

        } catch (error: any) {
            console.error("Fetch Execution Error:", error);
            if (error.name === 'AbortError') {
                return NextResponse.json({
                    score: 5,
                    feedback: "The AI evaluator timed out. Let's proceed to the next question.",
                    suggestion: "Consider keeping answers more concise."
                });
            }
            throw error;
        }

    } catch (error: any) {
        console.error("Evaluation Error:", error);
        return NextResponse.json({
            score: 5,
            feedback: "Failed to evaluate answer due to a technical error. Keep going!",
            suggestion: "Make sure you structure your answers using the STAR format."
        });
    }
}
