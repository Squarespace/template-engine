import Context from '../src/context';
import Engine from '../src/engine';

import {
  BINDVAR,
  END,
  EOF,
  IF,
  INJECT,
  MACRO,
  META_LEFT,
  META_RIGHT,
  NEWLINE,
  OR_PREDICATE,
  PREDICATE,
  REPEATED,
  ROOT,
  SECTION,
  SPACE,
  TAB,
  TEXT,
  VARIABLE,
} from '../src/opcodes';


test('literals', () => {
  const engine = new Engine();
  const inst = [ROOT, 1, [
    NEWLINE,
    [TEXT, '\n'],
    META_LEFT,
    [TEXT, 'abc'],
    META_RIGHT,
    [TEXT, '\n'],
    SPACE,
    [TEXT, '\n'],
    TAB
  ], EOF];

  const ctx = new Context({});
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('\n\n{abc}\n \n\t');
});


test('variables', () => {
  const engine = new Engine();
  const inst = [ROOT, 1, [
    [TEXT, 'a'],
    [VARIABLE, [['bbb']], 0],
    [TEXT, 'c\n'],
    [VARIABLE, [['ddd']], 0],
    [TEXT, 'e'],
    [VARIABLE, [['fff']], 0]
  ], EOF];

  const ctx = new Context({ 'bbb': '*', 'ddd': '-', 'fff': '+' });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('a*c\n-e+');
});


test('variables missing', () => {
  const engine = new Engine();
  const inst = [ROOT, 1, [
    [TEXT, 'a'],
    [VARIABLE, ['b'], 0],
    [TEXT, 'c']
  ], EOF];
  const ctx = new Context({});
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('ac');
});


test('variables with formatters', () => {
  const engine = new Engine();
  const inst = [ROOT, 1, [
    [VARIABLE, [['foo']], [['html']]],
    [TEXT, '\n'],
    [VARIABLE, [['bar']], [['truncate', ['5']], ['json']]],
    [TEXT, '\n'],
    [VARIABLE, [['baz']], [['json-pretty']]]
  ], EOF];

  const ctx = new Context({
    foo: '<tag> & tag',
    bar: 'abcdefghijklmnopqrs',
    baz: { a: 1 }
  });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('&lt;tag&gt; &amp; tag\n"abcde"\n{\n  "a": 1\n}');
});


test('section', () => {
  const engine = new Engine();
  const inst = [ROOT, 1, [
    [SECTION, 'a', [[VARIABLE, ['b'], 0]], END]
  ], EOF];

  let ctx = new Context({ a: { b: 123 } });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('123');

  ctx = new Context({ x: { b: 123 } });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('');
});


test('repeated 1', () => {
  const engine = new Engine();
  const inst = [ROOT, 1, [
    [REPEATED, ['items'],
      [[TEXT, 'a']],
      [OR_PREDICATE, 0, 0, [[TEXT, 'b']], 3],
      [[TEXT, '|']]
    ]
  ], EOF];

  let ctx = new Context({ items: [0, 0, 0] });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('a|a|a');

  // Non-array, execute the OR branch
  ctx = new Context({ items: {} });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('b');
});


test('repeated 2', () => {
  const engine = new Engine();
  const inst = [ROOT, 1, [
    [REPEATED, 'a', [[VARIABLE, ['@'], ['iter']]], END]
  ], EOF];

  const ctx = new Context({ a: [1, 2, 3] });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('123');
});


test('repeated 3', () => {
  const engine = new Engine();
  const inst = [ROOT, 1, [
    [REPEATED, 'a', [[VARIABLE, ['@'], 0]]]
  ], EOF];

  const ctx = new Context({ a: [1, null, 2, null, 3] });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('123');
});


test('repeated 4', () => {
  const engine = new Engine();
  const inst = [ROOT, 1, [
    [REPEATED, 'a', [
      [TEXT, 'A'],
      [SECTION, 'b', [
        [TEXT, '---']
      ], END]],
    [OR_PREDICATE, 0, 0, [
      [TEXT, 'B']
    ], END], []]
  ], EOF];

  let ctx = new Context({ a: [1, 2, 3], b: 1 });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('A---A---A---');

  ctx = new Context({ a: {}, b: 1 });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('B');
});


