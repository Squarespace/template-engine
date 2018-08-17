import Compiler from '../src';
import { Formatter } from '../src/plugin';
import { ROOT, VARIABLE, EOF } from '../src/opcodes';


class Dummy extends Formatter {
  apply(args, vars, ctx) {
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

  let code = [ROOT, 1, [
    [VARIABLE, [['a']], [['dummy']]]
  ], EOF];

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
  const partials = {
    foo: [ROOT, 1, [
      [VARIABLE, [['@']], [['apply', ['bar']]]]
    ], EOF],
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
