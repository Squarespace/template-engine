import { Assembler } from '../src/assembler';
import { Matcher, MatcherImpl } from '../src/matcher';
import { Parser } from '../src/parser';
import { Context } from '../src/context';
import { Opcode as O } from '../src/opcodes';
import { Sink } from '../src/sink';
import { FormatterMap, PredicateMap } from '../src/plugin';
import { Formatters, Predicates } from '../src/plugins';
import { Formatter } from '../src/plugin';
import { Variable } from '../src/variable';

class DummyFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context) {}
}

const DUMMY = new DummyFormatter();
const MATCHER = new MatcherImpl('');

const parse = (str: string, formatters: FormatterMap = {}, predicates: PredicateMap = {}) => {
  const assembler = new Assembler();
  const parser = new Parser(str, assembler, MATCHER, { ...formatters, ...Formatters }, { ...predicates, ...Predicates });
  parser.parse();
  return { assembler, parser, code: assembler.code() };
};

const parser = (str: string) => {
  const assembler = new Assembler();
  return new Parser(str, assembler, MATCHER, Formatters, Predicates);
};

test('initialization failures', () => {
  const matcher = undefined as unknown as Matcher;
  expect(() => new Parser('hello', {} as Sink, matcher)).toThrowError();
});

test('degenerate cases', () => {
  let { code } = parse('a{b');
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, 'a{b']], O.EOF]);

  ({ code } = parse('{{{}{{}'));
  expect(code).toEqual([
    O.ROOT,
    1,
    [
      [O.TEXT, '{{'],
      [O.TEXT, '{}'],
      [O.TEXT, '{'],
      [O.TEXT, '{}'],
    ],
    O.EOF,
  ]);

  ({ code } = parse('{.end  }'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.end  }']], O.EOF]);
});

test('bindvar', () => {
  let { code } = parse('abc{.var @foo bar}def');
  expect(code).toEqual([
    O.ROOT,
    1,
    [
      [O.TEXT, 'abc'],
      [O.BINDVAR, '@foo', [['bar']], 0],
      [O.TEXT, 'def'],
    ],
    O.EOF,
  ]);

  ({ code } = parse('{.var @foo a, b|html}'));
  expect(code).toEqual([O.ROOT, 1, [[O.BINDVAR, '@foo', [['a'], ['b']], [['html']]]], O.EOF]);

  // missing formatter
  ({ code } = parse('{.var @foo a, b|foo}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.var @foo a, b|foo}']], O.EOF]);

  ({ code } = parse('{.var}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.var}']], O.EOF]);

  ({ code } = parse('{.var+}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.var+}']], O.EOF]);

  ({ code } = parse('{.var **}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.var **}']], O.EOF]);

  ({ code } = parse('{.var @foo}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.var @foo}']], O.EOF]);

  ({ code } = parse('{.var @foo+}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.var @foo+}']], O.EOF]);

  ({ code } = parse('{.var @foo +}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.var @foo +}']], O.EOF]);

  ({ code } = parse('{.var @foo bar }'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.var @foo bar }']], O.EOF]);
});

test('comments', () => {
  const { code } = parse('abc{# comment 1} {#comment 2}def');
  expect(code).toEqual([
    O.ROOT,
    1,
    [
      [O.TEXT, 'abc'],
      [O.COMMENT, ' comment 1', 0],
      [O.TEXT, ' '],
      [O.COMMENT, 'comment 2', 0],
      [O.TEXT, 'def'],
    ],
    O.EOF,
  ]);
});

