import Context from '../src/context';
import Engine from '../src/engine';


test('literals', () => {
  const engine = new Engine();
  const inst = [17, 1, [
    14,
    [0, '\n'],
    12,
    [0, 'abc'],
    13,
    [0, '\n'],
    15,
    [0, '\n'],
    16
  ], 18];

  const ctx = new Context({});
  engine.execute(inst, ctx);
  expect(ctx.buf).toEqual('\n\n{abc}\n \n\t');
});


test('variables', () => {
  const engine = new Engine();
  const inst = [17, 1, [
    [0, 'a'],
    [1, ['bbb'], 0],
    [0, 'c\n'],
    [1, ['ddd'], 0],
    [0, 'e'],
    [1, ['fff'], 0]
  ], 18];

  const ctx = new Context({ 'bbb': '*', 'ddd': '-', 'fff': '+' });
  engine.execute(inst, ctx);
  expect(ctx.buf).toEqual('a*c\n-e+');
});


test('variables missing', () => {
  const engine = new Engine();
  const inst = [17, 1, [
    [0, 'a'],
    [1, ['b'], 0],
    [0, 'c']
  ], 18];
  const ctx = new Context({});
  engine.execute(inst, ctx);
  expect(ctx.buf).toEqual('ac');
});


test('variables with formatters', () => {
  const engine = new Engine();
  const inst = [17, 1, [
    [1, ['foo'], [['html']]],
    [0, '\n'],
    [1, ['bar'], [['truncate', ['5']], ['json']]],
    [0, '\n'],
    [1, ['baz'], [['json-pretty']]]
  ], 18];

  const ctx = new Context({
    foo: '<tag> & tag',
    bar: 'abcdefghijklmnopqrs',
    baz: { a: 1 }
  });
  engine.execute(inst, ctx);
  expect(ctx.buf).toEqual('&lt;tag&gt; &amp; tag\n"abcde"\n{\n  "a": 1\n}');
});


test('section', () => {
  const engine = new Engine();
  const inst = [17, 1, [
    [2, 'a', [
      [1, ['b'], 0],
    ], 3]
  ], 18];

  let ctx = new Context({ a: { b: 123 } });
  engine.execute(inst, ctx);
  expect(ctx.buf).toEqual('123');

  ctx = new Context({ x: { b: 123 } });
  engine.execute(inst, ctx);
  expect(ctx.buf).toEqual('');
});


test('repeated 1', () => {
  const engine = new Engine();
  const inst = [17, 1, [
    [4, 'items',
      [[0, 'a']],
      [7, 0, 0, [[0, 'b']], 3],
      [[0, '|']]
    ]
  ], 18];

  let ctx = new Context({ items: [0, 0, 0] });
  engine.execute(inst, ctx);
  expect(ctx.buf).toEqual('a|a|a');

  // Non-array, execute the OR branch
  ctx = new Context({ items: {} });
  engine.execute(inst, ctx);
  expect(ctx.buf).toEqual('b');
});


test('repeated 2', () => {
  const engine = new Engine();
  const inst = [17, 1, [
    [4, 'a', [
      [1, ['@'], ['iter']]
    ], 3]
  ], 18];

  const ctx = new Context({ a: [1, 2, 3] });
  engine.execute(inst, ctx);
  expect(ctx.buf).toEqual('123');
});


test('repeated 3', () => {
  const engine = new Engine();
  const inst = [17, 1, [
    [4, 'a', [
      [1, ['@'], 0]
    ]]
  ], 18];

  const ctx = new Context({ a: [1, null, 2, null, 3] });
  engine.execute(inst, ctx);
  expect(ctx.buf).toEqual('123');
});


test('repeated 4', () => {
  const engine = new Engine();
  const inst = [17, 1, [
    [4, 'a', [
      [0, 'A'],
      [2, 'b', [
        [0, '---']
      ], 3]],
    [7, 0, 0, [
      [0, 'B']
    ], 3], []]
  ], 18];

  let ctx = new Context({ a: [1, 2, 3], b: 1 });
  engine.execute(inst, ctx);
  expect(ctx.buf).toEqual('A---A---A---');

  ctx = new Context({ a: {}, b: 1 });
  engine.execute(inst, ctx);
  expect(ctx.buf).toEqual('B');
});


