import Assembler from '../src/assembler';
import Context from '../src/context';
import Engine from '../src/engine';
import Parser from '../src/parser';

import {
  BINDVAR,
  COMMENT,
  END,
  EOF,
  IF,
  INJECT,
  MACRO,
  OR_PREDICATE,
  PREDICATE,
  REPEATED,
  ROOT,
  SECTION,
  TEXT,
  VARIABLE,
} from '../src/opcodes';


const parse = (str) => {
  const assembler = new Assembler();
  const parser = new Parser(str, assembler);
  parser.parse();
  return { assembler, parser, code: assembler.code() };
};


test('initialization failures', () => {
  expect(() => new Parser('hello', {})).toThrowError();
});


test('degenerate cases', () => {
  let { code } = parse('a{b');
  expect(code).toEqual([ROOT, 1, [
    [TEXT, 'a{b']
  ], EOF]);

  ({ code } = parse('{{{}{{}'));
  expect(code).toEqual([ROOT, 1, [
    [TEXT, '{{'],
    [TEXT, '{}'],
    [TEXT, '{'],
    [TEXT, '{}']
  ], EOF]);

  ({ code } = parse('{.end  }'));
  expect(code).toEqual([ROOT, 1, [
    [TEXT, '{.end  }']
  ], EOF]);
});


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


test('bindvar', () => {
  let { code } = parse('abc{.var @foo bar}def');
  expect(code).toEqual([ROOT, 1, [
    [TEXT, 'abc'],
    [BINDVAR, '@foo', [['bar']], 0],
    [TEXT, 'def']
  ], EOF]);

  ({ code } = parse('{.var @foo a, b|html}'));
  expect(code).toEqual([ROOT, 1, [[BINDVAR, '@foo', [['a'], ['b']], [['html']]]], EOF]);

  ({ code } = parse('{.var}'));
  expect(code).toEqual([ROOT, 1, [[TEXT, '{.var}']], EOF]);

  ({ code } = parse('{.var+}'));
  expect(code).toEqual([ROOT, 1, [[TEXT, '{.var+}']], EOF]);

  ({ code } = parse('{.var **}'));
  expect(code).toEqual([ROOT, 1, [[TEXT, '{.var **}']], EOF]);

  ({ code } = parse('{.var @foo}'));
  expect(code).toEqual([ROOT, 1, [[TEXT, '{.var @foo}']], EOF]);

  ({ code } = parse('{.var @foo+}'));
  expect(code).toEqual([ROOT, 1, [[TEXT, '{.var @foo+}']], EOF]);

  ({ code } = parse('{.var @foo +}'));
  expect(code).toEqual([ROOT, 1, [[TEXT, '{.var @foo +}']], EOF]);

  ({ code } = parse('{.var @foo bar }'));
  expect(code).toEqual([ROOT, 1, [[TEXT, '{.var @foo bar }']], EOF]);
});


test('comments', () => {
  const { code } = parse('abc{# comment 1} {#comment 2}def');
  expect(code).toEqual([ROOT, 1, [
    [TEXT, 'abc'],
    [COMMENT, ' comment 1', 0],
    [TEXT, ' '],
    [COMMENT, 'comment 2', 0],
    [TEXT, 'def']
  ], EOF]);
});


test('if', () => {
  let { code } = parse('{.if a.b}A{.end}');
  expect(code).toEqual([ROOT, 1, [
    [IF, [], [['a', 'b']], [
      [TEXT, 'A']
    ], END]
  ], EOF]);

  // Generates a PREDICATE instruction instead of an If
  ({ code } = parse('{.if equal?}A{.end}'));
  expect(code).toEqual([ROOT, 1, [
    [PREDICATE, 'equal?', 0, [[TEXT, 'A']], END]
  ], EOF]);

  ({ code } = parse('{.if}'));
  expect(code).toEqual([ROOT, 1, [[TEXT, '{.if}']], EOF]);

  ({ code } = parse('{.if a**}'));
  expect(code).toEqual([ROOT, 1, [[TEXT, '{.if a**}']], EOF]);

  ({ code } = parse('{.if a || **}'));
  expect(code).toEqual([ROOT, 1, [[TEXT, '{.if a || **}']], EOF]);
});


