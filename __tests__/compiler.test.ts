import { Compiler } from '../src/compiler';
import { Context, Partials } from '../src/context';
import { Formatter } from '../src/plugin';
import { Opcode as O } from '../src/opcodes';
import { Code } from '../src/instructions';
import { Variable } from '../src/variable';

class Dummy extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context) {
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

  let code: Code = [O.ROOT, 1, [
    [O.VARIABLE, [['a']], [['dummy']]]
  ], O.EOF];

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
    foo: [O.ROOT, 1, [
      [O.VARIABLE, [['@']], [['apply', ['bar']]]]
    ], O.EOF],
    bar: '{@|apply foo}'
  };
  const code = '{num|apply foo}';
  const json = { num: 123 };
  const compiler = new Compiler();
  const { ctx, errors } = compiler.execute({ code, json, partials });
  expect(errors.length).toEqual(1);
  expect(errors[0].type).toEqual('engine');
  expect(errors[0].message).toContain('Recursion into self');
});

test('compiler raw partials', () => {
  const partials = {
    foo: '{@|apply bar}',
    bar: '{@|apply baz}',
    baz: '{@} baz'
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
    foo: '{.end}'
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
