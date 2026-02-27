export const domains = [
    { id: 'aiml', name: 'AI/ML' },
    { id: 'web_developer', name: 'Web Developer' },
    { id: 'frontend', name: 'Frontend Developer' },
    { id: 'backend', name: 'Backend Developer' },
];

export const categories = [
    { id: 'technical', name: 'Technical' },
    { id: 'hr', name: 'HR & Culture Fit' },
    { id: 'behavioral', name: 'Behavioral' },
    { id: 'situational', name: 'Situational' },
];

export const mockQuestions = [
    // AI/ML
    { id: 'aiml_t_1', domain: 'aiml', category: 'technical', text: 'Explain the difference between supervised and unsupervised learning.' },
    { id: 'aiml_t_2', domain: 'aiml', category: 'technical', text: 'How do you handle overfitting in a deep learning model?' },
    { id: 'aiml_h_1', domain: 'aiml', category: 'hr', text: 'Why did you choose to specialize in AI/ML?' },
    { id: 'aiml_b_1', domain: 'aiml', category: 'behavioral', text: 'Tell me about a time your model underperformed in production.' },
    { id: 'aiml_s_1', domain: 'aiml', category: 'situational', text: 'If you have a highly imbalanced dataset, how would you approach building a classifier?' },

    // Web Developer
    { id: 'web_t_1', domain: 'web_developer', category: 'technical', text: 'Explain the difference between SQL and NoSQL databases.' },
    { id: 'web_t_2', domain: 'web_developer', category: 'technical', text: 'What are the core principles of RESTful APIs?' },

    // Frontend
    { id: 'fe_t_1', domain: 'frontend', category: 'technical', text: 'How does the Virtual DOM work in React?' },
    { id: 'fe_s_1', domain: 'frontend', category: 'situational', text: 'A user reports that your web app is completely unresponsive. What steps do you take to debug?' },

    // Backend
    { id: 'be_t_1', domain: 'backend', category: 'technical', text: 'How do you ensure a distributed system handles high concurrency?' },
    { id: 'be_b_1', domain: 'backend', category: 'behavioral', text: 'Tell me about a time you optimized a slow and complex database query. What was your approach?' }
];

export function getQuestions(domain: string, category: string, count: number = 3) {
    const filtered = mockQuestions.filter(q => q.domain === domain && q.category === category);
    // Shuffle array
    const shuffled = filtered.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}
