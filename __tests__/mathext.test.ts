import { Expr, ExprOptions } from '../src/math';
import { Context } from '../src/context';
import { xmur3 } from './rng';

const context = (o?: any, opts?: ExprOptions) =>
  new Context(o || {}, { enableExpr: true, exprOpts: opts });

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
    for (let i = 0; i < 32; i++) {
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
    for (let i = 0; i < 16; i++) {
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
