import { NextResponse } from 'next/server';
import { getQuestions } from '@/lib/data';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');
    const category = searchParams.get('category');

    if (!domain || !category) {
        return NextResponse.json({ error: 'Missing domain or category' }, { status: 400 });
    }

    const questions = getQuestions(domain, category, 3);

    // If no questions found in the mock data, fallback to some generic ones.
    if (questions.length === 0) {
        questions.push({
            id: `${domain}_${category}_fallback_1`,
            domain,
            category,
            text: `Tell me about your experience related to ${domain}?`
        }, {
            id: `${domain}_${category}_fallback_2`,
            domain,
            category,
            text: `How do you handle difficult challenges in ${category} situations?`
        });
    }

    return NextResponse.json(questions);
}
