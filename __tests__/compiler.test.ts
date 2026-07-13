import { Compiler } from '../src/compiler';
import { Context, Partials } from '../src/context';
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

test('partial depth breach balanced include', () => {
  // Safe mode, max depth 1. pA breaches the limit while including pB.
  // The counter must drop back so the following include of pC succeeds.
  // Before the fix a spurious second depth error was raised for pC.
  const partials: Partials = { pA: '{.include pB}', pB: 'B', pC: 'C' };
  const compiler = new Compiler();

  // Include suppresses output, so check the error count on the exact
  // acceptance template: only pA's pB include may breach.
  const { errors } = compiler.execute({
    code: '{.include pA}{.include pC}',
    json: {},
    partials,
    enableInclude: true,
    maxPartialDepth: 1,
  });
  expect(errors.length).toEqual(1);
  expect(errors[0].message).toContain('exceeded maximum recursion depth');

  // Same template with output enabled: pC must render after pA's breach.
  const { ctx, errors: errors2 } = compiler.execute({
    code: '{.include pA output}{.include pC output}',
    json: {},
    partials,
    enableInclude: true,
    maxPartialDepth: 1,
  });
  expect(ctx.render()).toEqual('C');
  expect(errors2.length).toEqual(1);
});

test('partial depth breach balanced apply', () => {
  // Same breach scenario through the apply formatter. The safe-mode breach
  // branch (set empty) must not double-decrement, and pC must still apply
  // after pA's breach.
  const partials: Partials = { pA: '{.include pB}', pB: 'B', pC: 'C' };
  const compiler = new Compiler();
  const { ctx, errors } = compiler.execute({
    code: '{out|apply pA}{out2|apply pC}',
    json: { out: {}, out2: {} },
    partials,
    enableInclude: true,
    maxPartialDepth: 1,
  });
  expect(ctx.render()).toEqual('C');
  expect(errors.length).toEqual(1);
  expect(errors[0].message).toContain('exceeded maximum recursion depth');
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
