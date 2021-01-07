import { Assembler } from '../src/assembler';
import { Parser } from '../src/parser';
import { MatcherImpl } from '../src/matcher';
import { ReferenceScanner } from '../src/scan';
import { Formatters, Predicates } from '../src/plugins';

const MATCHER = new MatcherImpl('');

const parse = (str: string) => {
  const assembler = new Assembler();
  const parser = new Parser(str, assembler, MATCHER, Formatters, Predicates);
  parser.parse();
  return assembler.code();
};

const scan = (raw: string): any => {
  const s = new ReferenceScanner();
  s.extract(parse(raw));
  return s.collect();
};

test('basic', () => {
  let r = scan('Hello, {name}');
  expect(r.variables).toEqual([{name: null}]);

  r = scan('{.section foo}{.section bar}{baz}{.end}{.end}');
  expect(r.variables).toEqual([{foo: {bar: {baz: null}}}]);

  r = scan('{.var @foo bar.baz.2.quux}');
  expect(r.variables).toEqual([{'bar.baz.2.quux': null}]);

  r = scan('{.ctx @c a=foo.bar b=baz.quux}');
  expect(r.variables).toEqual([{ 'foo.bar': null, 'baz.quux': null }]);

  r = scan('{.macro foobar}{name} is {age}{.end}');
  expect(r.instructions).toEqual({ MACRO: 1, VARIABLE: 2, ROOT: 1, TEXT: 1 });
  expect(r.variables).toEqual([{ name: null, age: null }]);

  r = scan('{.equal? 1 2}A{.or}B{.end}');
  expect(r.instructions).toEqual({ PREDICATE: 1, OR_PREDICATE: 1, ROOT: 1, END: 1, TEXT: 2 });
  expect(r.variables).toEqual([{}]);
  expect(r.textBytes).toEqual(2);

  r = scan('{.repeated section foo}{bar}{.alternates with}---{.end}');
  expect(r.instructions).toEqual({ END: 1, REPEATED: 1, ROOT: 1, TEXT: 1, VARIABLE: 1 });
  expect(r.variables).toEqual([{foo: {bar: null}}]);
  expect(r.textBytes).toEqual(3);

  r = scan('{foo|datetime}{bar|json}');
  expect(r.formatters).toEqual({ datetime: 1, json: 1 });
  expect(r.variables).toEqual([{ foo: null, bar: null }]);

  r = scan('{foo}{foo.bar}{.section foo}{bar}{.end}');
  expect(r.variables).toEqual([{ 'foo.bar': null, foo: { bar: null }}]);
});

test('dupe names', () => {
  const r = scan('{.section name}foo{.end}{.section name}bar{.end}');
  expect(r.variables).toEqual([{name: {}}]);
});

test('unexpected', () => {
  const s = new ReferenceScanner();
  s.extract(undefined);
  const r = s.collect();
  expect(r.instructions).toEqual({});
  expect(r.variables).toEqual([{}]);
  expect(r.textBytes).toEqual(0);
});
