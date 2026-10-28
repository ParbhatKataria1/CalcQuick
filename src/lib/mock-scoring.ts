import { MARKS_CORRECT, MARKS_WRONG, type MockAttempt, type MockTest, type QuestionResponse, type QuestionStatus, type SectionScore } from '@/types/mock-test';

export const newResponses = (test: MockTest): QuestionResponse[][] =>
  test.sections.map((section) => section.questions.map(() => ({ selected: null, status: 'notVisited' as QuestionStatus, timeMs: 0 })));

/** Answered-and-marked questions count towards the score, as in the IBPS and SBI exams. */
export const isAttempted = (response: QuestionResponse) => response.selected !== null && (response.status === 'answered' || response.status === 'answeredMarked');

export function scoreAttempt(test: MockTest, responses: QuestionResponse[][]): Pick<MockAttempt, 'sectionScores' | 'score' | 'maxScore'> {
  const sectionScores: SectionScore[] = test.sections.map((section, sectionIndex) => {
    let correct = 0;
    let wrong = 0;
    let timeMs = 0;
    section.questions.forEach((question, index) => {
      const response = responses[sectionIndex]?.[index];
      if (!response) return;
      timeMs += response.timeMs;
      if (!isAttempted(response)) return;
      if (response.selected === question.answerIndex) correct++;
      else wrong++;
    });
    const total = section.questions.length;
    return { section: section.section, total, correct, wrong, skipped: total - correct - wrong, score: correct * MARKS_CORRECT + wrong * MARKS_WRONG, timeMs };
  });
  return {
    sectionScores,
    score: sectionScores.reduce((sum, item) => sum + item.score, 0),
    maxScore: sectionScores.reduce((sum, item) => sum + item.total * MARKS_CORRECT, 0),
  };
}

export function countStatuses(responses: QuestionResponse[]) {
  const counts: Record<QuestionStatus, number> = { notVisited: 0, notAnswered: 0, answered: 0, marked: 0, answeredMarked: 0 };
  for (const response of responses) counts[response.status]++;
  return counts;
}

export const formatClock = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return `${hours ? `${String(hours).padStart(2, '0')}:` : ''}${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export const formatScore = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(2));
