import {
  Binary,
  Divide,
  Grid2X2,
  Hash,
  Percent,
  Plus,
  Radical,
  Sigma,
  Sparkles,
  Square,
  Superscript,
  X,
} from 'lucide-react';
import type { CategoryId } from '@/types';

export const categories: Array<{
  id: CategoryId;
  label: string;
  shortLabel: string;
  description: string;
  range: string;
  icon: typeof Hash;
}> = [
  { id: 'tables', label: 'Tables', shortLabel: 'Tables', description: 'Build instant multiplication recall.', range: '1–30', icon: Grid2X2 },
  { id: 'squares', label: 'Squares', shortLabel: 'Squares', description: 'Recall perfect squares quickly.', range: '1–40', icon: Square },
  { id: 'cubes', label: 'Cubes', shortLabel: 'Cubes', description: 'Master cubes used in simplification.', range: '1–20', icon: Superscript },
  { id: 'fractionToPercent', label: 'Fraction → %', shortLabel: 'Frac → %', description: 'Convert common fractions instantly.', range: '1/2–1/20', icon: Percent },
  { id: 'percentToFraction', label: '% → Fraction', shortLabel: '% → Frac', description: 'Reverse common percentage values.', range: 'Common', icon: Divide },
  { id: 'powers', label: 'Powers of 2', shortLabel: 'Powers', description: 'Memorize common powers of two.', range: '2¹–2¹⁰', icon: Binary },
  { id: 'squareRoots', label: 'Square Roots', shortLabel: 'Roots', description: 'Recognize roots of perfect squares.', range: '≤ 2500', icon: Radical },
  { id: 'addition', label: 'Addition', shortLabel: 'Addition', description: 'Increase mental addition speed.', range: '2–3 terms', icon: Plus },
  { id: 'subtraction', label: 'Subtraction', shortLabel: 'Subtract', description: 'Train fast mental subtraction.', range: 'Mixed', icon: Sigma },
  { id: 'multiplication', label: 'Multiplication', shortLabel: 'Multiply', description: 'Practice 2-digit × 2-digit products.', range: '2 digit', icon: X },
  { id: 'division', label: 'Division', shortLabel: 'Division', description: 'Solve clean divisions quickly.', range: 'Exact', icon: Divide },
  { id: 'mixed', label: 'Mixed Practice', shortLabel: 'Mixed', description: 'Blend all core calculation skills.', range: 'Adaptive', icon: Sparkles },
];

export const categoryLabel = (id: CategoryId) =>
  id === 'banking' ? 'Banking Drill' : categories.find((category) => category.id === id)?.label ?? id;
