import { NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { messages, domain } = body;

        if (!messages) {
            return NextResponse.json({ error: 'Missing messages' }, { status: 400 });
        }

        if (!OPENROUTER_API_KEY) {
            return NextResponse.json({ error: 'Server misconfiguration: API key missing' }, { status: 500 });
        }

        // We only want the user and assistant turns for the evaluation context
        const transcript = messages.map((m: any) => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.content}`).join('\n');

        const payload = {
            model: 'openai/gpt-oss-120b:free', // Use deep reasoning or reliable JSON model
            messages: [
                {
                    role: 'system',
                    content: `You are an expert ${domain} Interview Evaluator. You just finished a mock interview with a candidate.
Below is the full transcript of your conversation. 
You MUST evaluate the candidate's performance across the entire interview.
You MUST respond with ONLY a raw JSON array of objects without markdown formatting.

Format schema expected:
[
  {
     "question": "The specific question the interviewer asked.",
     "answer": "The candidate's core answer.",
     "score": 8, // out of 10
     "feedback": "Short feedback on this specific answer",
     "suggestion": "How to handle this question better next time"
  }
]
Extract EVERY distinct technical or behavioral question asked by the interviewer, summarize the candidate's response, and provide the scoring.`
                },
                {
                    role: 'user',
                    content: `Here is the interview transcript:\n\n${transcript}`
                }
            ]
        };

        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 30000); // 30 second timeout for heavy summary

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
                throw new Error(`OpenRouter API responded with status ${response.status}`);
            }

            const data = await response.json();

            let evaluationArray = [];
            if (data.choices && data.choices[0]?.message?.content) {
                let textContent = data.choices[0].message.content.trim();

                // Remove potential markdown code blocks
                if (textContent.startsWith('```json')) {
                    textContent = textContent.replace(/^```json/, '').replace(/```$/, '').trim();
                } else if (textContent.startsWith('```')) {
                    textContent = textContent.replace(/^```/, '').replace(/```$/, '').trim();
                }

                try {
                    evaluationArray = JSON.parse(textContent);
                } catch (e) {
                    console.error("Failed to parse content as JSON array", e, "Raw text:", textContent);
                }
            }

            if (Array.isArray(evaluationArray) && evaluationArray.length > 0) {
                return NextResponse.json(evaluationArray);
            } else {
                throw new Error('Could not extract valid evaluation array from AI response.');
            }

        } catch (error: any) {
            console.error("Fetch Execution Error:", error);
            throw error;
        }

    } catch (error: any) {
        console.error("Evaluation Error:", error);
        return NextResponse.json({ error: "Failed to evaluate" }, { status: 500 });
    }
}
