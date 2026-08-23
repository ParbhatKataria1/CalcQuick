import type { BankingTechnique } from '@/lib/question-generator';

export type BankingTheory = {
  id: BankingTechnique;
  number: number;
  title: string;
  shortDescription: string;
  principle: string;
  whyItWorks: string;
  examples: Array<{ problem: string; steps: string[]; answer: string }>;
  cues: string[];
};

export const bankingTechniques: BankingTheory[] = [
  {
    id: 'complements', number: 1, title: 'Master complements',
    shortDescription: 'Recall what completes 10, 100, and 1000 without borrowing.',
    principle: 'When you see a number, train yourself to retrieve what must be added to reach the next clean base. The response should become recognition, not a fresh subtraction procedure.',
    whyItWorks: 'Complements reduce work in simplification, approximation, subtraction, and Data Interpretation. They are the foundation for compensation and intelligent pairing.',
    examples: [
      { problem: 'Complements of 10', steps: ['1 ↔ 9   2 ↔ 8   3 ↔ 7', '4 ↔ 6   5 ↔ 5'], answer: 'Recall these instantly' },
      { problem: '100 − 37', steps: ['Think: 37 + ? = 100', '3 becomes 10 with 7; 40 becomes 100 with 60'], answer: '63' },
      { problem: '1000 − 438', steps: ['Think: 438 + ? = 1000', '438 + 562 = 1000'], answer: '562' },
    ],
    cues: ['See 37 → think +63', 'See 725 → think +275', 'Avoid digit-by-digit borrowing'],
  },
  {
    id: 'compensation', number: 2, title: 'Use compensation',
    shortDescription: 'Replace an awkward number with a nearby round number, then correct.',
    principle: 'Round one operand to 100, 200, 300, 500, or 1000. Perform the easy operation and compensate for the small amount you changed.',
    whyItWorks: 'A clean-base operation plus a tiny correction takes fewer mental steps than conventional column arithmetic.',
    examples: [
      { problem: '843 − 398', steps: ['398 = 400 − 2', '843 − 400 = 443', '443 + 2 = 445'], answer: '445' },
      { problem: '567 + 298', steps: ['298 = 300 − 2', '567 + 300 = 867', '867 − 2 = 865'], answer: '865' },
      { problem: '428 + 497', steps: ['497 = 500 − 3', '428 + 500 − 3'], answer: '925' },
    ],
    cues: ['Look for numbers ending in 8 or 9', 'Round first', 'Reverse the adjustment afterward'],
  },
  {
    id: 'leftToRight', number: 3, title: 'Calculate left → right',
    shortDescription: 'Move through hundreds, tens, and units as mental jumps.',
    principle: 'Start with the largest place value because it preserves the scale of the answer and is easier to hold in working memory.',
    whyItWorks: 'The running total stays meaningful throughout the calculation, and repeated practice compresses the jumps into one fluent action.',
    examples: [
      { problem: '368 + 457', steps: ['368 + 400 = 768', '768 + 50 = 818', '818 + 7 = 825'], answer: '825' },
      { problem: '736 + 248', steps: ['736 + 200 = 936', '936 + 40 = 976', '976 + 8 = 984'], answer: '984' },
    ],
    cues: ['Hundreds first', 'Then tens', 'Units last'],
  },
  {
    id: 'pairing', number: 4, title: 'Pair numbers intelligently',
    shortDescription: 'Reorder a group to create clean totals before adding.',
    principle: 'Do not accept the order in which numbers are presented. Scan the whole expression and pair values that make 10, 20, 50, 100, 500, or 1000.',
    whyItWorks: 'What appears to be four calculations can become two pattern matches and one easy total—especially valuable in Data Interpretation.',
    examples: [
      { problem: '247 + 198 + 503 + 52', steps: ['247 + 503 = 750', '198 + 52 = 250', '750 + 250 = 1000'], answer: '1000' },
      { problem: '67 + 38 + 33 + 62', steps: ['67 + 33 = 100', '38 + 62 = 100'], answer: '200' },
    ],
    cues: ['Scan before calculating', 'Reorder freely', 'Hunt for clean totals'],
  },
  {
    id: 'chunking', number: 5, title: 'Break numbers into chunks',
    shortDescription: 'Split an operand into convenient place-value pieces.',
    principle: 'Decompose an awkward number into hundreds, tens, and units, then apply each chunk to a running total.',
    whyItWorks: 'Chunking replaces carries and borrowing with simple jumps. With repetition, the visible steps collapse into a single mental action.',
    examples: [
      { problem: '687 − 243', steps: ['687 − 200 = 487', '487 − 40 = 447', '447 − 3 = 444'], answer: '444' },
      { problem: '574 + 321', steps: ['574 + 300 = 874', '874 + 20 = 894', '894 + 1 = 895'], answer: '895' },
    ],
    cues: ['Split by place value', 'Keep a running total', 'Use compensation when a chunk is near a base'],
  },
];

export const bankingSpeedTargets = [
  ['Complements to 10', 'Instant'], ['Complements to 100', '<1 sec'], ['Complements to 1000', '1–2 sec'],
  ['2-digit + 2-digit', '1–2 sec'], ['2-digit − 2-digit', '1–2 sec'], ['3-digit + 3-digit', '2–3 sec'],
  ['3-digit − 3-digit', '2–3 sec'], ['4–5 number addition', '3–6 sec'], ['Approximation', 'Near-instant recognition'],
];
