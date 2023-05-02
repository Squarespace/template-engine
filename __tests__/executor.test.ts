import { Assembler } from '../src/assembler';
import { Context } from '../src/context';
import { Engine } from '../src/engine';
import { Parser } from '../src/parser';
import { MatcherImpl } from '../src/matcher';
import { Opcode as O } from '../src/opcodes';
import { Formatters, Predicates } from '../src/plugins';

const MATCHER = new MatcherImpl('');

const parse = (str: string) => {
  const assembler = new Assembler();
  const parser = new Parser(str, assembler, MATCHER, Formatters, Predicates);
  parser.parse();
  return { assembler, parser, code: assembler.code() };
};

test('parse and execute', () => {
  const { assembler, code } = parse('a{b}c{## comment\ncomment ##}d{e}f');

  expect(code).toEqual([
    O.ROOT,
    1,
    [
      [O.TEXT, 'a'],
      [O.VARIABLE, [['b']], 0],
      [O.TEXT, 'c'],
      [O.COMMENT, ' comment\ncomment ', 1],
      [O.TEXT, 'd'],
      [O.VARIABLE, [['e']], 0],
      [O.TEXT, 'f'],
    ],
    O.EOF,
  ]);

  const ctx = new Context({ b: '...', e: '---' });
  const engine = new Engine();
  engine.execute(assembler.code(), ctx);
  expect(ctx.render()).toEqual('a...cd---f');
});
