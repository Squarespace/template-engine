import Assembler from '../src/assembler';
import Context from '../src/context';
import Engine from '../src/engine';
import Parser from '../src/parser';
import { Opcode } from '../src/opcodes';

const { COMMENT, ROOT, TEXT, VARIABLE } = Opcode;

const parse = (str) => {
  const assembler = new Assembler();
  const parser = new Parser(str, assembler);
  parser.parse();
  return { assembler, parser, code: assembler.code() };
};

test('parse and execute', () => {
  const { assembler, code } = parse('a{b}c{## comment\ncomment ##}d{e}f');

  expect(code).toEqual([ROOT, 1, [
    [TEXT, 'a'],
    [VARIABLE, [['b']], 0],
    [TEXT, 'c'],
    [COMMENT, ' comment\ncomment ', 1],
    [TEXT, 'd'],
    [VARIABLE, [['e']], 0],
    [TEXT, 'f']
  ], EOF]);

  const ctx = new Context({ b: '...', e: '---' });
  const engine = new Engine();
  engine.execute(assembler.code(), ctx);
  expect(ctx.render()).toEqual('a...cd---f');
});
