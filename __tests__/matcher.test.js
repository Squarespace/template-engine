import Matcher from '../src/matcher';

import {
  ALTERNATES_WITH,
  BINDVAR,
  END,
  IF,
  INJECT,
  MACRO,
  META_LEFT,
  META_RIGHT,
  NEWLINE,
  SECTION,
  REPEATED,
  SPACE,
  TAB,
} from '../src/opcodes';


/**
 * Setup a matcher, invoke a matching method, and ensure the
 * entire input was consumed.
 */
const match = (method, str, start) => {
  const m = new Matcher(str);
  m.set(start ? start : 0, str.length);
  const result = m[method].call(m);
  m.consume();
  return m.complete() ? result : null;
};


test('arguments', () => {
  const impl = 'matchArguments';

  expect(match(impl, ' foo bar')).toEqual(['foo', 'bar']);
  expect(match(impl, ':a b c:d e f')).toEqual(['a b c', 'd e f']);
  expect(match(impl, '0102030')).toEqual(['1', '2', '3', '']);

  expect(match(impl, '}foo}bar')).toEqual(null);
  expect(match(impl, '|abc|def')).toEqual(null);
});


test('definition', () => {
  const impl = 'matchDefinition';

  expect(match(impl, '@foo')).toEqual('@foo');

  expect(match(impl, 'foo.bar')).toEqual(null);
  expect(match(impl, '@@foo')).toEqual(null);
});


test('bindvar sequencing', () => {
  const str = '.var @foo bar|html|baz a b c';
  const m = new Matcher(str);
  m.set(1, str.length);

  expect(m.matchInstruction()).toEqual(BINDVAR);
  m.consume();

  expect(m.matchSpace()).toEqual(true);
  m.consume();

  expect(m.matchDefinition()).toEqual('@foo');
  m.consume();

  expect(m.matchSpace()).toEqual(true);
  m.consume();

  expect(m.matchVariables()).toEqual([['bar']]);
  m.consume();

  expect(m.matchFormatters()).toEqual([['html'], ['baz', ['a', 'b', 'c']]]);
  m.consume();

  expect(m.complete()).toEqual(true);
});


test('file path', () => {
  const impl = 'matchFilePath';

  expect(match(impl, './file.html')).toEqual('./file.html');
  expect(match(impl, './my-data.json')).toEqual('./my-data.json');
  expect(match(impl, './messages-en_US.yaml')).toEqual('./messages-en_US.yaml');

  expect(match(impl, '@file.html')).toEqual(null);
});


test('if expression', () => {
  const impl = 'matchIfExpression';

  expect(match(impl, ' a', 1)).toEqual([[], ['a']]);
  expect(match(impl, 'a')).toEqual([[], ['a']]);
  expect(match(impl, 'a || b')).toEqual([[0], ['a', 'b']]);
  expect(match(impl, 'a && b || c')).toEqual([[1, 0], ['a', 'b', 'c']]);

  expect(match(impl, 'a & b')).toEqual(null);
  expect(match(impl, 'a &&& b')).toEqual(null);
  expect(match(impl, 'a ||')).toEqual(null);
  expect(match(impl, '|| a')).toEqual(null);
  expect(match(impl, 'a &&')).toEqual(null);
  expect(match(impl, '&& a')).toEqual(null);
});


test('instruction', () => {
  const impl = 'matchInstruction';

  expect(match(impl, 'alternates with')).toEqual(ALTERNATES_WITH);
  expect(match(impl, 'end')).toEqual(END);
  expect(match(impl, 'if')).toEqual(IF);
  expect(match(impl, 'inject')).toEqual(INJECT);
  expect(match(impl, 'macro')).toEqual(MACRO);
  expect(match(impl, 'meta-left')).toEqual(META_LEFT);
  expect(match(impl, 'meta-right')).toEqual(META_RIGHT);
  expect(match(impl, 'newline')).toEqual(NEWLINE);
  expect(match(impl, 'section')).toEqual(SECTION);
  expect(match(impl, 'repeated section')).toEqual(REPEATED);
  expect(match(impl, 'space')).toEqual(SPACE);
  expect(match(impl, 'tab')).toEqual(TAB);
  expect(match(impl, 'var')).toEqual(BINDVAR);

  expect(match(impl, 'alternates  with')).toEqual(null);
  expect(match(impl, '!!')).toEqual(null);
});


