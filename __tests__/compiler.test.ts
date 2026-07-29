import { Compiler } from '../src/compiler';
import { Context, Partials } from '../src/context';
import { CompatLevel } from '../src/compat/compat-level';
import { Engine } from '../src/engine';
import { Formatter } from '../src/plugin';
import { Node } from '../src/node';
import { Type } from '../src/types';
import { Opcode as O } from '../src/opcodes';
import { Code } from '../src/instructions';
import { Variable } from '../src/variable';

class Dummy extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const name = first.node.asString();
    first.set(`Hello, ${name}.`);
  }
}

test('compiler defaults', () => {
  const source = '{a|html}';
  const json = { a: '<tag>' };
  const compiler = new Compiler();
  let { ctx } = compiler.execute({ code: source, json });
  expect(ctx.render()).toEqual('&lt;tag&gt;');

  ({ ctx } = compiler.execute());
  expect(ctx.render()).toEqual('');
});

test('eval on by default, off with enableExpr false', () => {
  // Rows mirror Java CodeExecutorTest.testEvalInstGatedByEnableExpr.
  const compiler = new Compiler();

  // No prop at all: the default turns eval on
  let { ctx, errors } = compiler.execute({ code: '{.eval 2*3}', json: {} });
  expect(errors).toEqual([]);
  expect(ctx.render()).toEqual('6');

  // Explicitly disabled
  ({ ctx, errors } = compiler.execute({ code: '{.eval 2*3}', json: {}, enableExpr: false }));
  expect(errors).toEqual([]);
  expect(ctx.render()).toEqual('');

  // Explicitly enabled
  ({ ctx, errors } = compiler.execute({ code: '{.eval 2*3}', json: {}, enableExpr: true }));
  expect(errors).toEqual([]);
  expect(ctx.render()).toEqual('6');
});

test('compiler custom formatter', () => {
  const formatters = {
    dummy: new Dummy(),
  };

  let code: Code = [O.ROOT, 1, [[O.VARIABLE, [['a']], [['dummy']]]], O.EOF];

  const json = { a: 'world' };
  const compiler = new Compiler({ formatters });
  let { ctx } = compiler.execute({ code, json });
  expect(ctx.render()).toEqual('Hello, world.');

  const source = '{a|dummy}';
  ({ ctx } = compiler.execute({ code: source, json }));
  expect(ctx.render()).toEqual('Hello, world.');

  ({ code } = compiler.parse(source));
  ({ ctx } = compiler.execute({ code, json }));
  expect(ctx.render()).toEqual('Hello, world.');
});

test('compiler mixed partials raw/parsed recursion error', () => {
  const partials: Partials = {
    foo: [O.ROOT, 1, [[O.VARIABLE, [['@']], [['apply', [['bar'], ' ']]]]], O.EOF],
    bar: '{@|apply foo}',
  };
  const code = '{num|apply foo}';
  const json = { num: 123 };
  const compiler = new Compiler();
  const { errors } = compiler.execute({ code, json, partials });
  expect(errors.length).toEqual(1);
  expect(errors[0].type).toEqual('engine');
  expect(errors[0].message).toContain('exceeded maximum recursion depth');
});

test('partial depth breach legacy include', () => {
  // Default level, released behavior. pA breaches the depth limit while
  // including pB, and the failed entry leaves the counter raised, so the
  // include of pC fails too with a spurious depth error.
  const partials: Partials = { pA: '{.include pB}', pB: 'B', pC: 'C' };
  const compiler = new Compiler();

  const { errors } = compiler.execute({
    code: '{.include pA}{.include pC}',
    json: {},
    partials,
    enableInclude: true,
    maxPartialDepth: 1,
  });
  expect(errors.length).toEqual(2);
  expect(errors[0].message).toContain('exceeded maximum recursion depth');
  expect(errors[1].message).toContain('exceeded maximum recursion depth');

  const { ctx, errors: errors2 } = compiler.execute({
    code: '{.include pA output}{.include pC output}',
    json: {},
    partials,
    enableInclude: true,
    maxPartialDepth: 1,
  });
  expect(ctx.render()).toEqual('');
  expect(errors2.length).toEqual(2);
});

test('partial depth breach fixed include', () => {
  // Level 1 fixes the leak. Only the real breach in pB is reported and the
  // include of pC renders normally.
  const partials: Partials = { pA: '{.include pB}', pB: 'B', pC: 'C' };
  const compiler = new Compiler();

  const { errors } = compiler.execute({
    code: '{.include pA}{.include pC}',
    json: {},
    partials,
    enableInclude: true,
    maxPartialDepth: 1,
    compat: CompatLevel.at(1),
  });
  expect(errors.length).toEqual(1);
  expect(errors[0].message).toContain('exceeded maximum recursion depth');

  const { ctx, errors: errors2 } = compiler.execute({
    code: '{.include pA output}{.include pC output}',
    json: {},
    partials,
    enableInclude: true,
    maxPartialDepth: 1,
    compat: CompatLevel.at(1),
  });
  expect(ctx.render()).toEqual('C');
  expect(errors2.length).toEqual(1);
});

