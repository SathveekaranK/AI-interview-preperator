'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Send, CheckCircle, Home, StopCircle, RefreshCw, Timer as TimerIcon } from 'lucide-react';
import { Message, EvaluationResult } from '@/lib/types';

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
    const [seconds, setSeconds] = useState(0);

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

    // Timer effect
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (!isFinished && !isEvaluatingAll && messages.length > 1) {
            interval = setInterval(() => {
                setSeconds(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isFinished, isEvaluatingAll, messages.length]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const formatTime = (totalSeconds: number) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

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

            if (!res.ok) throw new Error("API call failed");

            const data = await res.json();

            if (data.reply) {
                setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
            } else {
                setMessages([...newMessages, { role: 'assistant', content: data.message || "I had a moment of confusion. Let's try again." }]);
            }
        } catch (e) {
            console.error(e);
            setMessages([...newMessages, { role: 'assistant', content: "I'm having a hard time hearing you clearly over the connection. Let's try to proceed to the next question." }]);
        }

        setIsTyping(false);
    };

    const handleEndInterview = async () => {
        if (messages.length <= 1) {
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
                question: "Interview Overview",
                answer: "Interview summary generation failed.",
                score: 5,
                feedback: "Evaluation took too long for a single pass. You did well overall.",
                suggestion: "Try conducting a slightly shorter interview if you keep hitting timeouts."
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
                    Finalizing Evaluation...
                </h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: '12px' }}>Analyzing your interview performance.</p>
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
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Duration: {formatTime(seconds)}</span>
                    </div>
                    <h2 style={{ fontSize: '2.5rem', marginBottom: '20px' }}>
                        Final Grade: <span style={{ color: getScoreColor(avgScore) }}>{avgScore.toFixed(1)}/10</span>
                    </h2>

                    <div style={{ textAlign: "left", marginTop: '40px' }}>
                        <h3 style={{ marginBottom: "20px" }}>Detailed Feedback:</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {finalEvaluation.map((item, idx) => (
                                <div key={idx} style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', borderLeft: `4px solid ${getScoreColor(item.score)}` }}>
                                    <p style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>Q: {item.question}</p>
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.95rem' }}>Response: {item.answer}</p>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginTop: '12px', background: 'var(--surface-primary)', padding: '12px', borderRadius: '8px' }}>
                                        <span className={`badge ${getBadgeClass(item.score)}`} style={{ flexShrink: 0 }}>{item.score}/10</span>
                                        <div>
                                            <p style={{ fontSize: '0.9rem', marginBottom: '8px' }}>{item.feedback}</p>
                                            {item.suggestion && (
                                                <p style={{ fontSize: '0.85rem', color: 'var(--color-yellow)' }}><strong>Pro Tip:</strong> {item.suggestion}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button className="btn btn-primary" style={{ marginTop: '40px', width: "100%", maxWidth: "300px" }} onClick={() => router.push('/')}>
                        <Home size={18} /> Exit Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="main-container" style={{ height: '100vh', maxHeight: '100vh', overflow: 'hidden', gap: '16px' }}>

            {/* Header Info */}
            <div className="glass-panel" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div>
                        <h3 style={{ textTransform: 'capitalize', color: 'var(--text-primary)' }}>
                            {domain.replace('_', ' ')}
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{category} Session</p>
                    </div>
                    <div style={{ height: "30px", width: "1px", background: "var(--glass-border)" }}></div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--accent-primary)", fontWeight: "600" }}>
                        <TimerIcon size={18} />
                        <span style={{ minWidth: "50px" }}>{formatTime(seconds)}</span>
                    </div>
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
                style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', padding: "20px" }}
            >
                {messages.map((item, idx) => (
                    <div key={idx} className="animate-fade-in" style={{
                        alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
                        background: item.role === 'user' ? 'var(--accent-primary)' : 'rgba(99, 102, 241, 0.1)',
                        padding: '12px 18px',
                        borderRadius: item.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                        maxWidth: '80%',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                        border: item.role === 'user' ? 'none' : '1px solid var(--glass-border)'
                    }}>
                        {item.role === 'assistant' && (
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                                <div style={{ height: "6px", width: "6px", borderRadius: "50%", background: "var(--accent-primary)" }}></div>
                                <span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Interviewer</span>
                            </div>
                        )}
                        <p style={{ whiteSpace: 'pre-wrap', fontSize: '1rem', lineHeight: '1.6' }}>{item.content}</p>
                    </div>
                ))}

                {isTyping && (
                    <div style={{ alignSelf: 'flex-start', background: 'transparent', padding: '12px 16px', maxWidth: '85%' }}>
                        <span className="loading-dots text-indigo-300">Interviewer is thinking</span>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="glass-panel" style={{ display: 'flex', gap: '12px', padding: '16px', alignItems: 'flex-end' }}>
                <textarea
                    className="input-field"
                    placeholder="Type your response... (Shift + Enter for new line)"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isTyping}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                        }
                    }}
                    style={{ resize: 'none', minHeight: '60px', maxHeight: '150px' }}
                />
                <button
                    className="btn btn-primary"
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isTyping}
                    style={{ padding: '18px' }}
                >
                    <Send size={20} />
                </button>
            </div>

        </div>
    );
}

export default function InterviewPage() {
    return (
        <Suspense fallback={<div className="main-container loading-dots">Initializing Simulation...</div>}>
            <InterviewContent />
        </Suspense>
    );
}