test('ctxvar', () => {
  let { code } = parse('{.ctx @foo key1=bar key2=baz.quux}');
  expect(code).toEqual([
    O.ROOT,
    1,
    [
      [
        O.CTXVAR,
        '@foo',
        [
          ['key1', ['bar']],
          ['key2', ['baz', 'quux']],
        ],
      ],
    ],
    O.EOF,
  ]);

  ({ code } = parse('{.ctx}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.ctx}']], O.EOF]);

  ({ code } = parse('{.ctx+}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.ctx+}']], O.EOF]);

  ({ code } = parse('{.ctx foo}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.ctx foo}']], O.EOF]);

  ({ code } = parse('{.ctx foo=}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.ctx foo=}']], O.EOF]);

  ({ code } = parse('{.ctx foo=a}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.ctx foo=a}']], O.EOF]);

  ({ code } = parse('{.ctx @foo}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.ctx @foo}']], O.EOF]);

  ({ code } = parse('{.ctx @foo a}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.ctx @foo a}']], O.EOF]);

  ({ code } = parse('{.ctx @foo a=}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.ctx @foo a=}']], O.EOF]);

  ({ code } = parse('{.ctx @foo a=b}'));
  expect(code).toEqual([O.ROOT, 1, [[O.CTXVAR, '@foo', [['a', ['b']]]]], O.EOF]);

  ({ code } = parse('{.ctx @foo a=b c}'));
  expect(code).toEqual([O.ROOT, 1, [[O.CTXVAR, '@foo', [['a', ['b']]]]], O.EOF]);

  ({ code } = parse('{.ctx @foo a=b c=}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.ctx @foo a=b c=}']], O.EOF]);

  ({ code } = parse('{.ctx @foo a=b c=d}'));
  expect(code).toEqual([
    O.ROOT,
    1,
    [
      [
        O.CTXVAR,
        '@foo',
        [
          ['a', ['b']],
          ['c', ['d']],
        ],
      ],
    ],
    O.EOF,
  ]);

  ({ code } = parse('{.ctx @foo a=b c=d.}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.ctx @foo a=b c=d.}']], O.EOF]);
});

test('eval', () => {
  let { code } = parse('{.eval}');
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.eval}']], O.EOF]);

  ({ code } = parse('{.eval1}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.eval1}']], O.EOF]);

  ({ code } = parse('{.eval }'));
  expect(code).toEqual([O.ROOT, 1, [[O.EVAL, '']], O.EOF]);

  ({ code } = parse('{.eval @foo}'));
  expect(code).toEqual([O.ROOT, 1, [[O.EVAL, '@foo']], O.EOF]);

  ({ code } = parse('{.eval 1 + 2 ; }'));
  expect(code).toEqual([O.ROOT, 1, [[O.EVAL, '1 + 2 ; ']], O.EOF]);

  ({ code } = parse('{.eval @foo ='));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.eval @foo =']], O.EOF]);

  ({ code } = parse('{.eval \n @foo = 1 ; \n @foo}'));
  expect(code).toEqual([O.ROOT, 1, [[O.EVAL, '@foo = 1 ; \n @foo']], O.EOF]);
});

test('eval coverage', () => {
  let p: Parser;
  let s: string;

  s = '.eval 1 + 1';
  p = parser(s);
  expect(p.parseInstruction(0, s.length)).toEqual(false);

  s = '.eval 1 + 1}';
  p = parser(s);
  expect(p.parseInstruction(0, s.length)).toEqual(true);
});

test('if', () => {
  let { code } = parse('{.if a.b}A{.end}');
  expect(code).toEqual([O.ROOT, 1, [[O.IF, [], [['a', 'b']], [[O.TEXT, 'A']], O.END]], O.EOF]);

  // Generates a PREDICATE instruction instead of an If
  ({ code } = parse('{.if equal?}A{.end}'));
  expect(code).toEqual([O.ROOT, 1, [[O.PREDICATE, 'equal?', 0, [[O.TEXT, 'A']], O.END]], O.EOF]);

  ({ code } = parse('{.if}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.if}']], O.EOF]);

  ({ code } = parse('{.if a**}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.if a**}']], O.EOF]);

  ({ code } = parse('{.if a || **}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.if a || **}']], O.EOF]);
});

test('include', () => {
  let { code } = parse('{.include foo.html suppress foo bar}');
  expect(code).toEqual([O.ROOT, 1, [[O.INCLUDE, 'foo.html', [['suppress', 'foo', 'bar'], ' ']]], O.EOF]);

  ({ code } = parse('{.include}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.include}']], O.EOF]);

  ({ code } = parse('{.include }'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.include }']], O.EOF]);

  ({ code } = parse('{.include a}'));
  expect(code).toEqual([O.ROOT, 1, [[O.INCLUDE, 'a', [[], ' ']]], O.EOF]);
});

