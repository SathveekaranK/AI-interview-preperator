export interface Question {
  id: string;
  domain: string;
  category: string;
  text: string;
}

export interface EvaluationResponse {
  score: number;
  feedback: string;
  suggestion: string;
}

export interface SessionConfig {
  domain: string;
  category: string;
}

export interface AnswerValidation {
  questionId: string;
  question: string;
  answer: string;
  evaluation: EvaluationResponse;
}
