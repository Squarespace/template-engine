import Assembler from '../src/assembler';
import Context from '../src/context';
import Engine from '../src/engine';
import Parser from '../src/parser';


const parse = (str) => {
  const assembler = new Assembler();
  const parser = new Parser(str, assembler);
  parser.parse();
  return { assembler, parser, code: assembler.code() };
};


test('degenerate cases', () => {
  let { code } = parse('a{b');
  expect(code).toEqual([17, 1, [
    [0, 'a{b']
  ], 18]);

  ({ code } = parse('{{{}{{}'));
  expect(code).toEqual([17, 1, [
    [0, '{{'],
    [0, '{}'],
    [0, '{'],
    [0, '{}']
  ], 18]);

  ({ code } = parse('{.end  }'));
  expect(code).toEqual([17, 1, [
    [0, '{.end  }']
  ], 18]);
});


test('parse and execute', () => {
  const { assembler, code } = parse('a{b}c{## comment\ncomment ##}d{e}f');

  expect(code).toEqual([17, 1, [
    [0, 'a'],
    [1, ['b'], 0],
    [0, 'c'],
    [11, ' comment\ncomment ', 1],
    [0, 'd'],
    [1, ['e'], 0],
    [0, 'f']
  ], 18]);

  const ctx = new Context({ b: '...', e: '---' });
  const engine = new Engine();
  engine.execute(assembler.code(), ctx);
  expect(ctx.render()).toEqual('a...cd---f');
});


test('bindvar', () => {
  let { code } = parse('abc{.var @foo bar}def');
  expect(code).toEqual([17, 1, [
    [0, 'abc'],
    [6, '@foo', ['bar'], 0],
    [0, 'def']
  ], 18]);

  ({ code } = parse('{.var @foo a, b|html}'));
  expect(code).toEqual([17, 1, [[6, '@foo', ['a', 'b'], [['html']]]], 18]);

  ({ code } = parse('{.var}'));
  expect(code).toEqual([17, 1, [[0, '{.var}']], 18]);

  ({ code } = parse('{.var+}'));
  expect(code).toEqual([17, 1, [[0, '{.var+}']], 18]);

  ({ code } = parse('{.var **}'));
  expect(code).toEqual([17, 1, [[0, '{.var **}']], 18]);

  ({ code } = parse('{.var @foo}'));
  expect(code).toEqual([17, 1, [[0, '{.var @foo}']], 18]);

  ({ code } = parse('{.var @foo+}'));
  expect(code).toEqual([17, 1, [[0, '{.var @foo+}']], 18]);

  ({ code } = parse('{.var @foo +}'));
  expect(code).toEqual([17, 1, [[0, '{.var @foo +}']], 18]);

  ({ code } = parse('{.var @foo bar }'));
  expect(code).toEqual([17, 1, [[0, '{.var @foo bar }']], 18]);
});


test('comments', () => {
  const { code } = parse('abc{# comment 1} {#comment 2}def');
  expect(code).toEqual([17, 1, [
    [0, 'abc'],
    [11, ' comment 1', 0],
    [0, ' '],
    [11, 'comment 2', 0],
    [0, 'def']
  ], 18]);
});


test('if', () => {
  let { code } = parse('{.if a}A{.end}');
  expect(code).toEqual([17,1, [
    [8, [], ['a'], [
      [0, 'A']
    ], 3]
  ], 18]);

  // Generates a PREDICATE instruction instead of an If
  ({ code } = parse('{.if equal?}A{.end}'));
  expect(code).toEqual([17, 1, [
    [5, 'equal?', 0, [
      [0, 'A']
    ], 3]
  ], 18]);

  ({ code } = parse('{.if}'));
  expect(code).toEqual([17, 1, [[0, '{.if}']], 18]);

  ({ code } = parse('{.if a**}'));
  expect(code).toEqual([17, 1, [[0, '{.if a**}']], 18]);

  ({ code } = parse('{.if a || **}'));
  expect(code).toEqual([17, 1, [[0, '{.if a || **}']], 18]);
});


test('inject', () => {
  let { code } = parse('abc{.inject @foo ./messages-en_US.json a b c}def');
  expect(code).toEqual([17, 1, [
    [0, 'abc'],
    [9, '@foo', './messages-en_US.json', 0], // arguments parsed but currently ignored
    [0, 'def']
  ], 18]);

  ({ code } = parse('{.inject @foo ./bar.json}'));
  expect(code).toEqual([17, 1, [[9, '@foo', './bar.json', 0]], 18]);

  ({ code } = parse('{.inject}'));
  expect(code).toEqual([17, 1, [[0, '{.inject}']], 18]);

  ({ code } = parse('{.inject }'));
  expect(code).toEqual([17, 1, [[0, '{.inject }']], 18]);

  ({ code } = parse('{.inject **}'));
  expect(code).toEqual([17, 1, [[0, '{.inject **}']], 18]);

  ({ code } = parse('{.inject @foo}'));
  expect(code).toEqual([17, 1, [[0, '{.inject @foo}']], 18]);

  ({ code } = parse('{.inject @foo+}'));
  expect(code).toEqual([17, 1, [[0, '{.inject @foo+}']], 18]);

  ({ code } = parse('{.inject @foo }'));
  expect(code).toEqual([17, 1, [[0, '{.inject @foo }']], 18]);

  ({ code } = parse('{.inject @foo **}'));
  expect(code).toEqual([17, 1, [[0, '{.inject @foo **}']], 18]);

  ({ code } = parse('{.inject @foo a b c|}'));
  expect(code).toEqual([17, 1, [[0, '{.inject @foo a b c|}']], 18]);
});