test('inject', () => {
  let { code } = parse('abc{.inject @foo ./messages-en_US.json a b c}def');
  expect(code).toEqual([ROOT, 1, [
    [TEXT, 'abc'],
    [INJECT, '@foo', './messages-en_US.json', 0], // arguments parsed but currently ignored
    [TEXT, 'def']
  ], EOF]);

  ({ code } = parse('{.inject @foo ./bar.json}'));
  expect(code).toEqual([ROOT, 1, [[INJECT, '@foo', './bar.json', 0]], EOF]);

  ({ code } = parse('{.inject}'));
  expect(code).toEqual([ROOT, 1, [[TEXT, '{.inject}']], EOF]);

  ({ code } = parse('{.inject }'));
  expect(code).toEqual([ROOT, 1, [[TEXT, '{.inject }']], EOF]);

  ({ code } = parse('{.inject **}'));
  expect(code).toEqual([ROOT, 1, [[TEXT, '{.inject **}']], EOF]);

  ({ code } = parse('{.inject @foo}'));
  expect(code).toEqual([ROOT, 1, [[TEXT, '{.inject @foo}']], EOF]);

  ({ code } = parse('{.inject @foo+}'));
  expect(code).toEqual([ROOT, 1, [[TEXT, '{.inject @foo+}']], EOF]);

  ({ code } = parse('{.inject @foo }'));
  expect(code).toEqual([ROOT, 1, [[TEXT, '{.inject @foo }']], EOF]);

  ({ code } = parse('{.inject @foo **}'));
  expect(code).toEqual([ROOT, 1, [[TEXT, '{.inject @foo **}']], EOF]);

  ({ code } = parse('{.inject @foo a b c|}'));
  expect(code).toEqual([ROOT, 1, [[TEXT, '{.inject @foo a b c|}']], EOF]);
});


test('macro', () => {
  let { code } = parse('abc\n\t{.macro foo.html}{a.b.c}{.end}\ndef');
  expect(code).toEqual([ROOT, 1, [
    [TEXT, 'abc\n\t'],
    [MACRO, 'foo.html', [
      [VARIABLE, [['a', 'b', 'c']], 0]
    ]],
    [TEXT, '\ndef']
  ], EOF]);

  ({ code } = parse('{.macro}'));
  expect(code).toEqual([ROOT, 1, [[TEXT, '{.macro}']], EOF]);

  ({ code } = parse('{.macro }'));
  expect(code).toEqual([ROOT, 1, [[TEXT, '{.macro }']], EOF]);

  ({ code } = parse('{.macro **}'));
  expect(code).toEqual([ROOT, 1, [[TEXT, '{.macro **}']], EOF]);

  ({ code } = parse('{.macro ./foo.json**}'));
  expect(code).toEqual([ROOT, 1, [[TEXT, '{.macro ./foo.json**}']], EOF]);
});


test('multiline comments', () => {
  let { code } = parse('abc{##\ncomment ## comment\n##}def');
  expect(code).toEqual([ROOT, 1, [
    [TEXT, 'abc'],
    [COMMENT, '\ncomment ## comment\n', 1],
    [TEXT, 'def']
  ], EOF]);

  ({ code } = parse('{## foo bar ##'));
  expect(code).toEqual([ROOT, 1, [
    [COMMENT, ' foo bar ##', 1]
  ], EOF]);
});


test('or predicate', () => {
  let { code } = parse('foo{.section a}{.or}A{.end}bar');
  expect(code).toEqual([ROOT, 1, [
    [TEXT, 'foo'],
    [SECTION, ['a'], [], [OR_PREDICATE, 0, 0, [
      [TEXT, 'A']
    ], END]],
    [TEXT, 'bar']
  ], EOF]);

  ({ code } = parse('foo{.section a}{.or equal? b c}A{.end}bar'));
  expect(code).toEqual([ROOT, 1, [
    [TEXT, 'foo'],
    [SECTION, ['a'], [], [OR_PREDICATE, 'equal?', ['b', 'c'], [
      [TEXT, 'A']
    ], END]],
    [TEXT, 'bar']
  ], EOF]);
});


