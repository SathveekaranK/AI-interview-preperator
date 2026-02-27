'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Question, AnswerValidation } from '@/lib/types';
import { Send, CheckCircle, AlertCircle, Home, StopCircle } from 'lucide-react';

function InterviewContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const domain = searchParams.get('domain') || 'aiml';
    const category = searchParams.get('category') || 'technical';

    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answer, setAnswer] = useState('');
    const [history, setHistory] = useState<AnswerValidation[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [isEvaluatingAll, setIsEvaluatingAll] = useState(false);
    const [isFinished, setIsFinished] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function loadQuestions() {
            try {
                const res = await fetch(`/api/questions?domain=${domain}&category=${category}`);
                const data = await res.json();
                setQuestions(data);
                setIsLoading(false);
            } catch (e) {
                console.error("Failed to fetch questions:", e);
                setIsLoading(false);
            }
        }
        loadQuestions();
    }, [domain, category]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history]);

    const handleSubmit = () => {
        if (!answer.trim()) return;

        const currentQ = questions[currentIndex];

        const newHistoryItem: AnswerValidation = {
            questionId: currentQ.id,
            question: currentQ.text,
            answer: answer,
            // Placeholder evaluation until the end
            evaluation: { score: 0, feedback: 'Pending evaluation...', suggestion: '' }
        };

        setHistory(prev => [...prev, newHistoryItem]);
        setAnswer('');

        if (currentIndex < questions.length - 1) {
            setCurrentIndex(curr => curr + 1);
        } else {
            handleEndInterview([...history, newHistoryItem]);
        }
    };

    const handleEndInterview = async (finalHistory = history) => {
        if (finalHistory.length === 0) {
            // If no questions answered, just go home
            router.push('/');
            return;
        }

        setIsEvaluatingAll(true);

        const evaluatedHistory = [...finalHistory];

        for (let i = 0; i < evaluatedHistory.length; i++) {
            const item = evaluatedHistory[i];
            try {
                const res = await fetch('/api/evaluate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ question: item.question, answer: item.answer })
                });
                const evalData = await res.json();
                evaluatedHistory[i].evaluation = evalData;
            } catch (e) {
                console.error(e);
                evaluatedHistory[i].evaluation = {
                    score: 5,
                    feedback: "Error connect to AI evaluator.",
                    suggestion: "Please try again later."
                };
            }
        }

        setHistory(evaluatedHistory);
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

    if (isLoading) {
        return (
            <div className="main-container" style={{ justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <h2 className="loading-dots animate-fade-in text-indigo-300">Preparing Interview</h2>
            </div>
        );
    }

    if (isEvaluatingAll) {
        return (
            <div className="main-container" style={{ justifyContent: 'center', alignItems: 'center', height: '100vh', textAlign: 'center' }}>
                <BrainCircuitIcon className="animate-pulse" />
                <h2 className="loading-dots animate-fade-in text-indigo-300 mt-6" style={{ fontSize: '1.5rem' }}>
                    AI is evaluating your entire interview...
                </h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: '12px' }}>Please wait a moment while we process your responses.</p>
            </div>
        );
    }

    if (isFinished) {
        const avgScore = history.reduce((acc, curr) => acc + curr.evaluation.score, 0) / (history.length || 1);

        return (
            <div className="main-container animate-fade-in">
                <div className="glass-panel text-center">
                    <CheckCircle size={64} style={{ color: getScoreColor(avgScore), margin: '0 auto 20px' }} />
                    <h1 className="app-title">Session Complete!</h1>
                    <h2 style={{ fontSize: '2rem', marginBottom: '20px' }}>
                        Average Score: <span style={{ color: getScoreColor(avgScore) }}>{avgScore.toFixed(1)}/10</span>
                    </h2>

                    <div style={{ textAlign: "left", marginTop: '40px' }}>
                        <h3 style={{ marginBottom: "20px" }}>Session Review & Feedback:</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {history.map((item, idx) => (
                                <div key={idx} style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', borderLeft: `4px solid ${getScoreColor(item.evaluation.score)}` }}>
                                    <p style={{ fontWeight: 600, marginBottom: '8px' }}>Q: {item.question}</p>
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.95rem' }}>Your Answer: {item.answer}</p>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: '12px', background: 'var(--surface-primary)', padding: '12px', borderRadius: '8px' }}>
                                        <span className={`badge ${getBadgeClass(item.evaluation.score)}`}>{item.evaluation.score}/10</span>
                                        <div>
                                            <p style={{ fontSize: '0.9rem', marginBottom: '8px' }}>{item.evaluation.feedback}</p>
                                            {item.evaluation.suggestion && (
                                                <p style={{ fontSize: '0.85rem', color: 'var(--color-yellow)' }}><strong>Suggestion:</strong> {item.evaluation.suggestion}</p>
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
                    <h3 style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                        {domain.replace('_', ' ')} • {category}
                    </h3>
                    <p>Question {currentIndex + 1} of {questions.length}</p>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn btn-secondary" style={{ padding: '8px 16px', borderColor: 'var(--color-red)', color: 'var(--color-red)' }} onClick={() => handleEndInterview()}>
                        <StopCircle size={16} /> End Mock Interview
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
                {history.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Question */}
                        <div style={{ alignSelf: 'flex-start', background: 'rgba(99, 102, 241, 0.1)', padding: '12px 16px', borderRadius: '12px 12px 12px 0', maxWidth: '85%' }}>
                            <p>{item.question}</p>
                        </div>
                        {/* Candidate Answer */}
                        <div style={{ alignSelf: 'flex-end', background: 'var(--accent-primary)', padding: '12px 16px', borderRadius: '12px 12px 0 12px', maxWidth: '85%' }}>
                            <p>{item.answer}</p>
                        </div>
                    </div>
                ))}

                <div className="animate-fade-in" style={{ alignSelf: 'flex-start', background: 'rgba(99, 102, 241, 0.1)', padding: '16px', borderRadius: '12px 12px 12px 0', maxWidth: '85%' }}>
                    <p style={{ fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '8px' }}>Current Question:</p>
                    <p style={{ fontSize: '1.1rem' }}>{questions[currentIndex]?.text}</p>
                </div>

            </div>

            {/* Input Area */}
            <div className="glass-panel" style={{ display: 'flex', gap: '12px', padding: '16px' }}>
                <textarea
                    className="input-field"
                    placeholder="Type your answer here..."
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit();
                        }
                    }}
                    style={{ resize: 'none', minHeight: '80px' }}
                />
                <button
                    className="btn btn-primary"
                    onClick={handleSubmit}
                    disabled={!answer.trim()}
                    style={{ alignSelf: 'flex-end', padding: '16px' }}
                >
                    <Send size={20} />
                </button>
            </div>

        </div>
    );
}

function BrainCircuitIcon(props: any) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent-primary)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-5.28 5.28A4 4 0 0 0 5.875 16.3a3 3 0 1 0 5.996-.125 4 4 0 0 0 5.28-5.28A4 4 0 0 0 12 5z" />
            <path d="M8.5 8.5v.01" />
            <path d="M15.5 8.5v.01" />
            <path d="M8.5 15.5v.01" />
            <path d="M15.5 15.5v.01" />
            <path d="M12 12v.01" />
        </svg>
    )
}

export default function InterviewPage() {
    return (
        <Suspense fallback={<div className="main-container loading-dots">Loading Next Module</div>}>
            <InterviewContent />
        </Suspense>
    );
}
