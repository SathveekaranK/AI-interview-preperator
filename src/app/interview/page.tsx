'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Send, CheckCircle, Home, StopCircle, RefreshCw } from 'lucide-react';

type Message = {
    role: 'user' | 'assistant';
    content: string;
};

type EvaluationResult = {
    question: string;
    answer: string;
    score: number;
    feedback: string;
    suggestion: string;
};

function InterviewContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const domain = searchParams.get('domain') || 'aiml';
    const category = searchParams.get('category') || 'technical';

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');

    const [isTyping, setIsTyping] = useState(false);
    const [isEvaluatingAll, setIsEvaluatingAll] = useState(false);
    const [isFinished, setIsFinished] = useState(false);

    const [finalEvaluation, setFinalEvaluation] = useState<EvaluationResult[]>([]);

    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial greeting from AI Chatbot
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([
                {
                    role: 'assistant',
                    content: `Hello! I will be acting as your ${domain.replace('_', ' ')} Interviewer today. We'll be focusing specifically on ${category} scenarios. 

Are you ready to begin? If so, just say "Yes" or type any introductory thoughts.`
                }
            ]);
        }
    }, [domain, category, messages.length]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSendMessage = async () => {
        if (!input.trim() || isTyping) return;

        const userMsg: Message = { role: 'user', content: input };
        const newMessages = [...messages, userMsg];

        setMessages(newMessages);
        setInput('');
        setIsTyping(true);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: newMessages, domain, category })
            });
            const data = await res.json();

            if (data.reply) {
                setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
            }
        } catch (e) {
            console.error(e);
            setMessages([...newMessages, { role: 'assistant', content: "I'm having a hard time hearing you clearly over the connection. Could you summarize your answer again?" }]);
        }

        setIsTyping(false);
    };

    const handleEndInterview = async () => {
        if (messages.length <= 1) {
            // Just greeting, no chat
            router.push('/');
            return;
        }

        setIsEvaluatingAll(true);

        try {
            const res = await fetch('/api/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages, domain })
            });

            if (!res.ok) {
                throw new Error("Evaluation API returned error");
            }

            const evaluationData = await res.json();
            setFinalEvaluation(evaluationData);

        } catch (e) {
            console.error(e);
            setFinalEvaluation([{
                question: "Interview Process",
                answer: "The user ended the chat before complete evaluation could be processed.",
                score: 5,
                feedback: "Failed to evaluate the chat history due to an API timeout. This is common when the conversation is too long for the free tier model.",
                suggestion: "Try conducting a shorter mock interview next time."
            }]);
        }

        setIsEvaluatingAll(false);
        setIsFinished(true);
    };

    const getScoreColor = (score: number) => {
        if (score >= 8) return 'var(--color-green)';
        if (score >= 5) return 'var(--color-yellow)';
        return 'var(--color-red)';
    };

    const getBadgeClass = (score: number) => {
        if (score >= 8) return 'badge-green';
        if (score >= 5) return 'badge-yellow';
        return 'badge-red';
    };

    if (isEvaluatingAll) {
        return (
            <div className="main-container" style={{ justifyContent: 'center', alignItems: 'center', height: '100vh', textAlign: 'center' }}>
                <RefreshCw className="animate-pulse" size={64} style={{ color: 'var(--accent-primary)', margin: '0 auto' }} />
                <h2 className="loading-dots animate-fade-in text-indigo-300 mt-6" style={{ fontSize: '1.5rem' }}>
                    AI is analyzing your entire conversation...
                </h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: '12px' }}>This may take 10-20 seconds.</p>
            </div>
        );
    }

    if (isFinished) {
        const validScores = finalEvaluation.filter(e => typeof e.score === 'number');
        const avgScore = validScores.length > 0
            ? validScores.reduce((acc, curr) => acc + curr.score, 0) / validScores.length
            : 0;

        return (
            <div className="main-container animate-fade-in">
                <div className="glass-panel text-center">
                    <CheckCircle size={64} style={{ color: getScoreColor(avgScore), margin: '0 auto 20px' }} />
                    <h1 className="app-title">Session Complete!</h1>
                    <h2 style={{ fontSize: '2rem', marginBottom: '20px' }}>
                        Average Quality: <span style={{ color: getScoreColor(avgScore) }}>{avgScore.toFixed(1)}/10</span>
                    </h2>

                    <div style={{ textAlign: "left", marginTop: '40px' }}>
                        <h3 style={{ marginBottom: "20px" }}>Chat Breakdown & Evaluation:</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {finalEvaluation.map((item, idx) => (
                                <div key={idx} style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', borderLeft: `4px solid ${getScoreColor(item.score)}` }}>
                                    <p style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>Q: {item.question}</p>
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.95rem' }}>Your Answer: {item.answer}</p>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: '12px', background: 'var(--surface-primary)', padding: '12px', borderRadius: '8px' }}>
                                        <span className={`badge ${getBadgeClass(item.score)}`} style={{ flexShrink: 0 }}>{item.score}/10</span>
                                        <div>
                                            <p style={{ fontSize: '0.9rem', marginBottom: '8px' }}>{item.feedback}</p>
                                            {item.suggestion && (
                                                <p style={{ fontSize: '0.85rem', color: 'var(--color-yellow)' }}><strong>Suggestion:</strong> {item.suggestion}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button className="btn btn-primary" style={{ marginTop: '40px' }} onClick={() => router.push('/')}>
                        <Home size={18} /> Return Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="main-container" style={{ height: '100vh', maxHeight: '100vh', overflow: 'hidden' }}>

            {/* Header Info */}
            <div className="glass-panel" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3 style={{ textTransform: 'capitalize', color: 'var(--text-primary)' }}>
                        {domain.replace('_', ' ')} Interview
                    </h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Live Chat Session</p>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn btn-secondary" style={{ padding: '8px 16px', borderColor: 'var(--color-red)', color: 'var(--color-red)' }} onClick={() => handleEndInterview()}>
                        <StopCircle size={16} /> End & Evaluate
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '8px 16px' }} onClick={() => router.push('/')}>
                        Exit
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div
                ref={scrollRef}
                className="glass-panel"
                style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}
            >
                {messages.map((item, idx) => (
                    <div key={idx} style={{
                        alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
                        background: item.role === 'user' ? 'var(--accent-primary)' : 'rgba(99, 102, 241, 0.1)',
                        padding: '12px 16px',
                        borderRadius: item.role === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0',
                        maxWidth: '85%'
                    }}>
                        {item.role === 'assistant' && <p style={{ fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '4px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Interviewer</p>}
                        <p style={{ whiteSpace: 'pre-wrap' }}>{item.content}</p>
                    </div>
                ))}

                {isTyping && (
                    <div style={{ alignSelf: 'flex-start', background: 'transparent', padding: '12px 16px', maxWidth: '85%' }}>
                        <span className="loading-dots text-indigo-300">Interviewer is typing</span>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="glass-panel" style={{ display: 'flex', gap: '12px', padding: '16px' }}>
                <textarea
                    className="input-field"
                    placeholder="Type your answer here..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isTyping}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                        }
                    }}
                    style={{ resize: 'none', minHeight: '80px' }}
                />
                <button
                    className="btn btn-primary"
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isTyping}
                    style={{ alignSelf: 'flex-end', padding: '16px' }}
                >
                    <Send size={20} />
                </button>
            </div>

        </div>
    );
}

export default function InterviewPage() {
    return (
        <Suspense fallback={<div className="main-container loading-dots">Loading Interview Chat...</div>}>
            <InterviewContent />
        </Suspense>
    );
}