test('macro', () => {
  let { code } = parse('abc\n\t{.macro foo.html}{a.b.c}{.end}\ndef');
  expect(code).toEqual([17, 1, [
    [0, 'abc\n\t'],
    [10, 'foo.html', [
      [1, ['a.b.c'], 0]
    ]],
    [0, '\ndef']
  ], 18]);

  ({ code } = parse('{.macro}'));
  expect(code).toEqual([17, 1, [[0, '{.macro}']], 18]);

  ({ code } = parse('{.macro }'));
  expect(code).toEqual([17, 1, [[0, '{.macro }']], 18]);

  ({ code } = parse('{.macro **}'));
  expect(code).toEqual([17, 1, [[0, '{.macro **}']], 18]);

  ({ code } = parse('{.macro ./foo.json**}'));
  expect(code).toEqual([17, 1, [[0, '{.macro ./foo.json**}']], 18]);
});


test('multiline comments', () => {
  let { code } = parse('abc{##\ncomment ## comment\n##}def');
  expect(code).toEqual([17, 1, [
    [0, 'abc'],
    [11, '\ncomment ## comment\n', 1],
    [0, 'def']
  ], 18]);

  ({ code } = parse('{## foo bar ##'));
  expect(code).toEqual([17, 1, [
    [11, ' foo bar ##', 1]
  ], 18]);
});


test('or predicate', () => {
  let { code } = parse('foo{.section a}{.or}A{.end}bar');
  expect(code).toEqual([17, 1, [
    [0, 'foo'],
    [2, 'a', [], [7, 0, 0, [
      [0, 'A']
    ], 3]],
    [0, 'bar']
  ], 18]);

  ({ code } = parse('foo{.section a}{.or equal? b c}A{.end}bar'));
  expect(code).toEqual([17, 1, [
    [0, 'foo'],
    [2, 'a', [], [7, 'equal?', ['b', 'c'], [
      [0, 'A']
    ], 3]],
    [0, 'bar']
  ], 18]);
});


test('predicate', () => {
  let { code } = parse('foo{.equal? a b}A{.or greaterThan? c d}B{.end}bar');
  expect(code).toEqual([17, 1, [
    [0, 'foo'],
    [5, 'equal?', ['a', 'b'], [
      [0, 'A']
    ], [7, 'greaterThan?', ['c', 'd'], [
      [0, 'B']
    ], 3]],
    [0, 'bar']
  ], 18]);

  ({ code } = parse('foo{.equal?:a:"b c d"}A{.or}B{.end}bar'));
  expect(code).toEqual([17, 1, [
    [0, 'foo'],
    [5, 'equal?', ['a', '\"b c d\"'], [
      [0, 'A']
    ], [7, 0, 0, [
      [0, 'B']
    ], 3]],
    [0, 'bar'],
  ], 18]);

  ({ code } = parse('{.equal?|}'));
  expect(code).toEqual([17, 1, [[0, '{.equal?|}']], 18]);

  ({ code } = parse('{.**?}'));
  expect(code).toEqual([17, 1, [[0, '{.**?}']], 18]);
});


test('repeated section', () => {
  let { code } = parse('{.repeated section a.b.c}A{.end}');
  expect(code).toEqual([17, 1, [
    [4, 'a.b.c', [
      [0, 'A']
    ], 3, []]
  ], 18]);

  ({ code } = parse('{.repeated section @items}A{.alternates with}---{.end}'));
  expect(code).toEqual([17, 1, [
    [4, '@items', [
      [0, 'A']
    ], 3, [
      [0, '---']
    ]]
  ], 18]);

  ({ code } = parse('{.repeated section}'));
  expect(code).toEqual([17, 1, [[0, '{.repeated section}']], 18]);

  ({ code } = parse('{.repeated section }'));
  expect(code).toEqual([17, 1, [[0, '{.repeated section }']], 18]);

  ({ code } = parse('{.repeated section **}'));
  expect(code).toEqual([17, 1, [[0, '{.repeated section **}']], 18]);

  ({ code } = parse('{.repeated section a.b**}'));
  expect(code).toEqual([17, 1, [[0, '{.repeated section a.b**}']], 18]);
});


test('section', () => {
  let { code } = parse('{.section a.b.c}A{.end}');
  expect(code).toEqual([17, 1, [
    [2, 'a.b.c', [
      [0, 'A']
    ], 3]
  ], 18]);

  ({ code } = parse('{.section}'));
  expect(code).toEqual([17, 1, [[0, '{.section}']], 18]);

  ({ code } = parse('{.section }'));
  expect(code).toEqual([17, 1, [[0, '{.section }']], 18]);

  ({ code } = parse('{.section **}'));
  expect(code).toEqual([17, 1, [[0, '{.section **}']], 18]);

  ({ code } = parse('{.section a.b**}'));
  expect(code).toEqual([17, 1, [[0, '{.section a.b**}']], 18]);

});


test('variables', () => {
  let { code } = parse('{a, b, c|foo d e|bar}');
  expect(code).toEqual([17, 1, [
    [1, ['a', 'b', 'c'], [['foo', ['d', 'e']], ['bar']]]
  ], 18]);

  ({ code } = parse('{a**}'));
  expect(code).toEqual([17, 1, [[0, '{a**}']], 18]);

  ({ code } = parse('{a|**}'));
  expect(code).toEqual([17, 1, [[0, '{a|**}']], 18]);
});
