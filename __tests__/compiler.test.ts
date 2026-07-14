import { Compiler } from '../src/compiler';
import { Context, Partials } from '../src/context';
import { CompatLevel } from '../src/compat/compat-level';
import { Formatter } from '../src/plugin';
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
