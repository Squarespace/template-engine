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
  expect(ctx.buf).toEqual('&lt;tag&gt;');

  ({ ctx } = compiler.execute());
  expect(ctx.buf).toEqual('');
});


test('compiler custom formatter', () => {
  const formatters = {
    dummy: new Dummy(),
  };

  let code = [ROOT, 1, [
    [VARIABLE, ['a'], [['dummy']]]
  ], EOF];

  const json = { a: 'world' };
  const compiler = new Compiler({ formatters });
  let { ctx } = compiler.execute({ code, json });
  expect(ctx.buf).toEqual('Hello, world.');

  const source = '{a|dummy}';
  ({ ctx } = compiler.execute({ code: source, json }));
  expect(ctx.buf).toEqual('Hello, world.');

  ({ code } = compiler.parse(source));
  ({ ctx } = compiler.execute({ code, json }));
  expect(ctx.buf).toEqual('Hello, world.');
});
