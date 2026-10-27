/**
 * A small arithmetic evaluator for AI-written answer formulas. It never runs code: it only
 * understands numbers, variables, + − × ÷ ^ %, parentheses and a fixed set of functions.
 */

type Token = { type: 'number'; value: number } | { type: 'name'; value: string } | { type: 'op'; value: string };

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  abs: Math.abs,
  round: (value, digits = 0) => Math.round(value * 10 ** digits) / 10 ** digits,
  floor: Math.floor,
  ceil: Math.ceil,
  min: Math.min,
  max: Math.max,
  pow: Math.pow,
  log10: Math.log10,
  ln: Math.log,
  /** Number of ways to choose r from n. */
  ncr: (n, r) => {
    if (r < 0 || r > n || !Number.isInteger(n) || !Number.isInteger(r)) return NaN;
    let result = 1;
    for (let index = 1; index <= Math.min(r, n - r); index++) result = (result * (n - index + 1)) / index;
    return Math.round(result);
  },
  npr: (n, r) => {
    if (r < 0 || r > n || !Number.isInteger(n) || !Number.isInteger(r)) return NaN;
    let result = 1;
    for (let index = 0; index < r; index++) result *= n - index;
    return result;
  },
  fact: (n) => {
    if (n < 0 || n > 20 || !Number.isInteger(n)) return NaN;
    let result = 1;
    for (let index = 2; index <= n; index++) result *= index;
    return result;
  },
};

const CONSTANTS: Record<string, number> = { pi: 22 / 7 };

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  const text = source.replace(/[×]/g, '*').replace(/[÷]/g, '/').replace(/[−–]/g, '-');
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    if (/\s/.test(char)) { index++; continue; }
    const number = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(text.slice(index));
    if (number) {
      tokens.push({ type: 'number', value: Number(number[0]) });
      index += number[0].length;
      continue;
    }
    // Variables may be written bare or as {name}, as in the question text.
    const name = /^\{?([a-z_][a-z0-9_]*)\}?/i.exec(text.slice(index));
    if (name) {
      tokens.push({ type: 'name', value: name[1] });
      index += name[0].length;
      continue;
    }
    if ('+-*/^%(),'.includes(char)) {
      tokens.push({ type: 'op', value: char });
      index++;
      continue;
    }
    throw new Error(`Unexpected "${char}" in formula`);
  }
  return tokens;
}

/** Evaluates a formula with the given variables. Throws on unknown names or bad syntax. */
export function evaluate(source: string, variables: Record<string, number>): number {
  const tokens = tokenize(source);
  let position = 0;
  const peek = () => tokens[position];
  const isOp = (value: string) => peek()?.type === 'op' && peek()?.value === value;
  const expect = (value: string) => {
    if (!isOp(value)) throw new Error(`Expected "${value}" in formula`);
    position++;
  };

  // expression := term (('+' | '-') term)*
  const expression = (): number => {
    let value = term();
    while (isOp('+') || isOp('-')) {
      const op = tokens[position++].value;
      value = op === '+' ? value + term() : value - term();
    }
    return value;
  };
  // term := unary (('*' | '/' | '%') unary)*, with implicit multiplication such as 2(x+1)
  const term = (): number => {
    let value = unary();
    for (;;) {
      if (isOp('*')) { position++; value *= unary(); }
      else if (isOp('/')) { position++; value /= unary(); }
      else if (isOp('%')) { position++; value %= unary(); }
      else if (peek() && (peek().type !== 'op' || isOp('('))) value *= unary();
      else return value;
    }
  };
  const unary = (): number => {
    if (isOp('-')) { position++; return -unary(); }
    if (isOp('+')) { position++; return unary(); }
    return power();
  };
  // power is right-associative: 2^3^2 = 2^9
  const power = (): number => {
    const base = primary();
    if (isOp('^')) { position++; return base ** unary(); }
    return base;
  };
  const primary = (): number => {
    const token = peek();
    if (!token) throw new Error('Formula ended early');
    if (token.type === 'number') { position++; return token.value; }
    if (token.type === 'name') {
      position++;
      // Own-property checks, so names such as "constructor" don't resolve through the prototype.
      const lower = token.value.toLowerCase();
      if (isOp('(') && Object.hasOwn(FUNCTIONS, lower)) {
        position++;
        const args: number[] = [];
        if (!isOp(')')) {
          args.push(expression());
          while (isOp(',')) { position++; args.push(expression()); }
        }
        expect(')');
        return FUNCTIONS[lower](...args);
      }
      if (Object.hasOwn(variables, token.value)) return variables[token.value];
      if (Object.hasOwn(CONSTANTS, lower)) return CONSTANTS[lower];
      throw new Error(`Unknown name "${token.value}" in formula`);
    }
    if (token.value === '(') {
      position++;
      const value = expression();
      expect(')');
      return value;
    }
    throw new Error(`Unexpected "${token.value}" in formula`);
  };

  const result = expression();
  if (position < tokens.length) throw new Error('Unexpected text at the end of the formula');
  return result;
}
