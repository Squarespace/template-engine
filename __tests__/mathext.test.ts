import { Expr, ExprOptions } from '../src/math';
import { Context } from '../src/context';
import { Type } from '../src/types';
import { xmur3 } from './rng';

const context = (o?: any, opts?: ExprOptions) => new Context(o || {}, { enableExpr: true, exprOpts: opts });

const reduce = (s: string, ctx: Context) => {
  const e = new Expr(s);
  e.build();
  return e.reduce(ctx);
};

test('random expression', () => {
  // TODO: more / better randomized input generation.
  const c = context({
    a: 1,
  });
  const r = xmur3('random seed');
  const syms = ['1', '.', '2', 'a', '(', ')', '+', '-', '/', '*', '=', ','];
  const len = syms.length;
  for (let i = 0; i < 10000; i++) {
    let s = '';
    for (let j = 0; j < 32; j++) {
      const n = r();
      s += syms[n % len] + ' ';
    }
    // Parse, build and reduce. It must not be possible for an input
    // to wedge the machine.
    reduce(s, c);
  }
});

test('random number pattern', () => {
  const c = context({});
  const r = xmur3('random seed');
  const syms = ['1', '2', '3', '4', '5', '-', '.', 'e'];
  const len = syms.length;
  for (let i = 0; i < 10000; i++) {
    let s = i % 2 ? '1' : '0';
    for (let j = 0; j < 16; j++) {
      const n = r();
      s += syms[n % len];
    }
    reduce(s, c);
  }
});

test('slices of valid expressions', () => {
  const exprs: string[] = [
    '-13.55e-17 - -15.33e10',
    '"\\u2019\\u10fc00" == "\\u2018foo\\u2019"',
    'a.b.c * d.e.f * pi',
    'max(-1, 15, a, num(b, c, f), min(c, abs(7, 8), 9), pi)',
  ];
  const c = context({});
  for (let i = 0; i < exprs.length; i++) {
    const ex = exprs[i];
    for (let j = 0; j < ex.length; j++) {
      // slice the valid expression to produce an incomplete one
      const raw = ex.substring(0, j);

      // ensure this still evaluates
      let e = new Expr(raw);
      e.build();
      e.reduce(c);

      // append a character to the partial expression and evaluate
      for (let k = 0; k < 1024; k++) {
        const rawe = raw + String.fromCharCode(k);
        e = new Expr(rawe);
        e.build();
        e.reduce(c);
      }
    }
  }
});

/**
 * Pins the deliberate, tested divergences from JavaScript documented in
 * the Expr class docs, mirroring testJsDivergences in Java's ExprTest.
 * These are not bugs to fix silently; true JS semantics is a separate,
 * explicitly approved task.
 */
test('js divergences', () => {
  const c = context({});
  const bool = (s: string) => {
    const r = reduce(s, c)!;
    expect(r.type).toBe(Type.BOOLEAN);
    return r.value;
  };

  // && and || always evaluate both operands and yield a boolean. JS
  // short-circuits and returns the deciding operand: 1 && 2 -> 2,
  // 0 || 3 -> 3.
  expect(bool('1 && 2')).toBe(true);
  expect(bool('0 || 3')).toBe(true);
  expect(bool('true && false')).toBe(false);

  // null keeps JS loose equality, so both are false. Java coerces null
  // to 0 and pins the opposite: null == 0 -> true, null == "" -> true.
  expect(bool('null == 0')).toBe(false);
  expect(bool('null == ""')).toBe(false);
  expect(bool('null == 1')).toBe(false);

  // No short-circuit: the right operand of && runs even when the left
  // operand is falsy, so @x becomes 2. In JS, 0 && (x = 2) leaves x at
  // 1. The assignment also ends the expression with no result, so this
  // reduces to undefined, while Java's stack keeps the stray 0 and
  // yields 0.
  const e = new Expr('@x = 1; 0 && (@x = 2)');
  e.build();
  expect(e.reduce(c)).toBeUndefined();
  expect(c.resolve(['@x']).value).toBe(2);
});