test('predicates', () => {
  const engine = new Engine();
  const inst = [17, 1, [
    [5, 'equal?', ['foo', 'bar'],
      [[0, 'equal']],
      [7,0,0,[
        [0, 'not equal']
      ], 3]
    ]
  ], 18];

  let ctx = new Context({ foo: 1, bar: 1 });
  engine.execute(inst, ctx);
  expect(ctx.buf).toEqual('equal');

  ctx = new Context({
    foo: { a: 1, b: [2, 3] },
    bar: { a: 1, b: [2, 3] },
  });
  engine.execute(inst, ctx);
  expect(ctx.buf).toEqual('equal');

  ctx = new Context({
    foo: { a: 1, b: [2, 3] },
    bar: { a: 1, b: [2, 4] },
  });
  engine.execute(inst, ctx);
  expect(ctx.buf).toEqual('not equal');
});


test('bindvar', () => {
  const engine = new Engine();
  const inst = [17, 1 ,[
    [6, '@foo', ['bar'], [['html']]],
    [6, '@baz', ['quux'], 0],
    [1, ['@foo'], 0],
    [1, ['@baz'], 0],
    [1, ['@missing'], 0]
  ], 18];

  const ctx = new Context({ bar: '<hi>', quux: '<bye>' });
  engine.execute(inst, ctx);
  expect(ctx.buf).toEqual('&lt;hi&gt;<bye>');
});


test('if', () => {
  const engine = new Engine();
  const inst = [17, 1, [
    [8, [1, 0], ['a', 'b', 'c'], [
      [1, ['a'], 0],
      [0, ' and '],
      [1, ['b'], 0]
    ], [7, 0, 0, [
      [0, 'or '],
      [1, ['c'], 0],
    ], 3]]
  ], 18];

  let ctx = new Context({ a: 'a', b: 'b', c: 0 });
  engine.execute(inst, ctx);
  expect(ctx.buf).toEqual('a and b');

  ctx = new Context({ a: 'a', b: 0, c: 'c' });
  engine.execute(inst, ctx);
  expect(ctx.buf).toEqual('or c');

  ctx = new Context({ a: 'a', b: 0, c: 0 });
  engine.execute(inst, ctx);
  expect(ctx.buf).toEqual('or 0');
});


test('inject', () => {
  const engine = new Engine();
  const inst = [17, 1, [
    [9, '@foo', 'file.html', 0],
    [1, ['@foo'], [['html']]]
  ], 18];
  const inject = {
    'file.html': '<b>file contents</b>'
  };
  const ctx = new Context({}, { injectables: inject });
  engine.execute(inst, ctx);
  expect(ctx.buf).toEqual('&lt;b&gt;file contents&lt;/b&gt;');
});


test('inject missing', () => {
  const engine = new Engine();
  const inst = [17, 1, [
    [9, '@foo', 'missing.html', 0],
    [1, ['@foo'], 0]
  ], 18];
  const inject = {
    'file.html': 'file contents',
  };

  const ctx = new Context({}, { injectables: inject });
  engine.execute(inst, ctx);
  expect(ctx.buf).toEqual('');
});


test('inject mapping empty', () => {
  const engine = new Engine();
  const inst = [17, 1, [
    [9, '@foo', 'file.html', 0],
    [1, ['@foo'], [['html']]]
  ], 18];
  const ctx = new Context({});
  engine.execute(inst, ctx);
  expect(ctx.buf).toEqual('');
});


test('macro', () => {
  const engine = new Engine();
  const inst = [17, 1, [
    // define macro
    [10, 'person.html', [
      [1, ['name'], 0],
      [0, ' is ' ],
      [1, ['status'], 0],
    ]],
    [10, 'unused.html', [
      [0, 'never called']
    ]],
    [2, 'person', [
      [1, ['@'], [[ 'apply', ['person.html']]]],
    ], 3]

  ], 18];

  const ctx = new Context({ person: { name: 'Betty', status: 'offline' } });
  engine.execute(inst, ctx);
  expect(ctx.buf).toEqual('Betty is offline');
});


test('macro not defined', () => {
  const engine = new Engine();
  const inst = [17, 1, [
    [2, 'person', [
      [1, ['@'], [[ 'apply', ['person.html']]]],
    ], 3]
  ], 18];

  const ctx = new Context({ person: { name: 'Betty', status: 'offline' } });
  engine.execute(inst, ctx);
  expect(ctx.buf).toEqual('');
});