test('inject', () => {
  let { code } = parse('abc{.inject @foo ./messages-en_US.json a b c}def');
  expect(code).toEqual([
    O.ROOT,
    1,
    [
      [O.TEXT, 'abc'],
      [O.INJECT, '@foo', './messages-en_US.json', [['a', 'b', 'c'], ' ']],
      [O.TEXT, 'def'],
    ],
    O.EOF,
  ]);

  ({ code } = parse('{.inject @foo ./bar.json}'));
  expect(code).toEqual([O.ROOT, 1, [[O.INJECT, '@foo', './bar.json', 0]], O.EOF]);

  ({ code } = parse('{.inject}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.inject}']], O.EOF]);

  ({ code } = parse('{.inject }'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.inject }']], O.EOF]);

  ({ code } = parse('{.inject **}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.inject **}']], O.EOF]);

  ({ code } = parse('{.inject @foo}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.inject @foo}']], O.EOF]);

  ({ code } = parse('{.inject @foo+}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.inject @foo+}']], O.EOF]);

  ({ code } = parse('{.inject @foo }'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.inject @foo }']], O.EOF]);

  ({ code } = parse('{.inject @foo **}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.inject @foo **}']], O.EOF]);

  ({ code } = parse('{.inject @foo a b c|}'));
  expect(code).toEqual([O.ROOT, 1, [[O.INJECT, '@foo', 'a', [['b', 'c|'], ' ']]], O.EOF]);
});

test('macro', () => {
  let { code } = parse('abc\n\t{.macro foo.html}{a.b.c}{.end}\ndef');
  expect(code).toEqual([
    O.ROOT,
    1,
    [
      [O.TEXT, 'abc\n\t'],
      [O.MACRO, 'foo.html', [[O.VARIABLE, [['a', 'b', 'c']], 0]]],
      [O.TEXT, '\ndef'],
    ],
    O.EOF,
  ]);

  ({ code } = parse('{.macro}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.macro}']], O.EOF]);

  ({ code } = parse('{.macro }'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.macro }']], O.EOF]);

  ({ code } = parse('{.macro **}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.macro **}']], O.EOF]);

  ({ code } = parse('{.macro ./foo.json**}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.macro ./foo.json**}']], O.EOF]);
});

test('multiline comments', () => {
  let { code } = parse('abc{##\ncomment ## comment\n##}def');
  expect(code).toEqual([
    O.ROOT,
    1,
    [
      [O.TEXT, 'abc'],
      [O.COMMENT, '\ncomment ## comment\n', 1],
      [O.TEXT, 'def'],
    ],
    O.EOF,
  ]);

  ({ code } = parse('{## foo bar ##'));
  expect(code).toEqual([O.ROOT, 1, [[O.COMMENT, ' foo bar ##', 1]], O.EOF]);
});

test('or predicate', () => {
  let { code } = parse('foo{.section a}{.or}A{.end}bar');
  expect(code).toEqual([
    O.ROOT,
    1,
    [
      [O.TEXT, 'foo'],
      [O.SECTION, ['a'], [], [O.OR_PREDICATE, 0, 0, [[O.TEXT, 'A']], O.END]],
      [O.TEXT, 'bar'],
    ],
    O.EOF,
  ]);

  ({ code } = parse('foo{.section a}{.or equal? b c}A{.end}bar'));
  expect(code).toEqual([
    O.ROOT,
    1,
    [
      [O.TEXT, 'foo'],
      [O.SECTION, ['a'], [], [O.OR_PREDICATE, 'equal?', [['b', 'c'], ' '], [[O.TEXT, 'A']], O.END]],
      [O.TEXT, 'bar'],
    ],
    O.EOF,
  ]);

  ({ code } = parse('{.or:}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.or:}']], O.EOF]);
});