test('predicate', () => {
  const impl = 'matchPredicate';

  expect(match(impl, 'equal?')).toEqual('equal?');
  expect(match(impl, 'greaterThanOrEqual?')).toEqual('greaterThanOrEqual?');

  expect(match(impl, 'greaterThanOrEqual')).toEqual(null);
});


test('section sequencing', () => {
  const str = '.section foo.bar';
  const m = new Matcher(str);
  m.set(1, str.length);

  expect(m.matchInstruction()).toEqual(SECTION);
  m.consume();

  expect(m.matchSpace()).toEqual(true);
  m.consume();

  expect(m.matchVariable()).toEqual(['foo', 'bar']);
  m.consume();

  expect(m.complete()).toEqual(true);
});


test('spaces', () => {
  let impl = 'matchSpace';

  expect(match(impl, ' ')).toEqual(true);

  expect(match(impl, '  ')).toEqual(null);
  expect(match(impl, '\t')).toEqual(null);

  impl = 'matchWhitespace';

  expect(match(impl, ' ')).toEqual(true);
  expect(match(impl, '  ')).toEqual(true);
  expect(match(impl, '\t\n \r\f\u000b')).toEqual(true);

  expect(match(impl, '\u00a0')).toEqual(null);
});


test('variable', () => {
  const impl = 'matchVariable';

  expect(match(impl, 'foo.bar')).toEqual(['foo', 'bar']);
  expect(match(impl, '0.a.2.c')).toEqual([0, 'a', 2, 'c']);

  expect(match(impl, 'foo.bar,')).toEqual(null);
  expect(match(impl, 'foo,bar,baz')).toEqual(null);
});


test('variables', () => {
  const impl = 'matchVariables';

  expect(match(impl, 'foo')).toEqual([['foo']]);
  expect(match(impl, 'foo,bar,baz')).toEqual([['foo'], ['bar'], ['baz']]);
  expect(match(impl, 'foo  ,  bar  ,  baz')).toEqual([['foo'], ['bar'], ['baz']]);
  expect(match(impl, '@foo,bar')).toEqual([['@foo'], ['bar']]);
  expect(match(impl, '$foo,$bar')).toEqual([['$foo'], ['$bar']]);
  expect(match(impl, '0.a,1.b')).toEqual([[0, 'a'], [1, 'b']]);

  expect(match(impl, '!')).toEqual(null);
  expect(match(impl, 'foo,$')).toEqual(null);
  expect(match(impl, 'foo,!!')).toEqual(null);
  expect(match(impl, 'foo,bar,')).toEqual(null);
});


test('formatters', () => {
  const impl = 'matchFormatters';

  expect(match(impl, '|html')).toEqual([['html']]);
  expect(match(impl, '|json-pretty')).toEqual([['json-pretty']]);

  // Chained
  expect(match(impl, '|foo|bar|json-pretty')).toEqual([['foo'], ['bar'], ['json-pretty']]);

  // Arguments
  expect(match(impl, '|foo a')).toEqual([['foo', ['a']]]);
  expect(match(impl, '|foo a b|bar c|baz')).toEqual([['foo', ['a', 'b']], ['bar', ['c']], ['baz']]);

  expect(match(impl, '|')).toEqual(null);
  expect(match(impl, 'html')).toEqual(null);
  expect(match(impl, '||html')).toEqual(null);
  expect(match(impl, '|html|')).toEqual(null);
  expect(match(impl, '|foo a b|bar a|')).toEqual(null);
});
