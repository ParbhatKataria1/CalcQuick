/**
 * Prompts and JSON schemas for Gemini. Reading a PDF is one call that extracts the questions and
 * writes templates for numeric Quant; rewriting the rest happens in smaller text-only calls, so a
 * long paper never runs into the output limit.
 */

const questionSchema = {
  type: 'object',
  properties: {
    text: { type: 'string', description: 'The question itself, without its number or options. Keep tables as markdown.' },
    options: { type: 'array', items: { type: 'string' }, description: 'Option texts without "(a)" labels, usually 5.' },
    explanation: { type: 'string', description: 'A short worked solution, written before choosing the answer.' },
    answerIndex: { type: 'integer', description: 'Zero-based index of the correct option.' },
  },
  required: ['text', 'options', 'explanation', 'answerIndex'],
};

const templateSchema = {
  type: 'object',
  properties: {
    text: { type: 'string', description: 'The question with each input number replaced by {name}.' },
    variables: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Lowercase identifier, e.g. p, rate, speed_a.' },
          min: { type: 'number' },
          max: { type: 'number' },
          step: { type: 'number', description: 'Keep numbers exam-like: 100 or 500 for money, 1 or 5 for rates, 0.5 only if the original used halves.' },
        },
        required: ['name', 'min', 'max', 'step'],
      },
    },
    answerExpr: { type: 'string', description: 'Formula for the answer using the variable names.' },
    distractorExprs: { type: 'array', items: { type: 'string' }, description: '4 formulas for tempting wrong answers that model real mistakes.' },
    answerFormat: { type: 'string', enum: ['integer', 'decimal2'] },
    optionFormat: { type: 'string', description: 'How an option is written, with {value} for the number, e.g. "₹{value}", "{value}%", "{value} km/h", "{value}".' },
    explanation: { type: 'string', description: 'Worked solution using {name} placeholders and {answer}.' },
  },
  required: ['text', 'variables', 'answerExpr', 'distractorExprs', 'answerFormat', 'optionFormat', 'explanation'],
};

const setContentSchema = {
  type: 'object',
  properties: {
    passage: { type: 'string', description: 'Shared stem for the set: RC passage, puzzle details, DI data as a markdown table, or common directions. Empty when there is none.' },
    questions: { type: 'array', items: questionSchema },
  },
  required: ['questions'],
};

export const extractionSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Name of the paper, e.g. "IBPS PO Prelims Mock 12".' },
    sets: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          section: { type: 'string', enum: ['quant', 'reasoning', 'english'] },
          topic: { type: 'string', description: 'e.g. Simple Interest, Data Interpretation, Seating Arrangement, Reading Comprehension, Error Spotting.' },
          passage: setContentSchema.properties.passage,
          questions: { type: 'array', items: questionSchema },
          templates: { type: 'array', items: templateSchema, description: 'Only for numeric Quant sets: one template per question, in the same order. Omit otherwise.' },
        },
        required: ['section', 'topic', 'questions'],
      },
    },
  },
  required: ['title', 'sets'],
};

export const variantsSchema = {
  type: 'object',
  properties: {
    sets: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The id of the input set.' },
          variants: { type: 'array', items: setContentSchema },
        },
        required: ['id', 'variants'],
      },
    },
  },
  required: ['sets'],
};

export const EXTRACTION_PROMPT = `You are preparing a bank exam (IBPS / SBI PO & Clerk) mock test from the attached PDF.

Extract EVERY question in the PDF, in order.
- Classify each into section "quant" (Quantitative Aptitude / Numerical Ability), "reasoning" (Reasoning Ability) or "english" (English Language).
- Group questions that share a passage, puzzle, seating arrangement, DI chart or common directions into ONE set, with the shared part in "passage". Every other question is a set of one.
- Copy question text and options faithfully. Write DI tables and charts as markdown tables with the values read from the chart.
- If the PDF has an answer key or solutions, use them. Otherwise solve the question yourself, carefully. Always write the explanation before deciding answerIndex.

For Quant sets where every answer is a number computed from numbers in the question (arithmetic, percentages, SI/CI, profit & loss, ratio, averages, ages, time & work, speed & distance, mensuration, probability, etc.) ALSO write "templates", one per question in order:
- Replace each input number in the text with a {variable}. Choose ranges around the original values so new versions feel the same; the original values must lie inside the ranges.
- answerExpr computes the answer from the variables. Allowed: numbers, variable names, + - * / ^ %, parentheses, and the functions sqrt, cbrt, abs, round, floor, ceil, min, max, pow, ncr, npr, fact. Nothing else.
- distractorExprs: 4 formulas giving tempting wrong answers that model real mistakes (wrong base for a percentage, simple instead of compound interest, adding instead of subtracting, off by one year, and so on).
- answerFormat "integer" when the original answer is whole, else "decimal2". Prefer ranges and steps that make the answer come out whole.
- Do NOT write templates for DI sets, number series, quadratic-equation comparisons, approximation/simplification with many numbers, data sufficiency, or any question whose answer isn't a single number. Those are rewritten later.

Return JSON only, matching the schema.`;

export const VARIANTS_PROMPT = (count: number) => `You write fresh practice versions of bank exam (IBPS / SBI PO & Clerk) questions.

For EACH input set, write ${count} new versions of the whole set ("variants"). Each version must:
- Test exactly the same concept, question type, number of questions and difficulty as the original.
- Change the surface completely: new names, numbers, words, arrangements and options. Reasoning puzzles and seating arrangements need a new, fully consistent arrangement; syllogisms need new terms; coding-decoding needs a new code; RC and cloze need a new passage of similar length and tone; error spotting and fillers need new sentences; DI needs new data.
- Have exactly ONE correct option per question and the same number of options as the original (usually 5). Solve each new question yourself and write the explanation before choosing answerIndex. Double-check puzzles against every clue.
- Keep the shared stem in "passage" (empty if the original has none).

Return JSON only, matching the schema, with each set's "id" copied from the input.`;
