import * as patterns from '../src/patterns';

/* eslint-disable no-loop-func */

/**
 * Pattern matching by RegExp sticky.
 */
class FastPatterns {

  constructor(raw) {
    this.raw = raw;
  }

  match(str, start = 0) {
    const pattern = new RegExp(this.raw, 'y');
    pattern.lastIndex = start;
    const value = pattern.exec(str);
    return value === null || pattern.lastIndex !== str.length ? null : value[0];
  }
}

/**
 * Pattern matching by RegExp global + anchor-to-start + substring.
 */
class SlowPatterns {

  constructor(raw) {
    this.raw = raw;
  }

  match(str, start = 0) {

    const pattern = new RegExp('^' + this.raw, 'g');
    if (this.test(pattern, str, start)) {
      const end = start + pattern.lastIndex;
      if (end === str.length) {
        return str.substring(start, end);
      }
    }
    return null;
  }

  test(pattern, str, start = 0) {
    const tmp = str.substring(start);
    if (pattern.test(tmp)) {
      return true;
    }
    return false;
  }
}

const get = pattern => [
  { name: 'fast', impl: new FastPatterns(pattern) },
  { name: 'slow', impl: new SlowPatterns(pattern) }
];

for (const o of get(patterns.operator)) {
  test(`${o.name} operator`, () => {
    const p = o.impl;

    expect(p.match('||', 0)).toEqual('||');
    expect(p.match('   ||', 3)).toEqual('||');

    expect(p.match('&&', 0)).toEqual('&&');
    expect(p.match('   &&', 3)).toEqual('&&');

    expect(p.match('&^', 0)).toEqual(null);
    expect(p.match(' ^&', 1)).toEqual(null);
  });
}

for (const o of get(patterns.variableReference)) {
  test(`${o.name} references`, () => {
    const p = o.impl;

    expect(p.match('   e', 3)).toEqual('e');

    // Matches starting at a particular offset.
    expect(p.match('   foo.bar', 0)).toEqual(null);
    expect(p.match('   foo.bar', -1)).toEqual(null);
    expect(p.match('   foo.bar', 10)).toEqual(null);
    expect(p.match('   foo.bar', 3)).toEqual('foo.bar');

    // Matches at the start of the string.
    expect(p.match('a')).toEqual('a');
    expect(p.match('a.b.c')).toEqual('a.b.c');
    expect(p.match('foo.bar.baz')).toEqual('foo.bar.baz');
    expect(p.match('@')).toEqual('@');
    expect(p.match('@index')).toEqual('@index');
    expect(p.match('@index0')).toEqual('@index0');
    expect(p.match('0')).toEqual('0');
    expect(p.match('0.1')).toEqual('0.1');
    expect(p.match('0.1.2.name')).toEqual('0.1.2.name');
    expect(p.match('@foo.bar')).toEqual('@foo.bar');
    expect(p.match('$foo.bar')).toEqual('$foo.bar');
    expect(p.match('$foo.bar.$baz.$quux')).toEqual('$foo.bar.$baz.$quux');
    expect(p.match('foo.123.bar')).toEqual('foo.123.bar');

    // Invalid sequences
    expect(p.match('.foo.bar')).toEqual(null);
    expect(p.match('#foo.bar')).toEqual(null);
    expect(p.match('!!')).toEqual(null);
    expect(p.match('123foo')).toEqual(null);
    expect(p.match('0 .foo')).toEqual(null);
    expect(p.match('.0')).toEqual(null);
    expect(p.match('0.')).toEqual(null);
    expect(p.match('abc.')).toEqual(null);

  });
}

for (const o of get(patterns.variableDefinition)) {
  test(`${o.name} definitions`, () => {
    const p = o.impl;

    expect(p.match('   @foo', 0)).toEqual(null);
    expect(p.match('   @foo', 3)).toEqual('@foo');
    expect(p.match('@foo')).toEqual('@foo');
    expect(p.match('@foo.bar')).toEqual(null);
    expect(p.match('@foo.0')).toEqual(null);
    expect(p.match('$foo')).toEqual(null);
    expect(p.match('foo')).toEqual(null);
    expect(p.match('foo.bar')).toEqual(null);
  });
}

for (const o of get(patterns.predicate)) {
  test(`${o.name} predicates`, () => {
    const p = o.impl;

    expect(p.match('equals?')).toEqual('equals?');
    expect(p.match('greaterThanOrEqual?')).toEqual('greaterThanOrEqual?');
    expect(p.match('0?')).toEqual(null);
    expect(p.match('equals')).toEqual(null);
    expect(p.match('foo.bar')).toEqual(null);

  });
}
