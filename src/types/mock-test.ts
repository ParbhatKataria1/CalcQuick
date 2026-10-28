export type Section = 'quant' | 'reasoning' | 'english';

export const SECTIONS: Section[] = ['english', 'quant', 'reasoning'];

export const sectionLabel: Record<Section, string> = {
  quant: 'Quantitative Aptitude',
  reasoning: 'Reasoning Ability',
  english: 'English Language',
};

/** A number in a question template, sampled fresh for every test. */
export type TemplateVariable = {
  name: string;
  min: number;
  max: number;
  step: number;
};

/**
 * A numeric question with its numbers replaced by variables, e.g.
 * text "A sum of ₹{p} at {r}% p.a. simple interest for {t} years…", answerExpr "p * r * t / 100".
 */
export type QuestionTemplate = {
  text: string;
  variables: TemplateVariable[];
  answerExpr: string;
  /** Wrong options built from common mistakes, e.g. compound instead of simple interest. */
  distractorExprs: string[];
  answerFormat: 'integer' | 'decimal2';
  /** Option text around the number, e.g. "₹{value}" or "{value}%". */
  optionFormat: string;
  /** Worked solution; may use the variables and {answer}. */
  explanation: string;
};

export type StaticQuestion = {
  text: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

export type SetContent = {
  /** Shared stem: an RC passage, puzzle arrangement, DI table (markdown) or seating details. */
  passage?: string;
  questions: StaticQuestion[];
};

/**
 * One or more questions that belong together, as in the real exam: a puzzle with its five
 * questions, or an RC passage with its questions. A standalone question is a set of one.
 */
export type QuestionSet = {
  id: string;
  section: Section;
  topic: string;
  original: SetContent;
  /** Present for numeric questions whose numbers can be regenerated locally, one per question. */
  templates?: QuestionTemplate[];
  /** AI rewrites with new names, numbers or passages, used for sets that can't be templated. */
  variants: SetContent[];
  /** Variants already given in a test, so the next test prefers unseen ones. */
  usedVariants: number[];
};

export type MockSource = {
  id: string;
  name: string;
  fileName: string;
  createdAt: number;
  sets: QuestionSet[];
};

export type MockQuestion = {
  setId: string;
  section: Section;
  topic: string;
  passage?: string;
  text: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

export type MockTestSection = {
  section: Section;
  durationSeconds: number;
  questions: MockQuestion[];
};

export type MockTest = {
  id: string;
  sourceId: string;
  name: string;
  createdAt: number;
  /** Sectional: each section has its own clock and locks when it runs out. Composite: one clock for the paper. */
  timing: 'sectional' | 'composite';
  sections: MockTestSection[];
};

export type QuestionStatus = 'notVisited' | 'notAnswered' | 'answered' | 'marked' | 'answeredMarked';

export type QuestionResponse = {
  selected: number | null;
  status: QuestionStatus;
  timeMs: number;
};

export type SectionScore = {
  section: Section;
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  score: number;
  timeMs: number;
};

export type MockAttempt = {
  id: string;
  testId: string;
  sourceId: string;
  testName: string;
  startedAt: number;
  /** Set once submitted; until then the attempt is in progress and can be resumed. */
  endedAt: number | null;
  /** Indexed like the test: responses[section][question]. */
  responses: QuestionResponse[][];
  /** Seconds left per section (sectional) or for the paper (composite, one entry). */
  remainingSeconds: number[];
  currentSection: number;
  sectionScores: SectionScore[];
  score: number;
  maxScore: number;
};

export const MARKS_CORRECT = 1;
export const MARKS_WRONG = -0.25;

/** List entries kept beside the full documents, so lists never load whole papers. `bytes` is the stored size. */
export type SourceSummary = Pick<MockSource, 'id' | 'name' | 'fileName' | 'createdAt'> & { questions: Record<Section, number>; bytes: number };
export type TestSummary = Pick<MockTest, 'id' | 'sourceId' | 'name' | 'createdAt'> & { bytes: number };
export type AttemptSummary = Pick<MockAttempt, 'id' | 'testId' | 'sourceId' | 'testName' | 'startedAt' | 'endedAt' | 'score' | 'maxScore'> & { bytes: number };