test('partial depth breach legacy apply', () => {
  // Same breach through the apply formatter at the default level, the
  // f-apply-2 scenario in unit form. The leaked counter produces a second,
  // spurious depth error for pC.
  const partials: Partials = { pA: '{.include pB}', pB: 'B', pC: 'C' };
  const compiler = new Compiler();
  const { ctx, errors } = compiler.execute({
    code: '{out|apply pA}{out2|apply pC}',
    json: { out: {}, out2: {} },
    partials,
    enableInclude: true,
    maxPartialDepth: 1,
  });
  expect(ctx.render()).toEqual('');
  expect(errors.length).toEqual(2);
  expect(errors[0].message).toContain('exceeded maximum recursion depth');
  expect(errors[1].message).toContain('exceeded maximum recursion depth');
});

test('partial depth breach fixed apply', () => {
  // Level 1 fixes the leak: only the real breach is reported and pC applies
  // after pA returns.
  const partials: Partials = { pA: '{.include pB}', pB: 'B', pC: 'C' };
  const compiler = new Compiler();
  const { ctx, errors } = compiler.execute({
    code: '{out|apply pA}{out2|apply pC}',
    json: { out: {}, out2: {} },
    partials,
    enableInclude: true,
    maxPartialDepth: 1,
    compat: CompatLevel.at(1),
  });
  expect(ctx.render()).toEqual('C');
  expect(errors.length).toEqual(1);
  expect(errors[0].message).toContain('exceeded maximum recursion depth');
});

test('partial depth throw include', () => {
  // A partial whose body raises a runtime error. The twitter formatter throws
  // at the default level and stays silent at level 1, so one template pins
  // both halves of the throw path. This port records the exception in the
  // innermost block and keeps executing, so the legacy call site still sees
  // the partial return and releases the depth counter; the recording itself
  // is the observable difference between the levels.
  const partials: Partials = { pA: '{@|twitter-follow-button}', pC: 'C' };
  const compiler = new Compiler();

  const legacy = compiler.execute({
    code: '{.include pA output}{.include pC output}',
    json: {},
    partials,
    enableInclude: true,
    maxPartialDepth: 1,
  });
  expect(legacy.ctx.render()).toEqual('C');
  expect(legacy.errors.length).toEqual(1);
  expect(legacy.errors[0].message).toContain('ArrayIndexOutOfBoundsException');

  const fixed = compiler.execute({
    code: '{.include pA output}{.include pC output}',
    json: {},
    partials,
    enableInclude: true,
    maxPartialDepth: 1,
    compat: CompatLevel.at(1),
  });
  expect(fixed.ctx.render()).toEqual('C');
  expect(fixed.errors.length).toEqual(0);
});

test('partial depth throw apply', () => {
  // Same throw scenario through the apply formatter. The depth stays balanced
  // in both modes because the engine records the formatter error instead of
  // re-throwing it.
  const partials: Partials = { pA: '{@|twitter-follow-button}', pC: 'C' };
  const compiler = new Compiler();

  const legacy = compiler.execute({
    code: '{out|apply pA}{out2|apply pC}',
    json: { out: {}, out2: {} },
    partials,
    enableInclude: true,
    maxPartialDepth: 1,
  });
  expect(legacy.ctx.render()).toEqual('C');
  expect(legacy.errors.length).toEqual(1);
  expect(legacy.errors[0].message).toContain('ArrayIndexOutOfBoundsException');

  const fixed = compiler.execute({
    code: '{out|apply pA}{out2|apply pC}',
    json: { out: {}, out2: {} },
    partials,
    enableInclude: true,
    maxPartialDepth: 1,
    compat: CompatLevel.at(1),
  });
  expect(fixed.ctx.render()).toEqual('C');
  expect(fixed.errors.length).toEqual(0);
});

test('eval integral digits, legacy at the default level', () => {
  // Port of Java CompilerTest.testEvalIntegralResults, the released path.
  // The double path renders exact digits below 2^53 and rounds above it,
  // the same 16-significant-digit form Java's DoubleNode renders, so these
  // byte-match level 0.
  const rows: [string, string][] = [
    ['{.eval 3.0}', '3'],
    ['{.eval 1+2}', '3'],
    ['{.eval 2 ** 62}', '4611686018427388000'],
    ['{.eval 1.5}', '1.5'],
    ['{.eval 1/3}', '0.3333333333333333'],
    ['{.eval 2 ** 64}', '18446744073709552000'],
    // A literal past 2^53 rounds to a double when the expression tokenizes,
    // in TS and Java alike.
    ['{.eval 9007199254740993}', '9007199254740992'],
    ['{.eval 0x20000000000001}', '9007199254740992'],
  ];
  for (const [template, expected] of rows) {
    const { ctx, errors } = new Compiler().execute({ code: template, json: {}, enableExpr: true });
    expect(errors).toEqual([]);
    expect(ctx.render()).toEqual(expected);
  }
});

