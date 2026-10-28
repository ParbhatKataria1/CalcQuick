/**
 * Prompts and JSON schemas for Gemini. A paper is read in parts: an outline call lists the question
 * blocks, then each chunk of questions is extracted (with templates for calculation questions) in its
 * own call, so no answer gets long enough to be cut off. New versions of the rest are written later,
 * a few sets per call, and every one is reviewed by a second call before it is used.
 */

/** How maths is written everywhere, so the app can display it and nothing arrives as escape codes. */
const NOTATION = `Notation (applies to every string you write):
- Type characters directly: √ × ÷ − ² ³ ₹ %. Never write escape sequences such as \\u221a.
- Powers as base^exponent, with brackets when the exponent is not a single number: 7^2, (512)^(1/3), 2^(x+1).
- Fractions as a/b, e.g. "3/4 of 160". Square roots as √900 or √(a+b).
- Keep the question's own wording around the maths.`;

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
    text: { type: 'string', description: 'The question with each number replaced by {name}, from variables or derived values.' },
    variables: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Lowercase identifier, e.g. p, rate, speed_a.' },
          value: { type: 'number', description: 'The number in the original question.' },
          min: { type: 'number' },
          max: { type: 'number' },
          step: { type: 'number', description: '1 for most numbers; 5, 10 or 100 only if the original is a multiple of it; 0.5 only if the original used halves.' },
        },
        required: ['name', 'value', 'min', 'max', 'step'],
      },
    },
    derived: {
      type: 'array',
      description: 'Numbers worked out from the variables, in order. Use them when the "?" is not at the end, so the answer can be a variable.',
      items: { type: 'object', properties: { name: { type: 'string' }, expr: { type: 'string' } }, required: ['name', 'expr'] },
    },
    answerExpr: { type: 'string', description: 'Formula for the answer using variable and derived names. May simply be one variable name.' },
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

export const outlineSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Name of the paper, e.g. "IBPS Clerk Prelims 2025 · 4 Oct Shift 1".' },
    blocks: {
      type: 'array',
      description: 'Every question in the paper, in order, grouped into blocks.',
      items: {
        type: 'object',
        properties: {
          from: { type: 'integer', description: 'First question number in the block.' },
          to: { type: 'integer', description: 'Last question number in the block (same as from for a single question).' },
          section: { type: 'string', enum: ['quant', 'reasoning', 'english'] },
          topic: { type: 'string' },
        },
        required: ['from', 'to', 'section', 'topic'],
      },
    },
  },
  required: ['title', 'blocks'],
};

export const OUTLINE_PROMPT = `List the questions in the attached bank exam paper (IBPS / SBI PO & Clerk), without extracting them.

Return every question, in order, grouped into blocks:
- One block for each group of questions that share a passage, puzzle, seating arrangement or DI chart (e.g. "Directions (1-5)" over a table is one block 1-5).
- Every other question is its own block (from = to), even under shared directions such as "What should come in place of ?".
- Use the question numbers printed in the paper. If questions are unnumbered, number them 1, 2, 3… in order.
- Give each block its section ("quant", "reasoning" or "english") and topic.
Skip advertisements and pages without questions. Return JSON only, matching the schema.`;

/** Extraction limited to one range of questions; the whole PDF is still attached so shared passages and charts are visible. */
export const chunkPrompt = (from: number, to: number) => `${EXTRACTION_PROMPT}

IMPORTANT: extract ONLY questions ${from} to ${to} (by question number), nothing before or after. Use the whole document to read any directions, passages, tables or charts these questions refer to.`;

export const extractionSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Name of the paper, e.g. "IBPS Clerk Prelims 2025 · 4 Oct Shift 1".' },
    sets: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          section: { type: 'string', enum: ['quant', 'reasoning', 'english'] },
          topic: { type: 'string', description: 'e.g. Simplification, Simple Interest, Tabular DI, Line Graph DI, Seating Arrangement, Reading Comprehension, Error Spotting.' },
          difficulty: { type: 'string', enum: ['easy', 'moderate', 'hard'], description: 'As a bank exam aspirant would rate it.' },
          passage: setContentSchema.properties.passage,
          questions: { type: 'array', items: questionSchema },
          templates: { type: 'array', items: templateSchema, description: 'Only for calculation sets: one template per question, in the same order. Omit otherwise.' },
        },
        required: ['section', 'topic', 'difficulty', 'questions'],
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

