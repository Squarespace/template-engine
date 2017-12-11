import * as patterns from '../src/patterns';

const match = (raw, str, start) => {
  const pattern = new RegExp(raw, 'y');
  pattern.lastIndex = start ? start : 0;
  const value = pattern.exec(str);
  return value === null || pattern.lastIndex !== str.length ? null : value[0];
};

test('references', () => {
  const p = patterns.variableReference;

  expect(match(p, '   e', 3)).toEqual('e');

  // Matches starting at a particular offset.
  expect(match(p, '   foo.bar', 0)).toEqual(null);
  expect(match(p, '   foo.bar', -1)).toEqual(null);
  expect(match(p, '   foo.bar', 10)).toEqual(null);
  expect(match(p, '   foo.bar', 3)).toEqual('foo.bar');

  // Matches at the start of the string.
  expect(match(p, 'a')).toEqual('a');
  expect(match(p, 'a.b.c')).toEqual('a.b.c');
  expect(match(p, 'foo.bar.baz')).toEqual('foo.bar.baz');
  expect(match(p, '@')).toEqual('@');
  expect(match(p, '@index')).toEqual('@index');
  expect(match(p, '0')).toEqual('0');
  expect(match(p, '0.1')).toEqual('0.1');
  expect(match(p, '0.1.2.name')).toEqual('0.1.2.name');
  expect(match(p, '@foo.bar')).toEqual('@foo.bar');
  expect(match(p, '$foo.bar')).toEqual('$foo.bar');
  expect(match(p, '$foo.bar.$baz.$quux')).toEqual('$foo.bar.$baz.$quux');
  expect(match(p, 'foo.123.bar')).toEqual('foo.123.bar');

  // Invalid sequences
  expect(match(p, '.foo.bar')).toEqual(null);
  expect(match(p, '#foo.bar')).toEqual(null);
  expect(match(p, '!!')).toEqual(null);
  expect(match(p, '123foo')).toEqual(null);
  expect(match(p, '0 .foo')).toEqual(null);
  expect(match(p, '.0')).toEqual(null);
  expect(match(p, '0.')).toEqual(null);
  expect(match(p, 'abc.')).toEqual(null);
});

test('definitions', () => {
  const p = patterns.variableDefinition;

  expect(match(p, '   @foo', 0)).toEqual(null);
  expect(match(p, '   @foo', 3)).toEqual('@foo');

  expect(match(p, '@foo')).toEqual('@foo');

  expect(match(p, '@foo.bar')).toEqual(null);
  expect(match(p, '@foo.0')).toEqual(null);
  expect(match(p, '$foo')).toEqual(null);
  expect(match(p, 'foo')).toEqual(null);
  expect(match(p, 'foo.bar')).toEqual(null);
});

test('predicates', () => {
  const p = patterns.predicate;

  expect(match(p, 'equals?')).toEqual('equals?');
  expect(match(p, 'greaterThanOrEqual?')).toEqual('greaterThanOrEqual?');

  expect(match(p, '0?')).toEqual(null);
  expect(match(p, 'equals')).toEqual(null);
  expect(match(p, 'foo.bar')).toEqual(null);
});