test('predicates', () => {
  const engine = new Engine();
  const inst = [ROOT, 1, [
    [PREDICATE, 'equal?', ['foo', 'bar'],
      [[TEXT, 'equal']],
      [OR_PREDICATE, 0, 0, [
        [TEXT, 'not equal']
      ], END]
    ]
  ], EOF];

  let ctx = new Context({ foo: 1, bar: 1 });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('equal');

  ctx = new Context({
    foo: { a: 1, b: [2, 3] },
    bar: { a: 1, b: [2, 3] },
  });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('equal');

  ctx = new Context({
    foo: { a: 1, b: [2, 3] },
    bar: { a: 1, b: [2, 4] },
  });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('not equal');
});


test('predicates missing', () => {
  const engine = new Engine();
  const inst = [ROOT, 1, [
    [TEXT, 'A'],
    [PREDICATE, 'missing?', ['foo'], [
      [TEXT, 'not executed'],
    ], END],
    [TEXT, 'B']
  ], EOF];

  const ctx = new Context({ foo: 1 });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('AB');
});


test('bindvar', () => {
  const engine = new Engine();
  const inst = [ROOT, 1, [
    [BINDVAR, '@foo', [['bar']], [['html']]],
    [BINDVAR, '@baz', [['quux']], 0],
    [VARIABLE, [['@foo']], 0],
    [VARIABLE, [['@baz']], 0],
    [VARIABLE, [['@missing']], 0]
  ], EOF];

  const ctx = new Context({ bar: '<hi>', quux: '<bye>' });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('&lt;hi&gt;<bye>');
});


test('if', () => {
  const engine = new Engine();
  const inst = [ROOT, 1, [
    [IF, [1, 0], ['a', 'b', 'c'], [
      [VARIABLE, ['a'], 0],
      [TEXT, ' and '],
      [VARIABLE, ['b'], 0]
    ], [OR_PREDICATE, 0, 0, [
      [TEXT, 'or '],
      [VARIABLE, ['c'], 0],
    ], END]]
  ], EOF];

  let ctx = new Context({ a: 'a', b: 'b', c: 0 });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('a and b');

  ctx = new Context({ a: 'a', b: 0, c: 'c' });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('or c');

  ctx = new Context({ a: 'a', b: 0, c: 0 });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('or 0');
});


test('if or', () => {
  const engine = new Engine();
  const inst = [ROOT, 1, [
    [IF, [0], ['a', 'b'], [[TEXT, 'A']],
      [OR_PREDICATE, 0, 0, [[TEXT, 'B']], END],
    ],
  ], EOF];

  let ctx = new Context({ a: 1, b: 1 });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('A');

  ctx = new Context({ a: 0, b: 1 });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('A');

  ctx = new Context({ a: 0, b: 0 });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('B');
});


test('inject', () => {
  const engine = new Engine();
  const inst = [ROOT, 1, [
    [INJECT, '@foo', 'file.html', 0],
    [VARIABLE, [['@foo']], [['html']]]
  ], EOF];
  const inject = {
    'file.html': '<b>file contents</b>'
  };

  const ctx = new Context({}, { injectables: inject });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('&lt;b&gt;file contents&lt;/b&gt;');
});


test('inject missing', () => {
  const engine = new Engine();
  const inst = [ROOT, 1, [
    [INJECT, '@foo', 'missing.html', 0],
    [VARIABLE, ['@foo'], 0]
  ], EOF];
  const inject = {
    'file.html': 'file contents',
  };

  const ctx = new Context({}, { injectables: inject });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('');
});


test('inject mapping empty', () => {
  const engine = new Engine();
  const inst = [ROOT, 1, [
    [INJECT, '@foo', 'file.html', 0],
    [VARIABLE, ['@foo'], [['html']]]
  ], EOF];
  const ctx = new Context({});
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('');
});


test('macro', () => {
  const engine = new Engine();
  const inst = [ROOT, 1, [
    [MACRO, 'person.html', [
      [VARIABLE, [['name']], 0],
      [TEXT, ' is ' ],
      [VARIABLE, [['status']], 0],
    ]],
    [MACRO, 'unused.html', [
      [TEXT, 'never called']
    ]],
    [SECTION, ['person'], [
      [VARIABLE, [['@']], [[ 'apply', ['person.html']]]],
    ], END]

  ], EOF];

  const ctx = new Context({ person: { name: 'Betty', status: 'offline' } });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('Betty is offline');
});


test('macro not defined', () => {
  const engine = new Engine();
  const inst = [ROOT, 1, [
    [SECTION, 'person', [
      [VARIABLE, [['@']], [[ 'apply', ['person.html']]]],
    ], END]
  ], EOF];

  const ctx = new Context({ person: { name: 'Betty', status: 'offline' } });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('');
});