test('eval integral digits, level 2 keeps the double path', () => {
  // EVAL_INTEGRAL_LONG fixes at level 3, so level 2 renders the same
  // rounded form as the default.
  const { ctx } = new Compiler().execute({
    code: '{.eval 2 ** 62}',
    json: {},
    enableExpr: true,
    compat: CompatLevel.at(2),
  });
  expect(ctx.render()).toEqual('4611686018427388000');
});

test('eval integral digits, exact at the fixed level', () => {
  // Level 3+ emits exact digits for integral results within long range,
  // Java's LongNode. Fractional results and results past 2^63 stay doubles
  // at every level.
  const rows: [string, string][] = [
    ['{.eval 2 ** 62}', '4611686018427387904'],
    ['{.eval 1+2}', '3'],
    ['{.eval 3.0}', '3'],
    ['{.eval 1.5}', '1.5'],
    ['{.eval 2 ** 64}', '18446744073709552000'],
  ];
  for (const [template, expected] of rows) {
    const { ctx, errors } = new Compiler().execute({
      code: template,
      json: {},
      enableExpr: true,
      compat: CompatLevel.fixed(),
    });
    expect(errors).toEqual([]);
    expect(ctx.render()).toEqual(expected);
  }
});

test('eval integral result compares equal to the same JSON number', () => {
  // A fixed-level eval result renders with exact digits but still carries
  // its double value, so it orders identically against a JSON number of
  // the same value. The literal also rounds to that double at JSON.parse.
  // Known residual: the exact digits live on the node's render path only,
  // so consumers that re-derive digits from the number, such as money on
  // an eval result, still see the double form.
  const template =
    '{.eval @n = 2 ** 62}' +
    '{.equal? @n 4611686018427387904}equal{.or}not-equal{.end}' +
    '{.greaterThan? @n 4611686018427387904}gt{.or}not-gt{.end}' +
    '{.lessThan? @n 4611686018427387904}lt{.or}not-lt{.end}';
  const { ctx, errors } = new Compiler().execute({
    code: template,
    json: {},
    enableExpr: true,
    compat: CompatLevel.fixed(),
  });
  expect(errors).toEqual([]);
  expect(ctx.render()).toEqual('equalnot-gtnot-lt');
});

// Residual, pinned but not fixed here: JSON integer input above 2^53 rounds
// at JSON.parse in TS, while Java's Jackson keeps it exact via LongNode or
// BigIntegerNode at every level. The divergence is in the data layer and
// predates this patch; the eval rows above document the shared double form.

test('eval integral result carries exact digits as a double', () => {
  // The ExprTest analogue of Java's LongNode assertion: at the fixed level
  // the emitted node renders its exact digits while its value stays the
  // double, so asNumber, compare, equals and predicates keep the old
  // behavior.
  const { code } = new Compiler().parse('{.eval 2 ** 62}');
  let captured: Node | undefined;
  class CaptureCtx extends Context {
    emitNode(node: Node): void {
      captured = node;
      super.emitNode(node);
    }
  }
  const ctx = new CaptureCtx({}, { enableExpr: true });
  ctx.setCompat(CompatLevel.fixed());
  new Engine().execute(code, ctx);
  expect(captured!.type).toBe(Type.NUMBER);
  expect(captured!.value).toBe(2 ** 62);
  expect(captured!.asString()).toBe('4611686018427387904');
  expect(ctx.render()).toBe('4611686018427387904');

  // The default level keeps the released double form and no exact digits.
  const { code: legacyCode } = new Compiler().parse('{.eval 2 ** 62}');
  const legacy = new CaptureCtx({}, { enableExpr: true });
  new Engine().execute(legacyCode, legacy);
  expect(captured!.exactDigits).toBeUndefined();
  expect(captured!.asString()).toBe('4611686018427388000');
});

test('compiler raw partials', () => {
  const partials = {
    foo: '{@|apply bar}',
    bar: '{@|apply baz}',
    baz: '{@} baz',
  };
  const code = '{num|apply foo}';
  const json = { num: 123 };
  const compiler = new Compiler();
  const { ctx, errors } = compiler.execute({ code, json, partials });
  expect(errors).toEqual([]);
  expect(ctx.render()).toEqual('123 baz');
});

test('compiler partials error reporting', () => {
  const partials = {
    foo: '{.end}',
  };
  const code = '{num|apply foo}';
  const json = { num: 123 };
  const compiler = new Compiler();
  const { ctx, errors } = compiler.execute({ code, json, partials });
  expect(errors.length).toEqual(1);
  expect(errors[0].type).toEqual('engine');
  expect(errors[0].message).toContain('Parse of partial "foo"');
  expect(ctx.render()).toEqual('');
});
