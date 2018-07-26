import Matcher from '../src/matcher';
import SlowMatcher from '../src/slowmatcher';

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

/* eslint-disable no-loop-func */

const matcher = (impl, method) => {
  return (str, start) => {
    const m = new impl(str);
    m.set(start ? start : 0, str.length);
    const result = m[method].call(m);
    m.consume();
    return m.complete() ? result : null;
  };
};

const MATCHERS = [
  { name: 'fast', impl: Matcher },
  { name: 'slow', impl: SlowMatcher }
];

for (const o of MATCHERS) {
  test(`${o.name} arguments`, () => {
    const match = matcher(o.impl, 'matchArguments');

    expect(match(' foo bar')).toEqual(['foo', 'bar']);
    expect(match(':a b c:d e f')).toEqual(['a b c', 'd e f']);
    expect(match('0102030')).toEqual(['1', '2', '3', '']);

    expect(match('}foo}bar')).toEqual(null);
    expect(match('|abc|def')).toEqual(null);

  });
}

for (const o of MATCHERS) {
  test(`${o.name} definition`, () => {
    const match = matcher(o.impl, 'matchDefinition');

    expect(match('@foo')).toEqual('@foo');
    expect(match('foo.bar')).toEqual(null);
    expect(match('@@foo')).toEqual(null);
  });
}

for (const o of MATCHERS) {
  test(`${o.name} bindvar sequencing`, () => {

    const str = '.var @foo bar|html|baz a b c';
    const m = new o.impl(str);
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
}

for (const o of MATCHERS) {
  test(`${o.name} file path`, () => {
    const match = matcher(o.impl, 'matchFilePath');

    expect(match('./file.html')).toEqual('./file.html');
    expect(match('./my-data.json')).toEqual('./my-data.json');
    expect(match('./messages-en_US.yaml')).toEqual('./messages-en_US.yaml');

    expect(match('@file.html')).toEqual(null);
  });
}

for (const o of MATCHERS) {
  test(`${o.name} if expression`, () => {
    const match = matcher(o.impl, 'matchIfExpression');

    expect(match(' a', 1)).toEqual([[], [['a']]]);
    expect(match('a')).toEqual([[], [['a']]]);
    expect(match('a || b')).toEqual([[0], [['a'], ['b']]]);
    expect(match('a && b || c')).toEqual([[1, 0], [['a'], ['b'], ['c']]]);
    expect(match('a.b && b.c || c.d')).toEqual([[1, 0], [['a', 'b'], ['b', 'c'], ['c', 'd']]]);
    expect(match('a & b')).toEqual(null);
    expect(match('a &&& b')).toEqual(null);
    expect(match('a ||')).toEqual(null);
    expect(match('|| a')).toEqual(null);
    expect(match('a &&')).toEqual(null);
    expect(match('&& a')).toEqual(null);
  });
}

for (const o of MATCHERS) {
  test(`${o.name} instruction`, () => {
    const match = matcher(o.impl, 'matchInstruction');

    expect(match('alternates with')).toEqual(ALTERNATES_WITH);
    expect(match('end')).toEqual(END);
    expect(match('if')).toEqual(IF);
    expect(match('inject')).toEqual(INJECT);
    expect(match('macro')).toEqual(MACRO);
    expect(match('meta-left')).toEqual(META_LEFT);
    expect(match('meta-right')).toEqual(META_RIGHT);
    expect(match('newline')).toEqual(NEWLINE);
    expect(match('section')).toEqual(SECTION);
    expect(match('repeated section')).toEqual(REPEATED);
    expect(match('space')).toEqual(SPACE);
    expect(match('tab')).toEqual(TAB);
    expect(match('var')).toEqual(BINDVAR);
    expect(match('alternates  with')).toEqual(null);
    expect(match('!!')).toEqual(null);
  });
}

for (const o of MATCHERS) {
  test(`${o.name} predicate`, () => {
    const match = matcher(o.impl, 'matchPredicate');

    expect(match('equal?')).toEqual('equal?');
    expect(match('greaterThanOrEqual?')).toEqual('greaterThanOrEqual?');
    expect(match('varied-prices?')).toEqual('varied-prices?');
    expect(match('greaterThanOrEqual')).toEqual(null);
  });
}

for (const o of MATCHERS) {
  test(`${o.name} section sequencing`, () => {
    const str = '.section foo.bar';
    const m = new o.impl(str);
    m.set(1, str.length);

    expect(m.matchInstruction()).toEqual(SECTION);
    m.consume();

    expect(m.matchSpace()).toEqual(true);
    m.consume();

    expect(m.matchVariable()).toEqual(['foo', 'bar']);
    m.consume();

    expect(m.complete()).toEqual(true);
  });
}

for (const o of MATCHERS) {
  test(`${o.name} spaces`, () => {
    let match = matcher(o.impl, 'matchSpace');

    expect(match(' ')).toEqual(true);

    expect(match('  ')).toEqual(null);
    expect(match('\t')).toEqual(null);

    match = matcher(o.impl, 'matchWhitespace');

    expect(match(' ')).toEqual(true);
    expect(match('  ')).toEqual(true);
    expect(match('\t\n \r\f\u000b')).toEqual(true);

    expect(match('\u00a0')).toEqual(null);
  });
}

for (const o of MATCHERS) {
  test(`${o.name} variable`, () => {
    const match = matcher(o.impl, 'matchVariable');

    expect(match('foo.bar')).toEqual(['foo', 'bar']);
    expect(match('0.a.2.c')).toEqual([0, 'a', 2, 'c']);
    expect(match('values.Line1')).toEqual(['values', 'Line1']);
    expect(match('foo.bar,')).toEqual(null);
    expect(match('foo,bar,baz')).toEqual(null);
  });
}

for (const o of MATCHERS) {
  test(`${o.name} variables`, () => {
    const match = matcher(o.impl, 'matchVariables');

    expect(match('foo')).toEqual([['foo']]);
    expect(match('foo,bar,baz')).toEqual([['foo'], ['bar'], ['baz']]);
    expect(match('foo  ,  bar  ,  baz')).toEqual([['foo'], ['bar'], ['baz']]);
    expect(match('@foo,bar')).toEqual([['@foo'], ['bar']]);
    expect(match('$foo,$bar')).toEqual([['$foo'], ['$bar']]);
    expect(match('0.a,1.b')).toEqual([[0, 'a'], [1, 'b']]);
    expect(match('!')).toEqual(null);
    expect(match('foo,$')).toEqual(null);
    expect(match('foo,!!')).toEqual(null);
    expect(match('foo,bar,')).toEqual(null);
  });
}

for (const o of MATCHERS) {
  test(`${o.name} formatters`, () => {
    const match = matcher(o.impl, 'matchFormatters');

    expect(match('|html')).toEqual([['html']]);
    expect(match('|json-pretty')).toEqual([['json-pretty']]);

    // Chained
    expect(match('|foo|bar|json-pretty')).toEqual([['foo'], ['bar'], ['json-pretty']]);

    // Arguments
    expect(match('|foo a')).toEqual([['foo', ['a']]]);
    expect(match('|foo a b|bar c|baz')).toEqual([['foo', ['a', 'b']], ['bar', ['c']], ['baz']]);

    expect(match('|')).toEqual(null);
    expect(match('html')).toEqual(null);
    expect(match('||html')).toEqual(null);
    expect(match('|html|')).toEqual(null);
    expect(match('|foo a b|bar a|')).toEqual(null);
  });
}