test('predicate', () => {
  let { code } = parse('foo{.equal? a b}A{.or greaterThan? c d}B{.end}bar');
  expect(code).toEqual([
    O.ROOT,
    1,
    [
      [O.TEXT, 'foo'],
      [
        O.PREDICATE,
        'equal?',
        [['a', 'b'], ' '],
        [[O.TEXT, 'A']],
        [O.OR_PREDICATE, 'greaterThan?', [['c', 'd'], ' '], [[O.TEXT, 'B']], O.END],
      ],
      [O.TEXT, 'bar'],
    ],
    O.EOF,
  ]);

  ({ code } = parse('foo{.equal?:a:"b c d"}A{.or}B{.end}bar'));
  expect(code).toEqual([
    O.ROOT,
    1,
    [
      [O.TEXT, 'foo'],
      [O.PREDICATE, 'equal?', [['a', '"b c d"'], ':'], [[O.TEXT, 'A']], [O.OR_PREDICATE, 0, 0, [[O.TEXT, 'B']], O.END]],
      [O.TEXT, 'bar'],
    ],
    O.EOF,
  ]);

  ({ code } = parse('{.section}{.varied-prices?}A{.end}{.end}'));
  expect(code).toEqual([
    O.ROOT,
    1,
    [
      [O.TEXT, '{.section}'],
      [O.PREDICATE, 'varied-prices?', 0, [[O.TEXT, 'A']], O.END],
    ],
    O.EOF,
  ]);

  ({ code } = parse('{.equal?|}'));
  expect(code).toEqual([O.ROOT, 1, [[O.PREDICATE, 'equal?', [[], '|'], [], undefined]], O.END]);

  ({ code } = parse('{.**?}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.**?}']], O.EOF]);
});

test('repeated section', () => {
  let { code } = parse('{.repeated section a.b.c}A{.end}');
  expect(code).toEqual([O.ROOT, 1, [[O.REPEATED, ['a', 'b', 'c'], [[O.TEXT, 'A']], O.END, []]], O.EOF]);

  ({ code } = parse('{.repeated section @items}A{.alternates with}---{.end}'));
  expect(code).toEqual([O.ROOT, 1, [[O.REPEATED, ['@items'], [[O.TEXT, 'A']], O.END, [[O.TEXT, '---']]]], O.EOF]);

  ({ code } = parse('{.repeated section}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.repeated section}']], O.EOF]);

  ({ code } = parse('{.repeated section }'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.repeated section }']], O.EOF]);

  ({ code } = parse('{.repeated section **}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.repeated section **}']], O.EOF]);

  ({ code } = parse('{.repeated section a.b**}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.repeated section a.b**}']], O.EOF]);
});

test('section', () => {
  let { code } = parse('{.section a.b.c}A{.end}');
  expect(code).toEqual([O.ROOT, 1, [[O.SECTION, ['a', 'b', 'c'], [[O.TEXT, 'A']], O.END]], O.EOF]);

  ({ code } = parse('{.section}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.section}']], O.EOF]);

  ({ code } = parse('{.section }'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.section }']], O.EOF]);

  ({ code } = parse('{.section **}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.section **}']], O.EOF]);

  ({ code } = parse('{.section a.b**}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{.section a.b**}']], O.EOF]);
});

test('variables', () => {
  let { code } = parse('{a, b, c|foo d e|bar}', { foo: DUMMY, bar: DUMMY });
  expect(code).toEqual([O.ROOT, 1, [[O.VARIABLE, [['a'], ['b'], ['c']], [['foo', [['d', 'e'], ' ']], ['bar']]]], O.EOF]);

  ({ code } = parse('{a|foo|bar}', { foo: DUMMY, bar: DUMMY }));
  expect(code).toEqual([O.ROOT, 1, [[O.VARIABLE, [['a']], [['foo'], ['bar']]]], O.EOF]);

  // missing formatter
  ({ code } = parse('{a|foo|bar}', { foo: DUMMY }));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{a|foo|bar}']], O.EOF]);

  ({ code } = parse('{values.Line1}'));
  expect(code).toEqual([O.ROOT, 1, [[O.VARIABLE, [['values', 'Line1']], 0]], O.EOF]);

  ({ code } = parse('{a**}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{a**}']], O.EOF]);

  ({ code } = parse('{a|**}'));
  expect(code).toEqual([O.ROOT, 1, [[O.TEXT, '{a|**}']], O.EOF]);

  ({ code } = parse('{a.0.b.1.c}'));
  expect(code).toEqual([O.ROOT, 1, [[O.VARIABLE, [['a', 0, 'b', 1, 'c']], 0]], O.EOF]);
});