export const reviewSchema = {
  type: 'object',
  properties: {
    reviews: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The id of the candidate.' },
          solvedAnswers: { type: 'array', items: { type: 'integer' }, description: 'Your own zero-based answer to each candidate question, in order. -1 if no option is correct or more than one is.' },
          difficulty: { type: 'string', enum: ['easier', 'same', 'harder'], description: 'Solving effort compared with the original: steps, traps, calculation.' },
          language: { type: 'string', enum: ['simpler', 'same', 'harder'], description: 'Vocabulary and sentence complexity compared with the original.' },
          problems: { type: 'string', description: 'Anything that breaks the question: contradictory clues, ambiguity, wrong data. Empty if none.' },
        },
        required: ['id', 'solvedAnswers', 'difficulty', 'language', 'problems'],
      },
    },
  },
  required: ['reviews'],
};

export const EXTRACTION_PROMPT = `You are preparing a bank exam (IBPS / SBI PO & Clerk) mock test from the attached PDF.

Extract EVERY question in the PDF, in order. Skip advertisements and pages without questions.
- Classify each into section "quant" (Quantitative Aptitude / Numerical Ability), "reasoning" (Reasoning Ability) or "english" (English Language), give its topic, and rate its difficulty.
- Group questions that share a passage, puzzle, seating arrangement or DI chart into ONE set, with the shared part in "passage".
- Simplification, approximation and number-series questions are independent even under shared directions: make EACH of them its own set, with the directions in "passage".
- Copy question text and options faithfully. Write DI tables and charts as markdown tables with the values read from the chart.
- If the PDF has an answer key or solutions, use them. Otherwise solve the question yourself, carefully. Always write the explanation before deciding answerIndex.

Write "templates" (one per question, in order) for every Quant set whose answers are numbers calculated from numbers in the question: simplification, arithmetic, percentages, SI/CI, profit & loss, ratio, mixtures, partnership, averages, ages, time & work, speed & distance, boats, mensuration, probability and similar.
- Replace each number in the text with a {variable}, and record the original number as "value". Ranges must keep the same number of digits as the original (784 → 700–899; 1297 → 1100–1899).
- When the "?" is not at the end (e.g. "(3080 + 6160) ÷ ? = 330" or "24 × ? = 225% of 2400"), make the answer a variable and put the other numbers in "derived", e.g. variables a, b, ans and derived c = (a + b) / ans, with answerExpr "ans".
- answerExpr and derived formulas may use numbers, names, + - * / ^ %, parentheses and sqrt, cbrt, abs, round, floor, ceil, min, max, pow, ncr, npr, fact. Nothing else.
- distractorExprs: 4 formulas giving tempting wrong answers close to the right one, modelling real mistakes.
- answerFormat "integer" when the original answer is whole, else "decimal2".
- Do NOT write templates for DI sets, number series, quadratic-equation comparisons, data sufficiency, or questions whose answer isn't a single number. Those get rewritten versions later.

${NOTATION}

Return JSON only, matching the schema.`;

export const VARIANTS_PROMPT = (count: number) => `You write fresh practice versions of bank exam (IBPS / SBI PO & Clerk) questions that feel exactly like the real exam.

For EACH input set, write ${count} new versions of the whole set ("variants"). Each version must:
- Test the same concept and question type, with the same number of questions and options, in the same order.
- Match the original's difficulty exactly (the input gives its rating): the same number of solving steps, the same traps, the same calculation load. Never make it easier.
- Match the original's length and wording level: the passage and each question within about 10% of the original's word count (given in the input), with the same vocabulary level and sentence complexity.
- Change the surface completely: new names, numbers, words, arrangements and options. Puzzles and seating arrangements need a new, fully consistent arrangement; syllogisms new terms; coding-decoding a new code; RC and cloze a new passage on a different subject of similar tone; error spotting and fillers new sentences; DI new data with the same chart type and number of rows.
- Have exactly ONE correct option per question. Solve each question yourself and write the explanation before choosing answerIndex. Check puzzles against every clue.

${NOTATION}

Return JSON only, matching the schema, with each set's "id" copied from the input.`;

export const REVIEW_PROMPT = `You are a strict reviewer for bank exam (IBPS / SBI) practice questions. Each input has an "original" set and a "candidate" rewrite.

For each candidate:
1. Solve every candidate question yourself, from scratch, without trusting any answer it may suggest. Report your answer index for each, or -1 if no option or more than one option is correct.
2. Compare the candidate with the original: is it easier, the same or harder to solve (steps, traps, calculation)? Is its language simpler, the same or harder?
3. List anything broken: contradictory or missing clues, ambiguous wording, data that doesn't add up. Leave empty if none.

Return JSON only, matching the schema, with each candidate's "id" copied from the input.`;