test('predicate', () => {
  let { code } = parse('foo{.equal? a b}A{.or greaterThan? c d}B{.end}bar');
  expect(code).toEqual([ROOT, 1, [
    [TEXT, 'foo'],
    [PREDICATE, 'equal?', ['a', 'b'], [
      [TEXT, 'A']
    ], [OR_PREDICATE, 'greaterThan?', ['c', 'd'], [
      [TEXT, 'B']
    ], END]],
    [TEXT, 'bar']
  ], EOF]);

  ({ code } = parse('foo{.equal?:a:"b c d"}A{.or}B{.end}bar'));
  expect(code).toEqual([ROOT, 1, [
    [TEXT, 'foo'],
    [PREDICATE, 'equal?', ['a', '\"b c d\"'], [
      [TEXT, 'A']
    ], [OR_PREDICATE, 0, 0, [
      [TEXT, 'B']
    ], END]],
    [TEXT, 'bar'],
  ], EOF]);

  ({ code } = parse('{.section}{.varied-prices?}A{.end}{.end}'));

  ({ code } = parse('{.equal?|}'));
  expect(code).toEqual([ROOT, 1, [[TEXT, '{.equal?|}']], EOF]);

  ({ code } = parse('{.**?}'));
  expect(code).toEqual([ROOT, 1, [[TEXT, '{.**?}']], EOF]);
});


test('repeated section', () => {
  let { code } = parse('{.repeated section a.b.c}A{.end}');
  expect(code).toEqual([ROOT, 1, [
    [REPEATED, ['a', 'b', 'c'], [[TEXT, 'A']], END, []]
  ], EOF]);

  ({ code } = parse('{.repeated section @items}A{.alternates with}---{.end}'));
  expect(code).toEqual([ROOT, 1, [
    [REPEATED, ['@items'], [[TEXT, 'A']], END, [[TEXT, '---']]]
  ], EOF]);

  ({ code } = parse('{.repeated section}'));
  expect(code).toEqual([ROOT, 1, [[TEXT, '{.repeated section}']], EOF]);

  ({ code } = parse('{.repeated section }'));
  expect(code).toEqual([ROOT, 1, [[TEXT, '{.repeated section }']], EOF]);

  ({ code } = parse('{.repeated section **}'));
  expect(code).toEqual([ROOT, 1, [[TEXT, '{.repeated section **}']], EOF]);

  ({ code } = parse('{.repeated section a.b**}'));
  expect(code).toEqual([ROOT, 1, [[TEXT, '{.repeated section a.b**}']], EOF]);
});


test('section', () => {
  let { code } = parse('{.section a.b.c}A{.end}');
  expect(code).toEqual([ROOT, 1, [
    [SECTION, ['a', 'b', 'c'], [
      [TEXT, 'A']
    ], END]
  ], EOF]);

  ({ code } = parse('{.section}'));
  expect(code).toEqual([ROOT, 1, [[TEXT, '{.section}']], EOF]);

  ({ code } = parse('{.section }'));
  expect(code).toEqual([ROOT, 1, [[TEXT, '{.section }']], EOF]);

  ({ code } = parse('{.section **}'));
  expect(code).toEqual([ROOT, 1, [[TEXT, '{.section **}']], EOF]);

  ({ code } = parse('{.section a.b**}'));
  expect(code).toEqual([ROOT, 1, [[TEXT, '{.section a.b**}']], EOF]);

});


test('variables', () => {
  let { code } = parse('{a, b, c|foo d e|bar}');
  expect(code).toEqual([ROOT, 1, [
    [VARIABLE, [['a'], ['b'], ['c']], [['foo', ['d', 'e']], ['bar']]]
  ], EOF]);

  ({ code } = parse('{values.Line1}'));
  expect(code).toEqual([ROOT, 1, [
    [VARIABLE, [['values', 'Line1']], 0]
  ], EOF]);

  ({ code } = parse('{a**}'));
  expect(code).toEqual([ROOT, 1, [[TEXT, '{a**}']], EOF]);

  ({ code } = parse('{a|**}'));
  expect(code).toEqual([ROOT, 1, [[TEXT, '{a|**}']], EOF]);
});
