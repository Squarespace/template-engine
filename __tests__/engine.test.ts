import { join } from 'path';
import { Context, Partials } from '../src/context';
import { Engine, EngineProps } from '../src/engine';
import { Formatters, Predicates } from '../src/plugins';
import { Opcode as O } from '../src/opcodes';
import { TemplateTestLoader } from './loader';
import { AtomCode, Code, StructCode } from '../src/instructions';
import { ContextProps } from '../src/context';

const loader = new TemplateTestLoader(join(__dirname, 'resources'));
const newEngine = () => new Engine({ formatters: Formatters, predicates: Predicates });

test('literals', () => {
  const engine = newEngine();
  const inst: Code = [O.ROOT, 1, [
    O.NEWLINE,
    [O.TEXT, '\n'],
    O.META_LEFT,
    [O.TEXT, 'abc'],
    O.META_RIGHT,
    [O.TEXT, '\n'],
    O.SPACE,
    [O.TEXT, '\n'],
    O.TAB
  ], O.EOF];

  const ctx = new Context({});
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('\n\n{abc}\n \n\t');
});

test('coverage', () => {
  const c = new Context({});
  const engine = new Engine();
  engine.executeBlock(undefined as any as Code[], c);
});

test('variables', () => {
  const engine = newEngine();
  const inst: Code = [O.ROOT, 1, [
    [O.TEXT, 'a'],
    [O.VARIABLE, [['bbb']], 0],
    [O.TEXT, 'c\n'],
    [O.VARIABLE, [['ddd']], 0],
    [O.TEXT, 'e'],
    [O.VARIABLE, [['fff']], 0]
  ], O.EOF];

  const ctx = new Context({ 'bbb': '*', 'ddd': '-', 'fff': '+' });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('a*c\n-e+');
});

test('variable mixed array', () => {
  const engine = newEngine();
  const inst: Code = [O.ROOT, 1, [
    [O.VARIABLE, [['a']], 0]
  ], O.EOF];

  const ctx = new Context({ a: [1, null, 2, null, 3] });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('1,null,2,null,3');
});

test('variable mixed object', () => {
  const engine = newEngine();
  const inst: Code = [O.ROOT, 1, [
    [O.VARIABLE, [['a']], 0]
  ], O.EOF];

  const ctx = new Context({ a: { b: 1, c: null, d: false, e: 'foo' } });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('');
});

test('variables missing', () => {
  const engine = newEngine();
  const inst: Code = [O.ROOT, 1, [
    [O.TEXT, 'a'],
    [O.VARIABLE, [['b']], 0],
    [O.TEXT, 'c']
  ], O.EOF];
  const ctx = new Context({});
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('ac');
});

test('variables with formatters', () => {
  const engine = newEngine();
  const inst: Code = [O.ROOT, 1, [
    [O.VARIABLE, [['foo']], [['html']]],
    [O.TEXT, '\n'],
    [O.VARIABLE, [['bar']], [['truncate', [['5'], ' ']], ['json']]],
    [O.TEXT, '\n'],
    [O.VARIABLE, [['baz']], [['json-pretty']]]
  ], O.EOF];

  const ctx = new Context({
    foo: '<tag> & tag',
    bar: 'abcdefghijklmnopqrs',
    baz: { a: 1 }
  });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('&lt;tag&gt; &amp; tag\n"abcde..."\n{\n  "a": 1\n}');
});

test('variables missing formatters', () => {
  const engine = newEngine();
  const inst: Code = [O.ROOT, 1, [
    [O.VARIABLE, [['foo']], [['missing'], ['not-defined']]],
  ], O.EOF];

  const ctx = new Context({ foo: 'hello' });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('hello');
});

loader.paths('variables-%N.html').forEach(path => {
  test(`variables - ${path}`, () => loader.execute(path));
});

test('eval', () => {
  let inst: Code;
  let ctx: Context;
  const engine = newEngine();
  const opts: ContextProps = { enableExpr: false };

  inst = [O.ROOT, 1, [
    [O.EVAL, 'a.b + 2']
  ], O.EOF];

  // disabled expression evaluation
  ctx = new Context({ a: { b: 1 }}, opts);
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('');

  // enabled..
  opts.enableExpr = true;
  ctx = new Context({ a: { b: 1 }}, opts);
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('3');
  
  // error in expression
  inst = [O.ROOT, 1, [
    [O.EVAL, '"\\u"']
  ], O.EOF];
  ctx = new Context({}, opts);
  engine.execute(inst, ctx);
  expect(ctx.errors[0].message).toContain('unicode escape');
});

test('eval debug', () => {
  const engine = newEngine();
  const opts: ContextProps = { enableExpr: true };
  let inst: Code;
  let ctx: Context;
  let res: string;

  // evaluate with output
  inst = [O.ROOT, 1, [
    [O.EVAL, '# @a = min(2, b.c) ; @a * 7']
  ], O.EOF];
  ctx = new Context({ b: { c: 3 }}, opts);
  engine.execute(inst, ctx);
  res = ctx.render();
  expect(res).toEqual('EVAL=[[@a <args> 2 b.c min() <assign>], [@a 7 <multiply>]] -> 14');

  // evaluate with no output
  inst = [O.ROOT, 1, [
    [O.EVAL, '# @a = min(1, 2, 3)']
  ], O.EOF];
  ctx = new Context({}, opts);
  engine.execute(inst, ctx);
  res = ctx.render();
  expect(res).toEqual('EVAL=[[@a <args> 1 2 3 min() <assign>]]');
});

test('eval reuse', () => {
  // 2nd time the eval instruction is executed we reuse the parsed expression
  const engine = newEngine();
  const inst: Code = [O.ROOT, 1, [
    [O.REPEATED, ['items'], [
      [O.EVAL, '@a = @ + @'], 
      [O.VARIABLE, [['@a']], 0]
    ], O.END, []]
  ], O.EOF];

  let ctx = new Context({ items: ['A', 'B', 'C'] }, { enableExpr: true });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('AABBCC');
});

test('eval runtime errors', () => {
  const engine = newEngine();
  const opts: ContextProps = { enableExpr: true };
  let inst: Code;
  let ctx: Context;
  let res: string;

  // min() can't operate on strings
  inst = [O.ROOT, 1, [
    [O.EVAL, 'num()']
  ], O.EOF];
  ctx = new Context({ }, opts);
  engine.execute(inst, ctx);
  res = ctx.render();
  expect(res).toEqual('');
  expect(ctx.errors[0].message).toContain('Error calling function');
});

test('section', () => {
  const engine = newEngine();
  const inst: Code = [O.ROOT, 1, [
    [O.SECTION, ['a'], [[O.VARIABLE, [['b']], 0]], O.END]
  ], O.EOF];

  let ctx = new Context({ a: { b: 123 } });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('123');

  ctx = new Context({ x: { b: 123 } });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('');
});

test('section resolution', () => {
  const engine = newEngine();
  const inst: Code = [O.ROOT, 1, [
    [O.SECTION, ['a'], [
      [O.SECTION, ['x'], [
        [O.TEXT, 'foo']
      ], O.END],
      [O.TEXT, 'bar']
    ], O.END]
  ], O.EOF];

  const ctx = new Context({ a: 1, b: 2 });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('bar');
});

test('section empty', () => {
  const engine = newEngine();
  const inst: Code = [O.ROOT, 1, [
    [O.SECTION, ['x'], [
      [O.TEXT, 'hi']
    ], O.END]
  ], O.EOF];

  const ctx = new Context({ a: { b: 123 } });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('');
});

test('repeated 1', () => {
  const engine = newEngine();
  const inst: Code = [O.ROOT, 1, [
    [O.REPEATED, ['items'],
      [[O.TEXT, 'a']],
      [O.OR_PREDICATE, 0, 0, [[O.TEXT, 'b']], 3],
      [[O.TEXT, '|']]
    ]
  ], O.EOF];

  let ctx = new Context({ items: [0, 0, 0] });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('a|a|a');

  // Non-array, execute the OR branch
  ctx = new Context({ items: {} });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('b');
});

test('repeated 2', () => {
  const engine = newEngine();
  const inst: Code = [O.ROOT, 1, [
    [O.REPEATED, ['a'], [
      [O.VARIABLE, [['@']], [['iter']]]
    ], O.END, []]
  ], O.EOF];

  const ctx = new Context({ a: [1, 2, 3] });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('123');
});

test('repeated 3', () => {
  const engine = newEngine();
  const inst: Code = [O.ROOT, 1, [
    [O.REPEATED, ['a'], [
      [O.VARIABLE, [['@']], 0]], O.END, []]
  ], O.EOF];

  const ctx = new Context({ a: [1, null, 2, null, 3] });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('123');
});

test('repeated 4', () => {
  const engine = newEngine();
  const inst: Code = [O.ROOT, 1, [
    [O.REPEATED, ['a'], [
      [O.TEXT, 'A'],
      [O.SECTION, ['b'], [
        [O.TEXT, '---']
      ], O.END]],
    [O.OR_PREDICATE, 0, 0, [
      [O.TEXT, 'B']
    ], O.END], []]
  ], O.EOF];

  let ctx = new Context({ a: [{ b: 1 }, { b: 2 }, { b: 3 }] });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('A---A---A---');

  ctx = new Context({ a: {}, b: 1 });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('B');
});

test('repeated 5', () => {
  const engine = newEngine();
  const inst: Code = [O.ROOT, 1, [
    [O.REPEATED, ['a'], [
      [O.VARIABLE, [['@index']], 0],
      [O.VARIABLE, [['@index0']], 0],
      [O.VARIABLE, [['@']], 0],
    ], O.END, []]
  ], O.EOF];

  const ctx = new Context({ a: ['a', 'b', 'c'] });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('10a21b32c');
});

test('predicates', () => {
  const engine = newEngine();
  const inst: Code = [O.ROOT, 1, [
    [O.PREDICATE, 'equal?', [['foo', 'bar'], ' '],
      [[O.TEXT, 'equal']],
      [O.OR_PREDICATE, 0, 0, [
        [O.TEXT, 'not equal']
      ], O.END]
    ]
  ], O.EOF];

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

test('predicate without alternative', () => {
  const engine = newEngine();
  const inst: Code = [O.ROOT, 1, [
    [O.PREDICATE, 'equal?', [['foo', 'bar'], ' '],
      [[O.TEXT, 'equal']],
      undefined
    ]
  ], O.EOF];

  let ctx = new Context({ foo: 1, bar: 2 });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('');
});

test('predicates missing', () => {
  const engine = newEngine();
  const inst: Code = [O.ROOT, 1, [
    [O.TEXT, 'A'],
    [O.PREDICATE, 'missing?', [['foo'], ' '], [
      [O.TEXT, 'not executed'],
    ], O.END],
    [O.TEXT, 'B']
  ], O.EOF];

  const ctx = new Context({ foo: 1 });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('AB');
});

test('bindvar', () => {
  const engine = newEngine();
  const inst: Code = [O.ROOT, 1, [
    [O.BINDVAR, '@foo', [['bar']], [['html']]],
    [O.BINDVAR, '@baz', [['quux']], 0],
    [O.VARIABLE, [['@foo']], 0],
    [O.VARIABLE, [['@baz']], 0],
    [O.VARIABLE, [['@missing']], 0]
  ], O.EOF];

  const ctx = new Context({ bar: '<hi>', quux: '<bye>' });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('&lt;hi&gt;<bye>');
});

loader.paths('bindvar-%N.html').forEach(path => {
  test(`bindvar - ${path}`, () => loader.execute(path));
});

loader.paths('ctxvar-%N.html').forEach(path => {
  test(`ctxvar - ${path}`, () => loader.execute(path));
});

test('if', () => {
  const engine = newEngine();
  const inst: Code = [O.ROOT, 1, [
    [O.IF, [1, 0], [['a'], ['b'], ['c']], [
      [O.VARIABLE, [['a']], 0],
      [O.TEXT, ' and '],
      [O.VARIABLE, [['b']], 0]
    ], [O.OR_PREDICATE, 0, 0, [
      [O.TEXT, 'or '],
      [O.VARIABLE, [['c']], 0],
    ], O.END]]
  ], O.EOF];

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
  const engine = newEngine();
  const inst: Code = [O.ROOT, 1, [
    [O.IF, [0], [['a'], ['b']], [[O.TEXT, 'A']],
      [O.OR_PREDICATE, 0, 0, [[O.TEXT, 'B']], O.END],
    ],
  ], O.EOF];

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

test('if without alternative', () => {
  const engine = newEngine();
  const inst: Code = [O.ROOT, 1, [
    [O.IF, [0], [['a'], ['b']], 
      [[O.TEXT, 'A']],
      undefined,
    ],
  ], O.EOF];

  let ctx = new Context({ a: 0, b: 0 });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('');
});

test('include', () => {
  const engine = newEngine();
  let inst: Code = [O.ROOT, 1, [
    [O.INCLUDE, 'foo.html', 0],
    [O.VARIABLE, [['@a']], 0],
    [O.VARIABLE, [['b']], 0]
  ], O.EOF];

  // partial just defines a variable and outputs a string
  let partials: Partials = {
    'foo.html': [O.ROOT, 1, [
      [O.BINDVAR, '@a', [['a']], 0],
      [O.TEXT, 'the-string ']
    ], O.EOF]
  };

  // Same test but don't suppress the output
  let ctx = new Context({ a: 123, b: '!' }, { partials, enableInclude: true });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('123!');

  inst = [O.ROOT, 1, [
    [O.INCLUDE, 'foo.html', [['output'], ' ']],
    [O.VARIABLE, [['@a']], 0],
    [O.VARIABLE, [['b']], 0]
  ], O.EOF];

  ctx = new Context({ a: 123, b: '!' }, { partials, enableInclude: true });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('the-string 123!');

  // Use an evaluated expression to define the variable
  partials = {
    'foo.html': [O.ROOT, 1, [
      [O.EVAL, '@a = 123'],
      [O.TEXT, 'the-string ']
    ], O.EOF]
  };

  ctx = new Context({ b: '!' }, { partials, enableExpr: true, enableInclude: true });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('the-string 123!');
});

test('include macro', () => {
  const engine = newEngine();
  let inst: Code = [O.ROOT, 1, [
    [O.MACRO, 'foo.html', [
      [O.BINDVAR, '@a', [['a']], 0],
      [O.TEXT, 'hello']
    ]],
    [O.INCLUDE, 'foo.html', 0],
    [O.VARIABLE, [['@a']], 0],
    [O.VARIABLE, [['b']], 0]
  ], O.EOF];

  const ctx = new Context({ a: 123, b: '!' }, { enableInclude: true });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('123!');
});

test('include recursive', () => {
  const engine = newEngine();
  let inst: Code = [O.ROOT, 1, [
    [O.MACRO, 'foo.html', [
      [O.TEXT, 'A'],
      [O.INCLUDE, 'foo.html', [['output'], ' ']],
    ]],
    [O.INCLUDE, 'foo.html', [['output'], ' ']],
  ], O.EOF];

  const ctx = new Context({ }, { enableInclude: true });
  engine.execute(inst, ctx);
  // number of 'A' emitted equals maximum recursion depth
  expect(ctx.render()).toEqual('AAAAAAAAAAAAAAAA');
  expect(ctx.errors[0].message).toContain('maximum recursion');
});

test('include missing', () => {
  const engine = newEngine();
  const inst: Code = [O.ROOT, 1, [
    [O.INCLUDE, 'foo.html', [['output'], ' ']],
    [O.TEXT, 'abc']
  ], O.EOF]
  const partials: Partials = {
    'bar.html': ''
  };
  const ctx = new Context({ }, { partials, enableInclude: true });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('abc');
  expect(ctx.errors[0].message).toContain('Attempt to apply');
});

test('include disabled', () => {
  const engine = newEngine();
  const inst: Code = [O.ROOT, 1, [
    [O.INCLUDE, 'foo.html', [['output'], ' ']],
    [O.TEXT, 'abc']
  ], O.EOF]
  const partials: Partials = {
    'foo.html': [O.ROOT, 1, [
      [O.TEXT, 'the-string'],
    ], O.EOF]
  };
  const ctx = new Context({ }, { partials });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('abc');
});

test('inject', () => {
  const engine = newEngine();
  const inst: Code = [O.ROOT, 1, [
    [O.INJECT, '@foo', 'file.html', 0],
    [O.VARIABLE, [['@foo']], [['html']]]
  ], O.EOF];
  const injects = {
    'file.html': '<b>file contents</b>'
  };

  const ctx = new Context({}, { injects: injects });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('&lt;b&gt;file contents&lt;/b&gt;');
});

test('inject missing', () => {
  const engine = newEngine();
  const inst: Code = [O.ROOT, 1, [
    [O.INJECT, '@foo', 'missing.html', 0],
    [O.VARIABLE, [['@foo']], 0]
  ], O.EOF];
  const inject = {
    'file.html': 'file contents',
  };

  const ctx = new Context({}, { injects: inject });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('');
});

test('inject mapping empty', () => {
  const engine = newEngine();
  const inst: Code = [O.ROOT, 1, [
    [O.INJECT, '@foo', 'file.html', 0],
    [O.VARIABLE, [['@foo']], [['html']]]
  ], O.EOF];
  const ctx = new Context({});
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('');
});

loader.paths('inject-%N.html').forEach(path => {
  test(`inject - ${path}`, () => loader.execute(path));
});

test('macro', () => {
  const engine = newEngine();
  const inst: Code = [O.ROOT, 1, [
    [O.MACRO, 'person.html', [
      [O.VARIABLE, [['name']], 0],
      [O.TEXT, ' is ' ],
      [O.VARIABLE, [['status']], 0],
    ]],
    [O.MACRO, 'unused.html', [
      [O.TEXT, 'never called']
    ]],
    [O.SECTION, ['person'], [
      [O.VARIABLE, [['@']], [[ 'apply', [['person.html'], ' ']]]],
    ], O.END]

  ], O.EOF];

  const ctx = new Context({ person: { name: 'Betty', status: 'offline' } });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('Betty is offline');
});

test('macro not defined', () => {
  const engine = newEngine();
  const inst: Code = [O.ROOT, 1, [
    [O.SECTION, ['person'], [
      [O.VARIABLE, [['@']], [[ 'apply', [['person.html'], ' ']]]],
    ], O.END]
  ], O.EOF];

  const ctx = new Context({ person: { name: 'Betty', status: 'offline' } });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('');
});

test('struct', () => {
  const engine = newEngine();
  const inst: Code = [O.ROOT, 1, [
    [O.STRUCT, { custom: 'data' }, [
      [O.TEXT, 'hello']
    ]],
  ], O.EOF];
  const ctx = new Context({});
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('hello');
});

class CustomEngine extends Engine {

  constructor(props: EngineProps) {
    super(props);
    this.impls[O.ATOM] = this.executeAtom;
    this.impls[O.STRUCT] = this.executeStruct;
  }

  executeAtom(inst: Code, ctx: Context): void {
    const opaque = (inst as AtomCode)[1];
    ctx.append(`<!-- ${opaque.meta} -->`);
  }

  executeStruct(inst: Code, ctx: Context): void {
    const opaque = (inst as StructCode)[1];
    const buf = ctx.swapBuffer();
    super.executeBlock((inst as StructCode)[2], ctx);
    const text = ctx.render();
    ctx.restoreBuffer(buf);
    ctx.append(opaque.lowercase ? text.toLowerCase() : text);
  }
}

test('struct custom execution', () => {
  const inst: Code = [O.ROOT, 1, [
    [O.TEXT, 'A'],
    [O.ATOM, { meta: 'some metadata' }],
    [O.STRUCT, { lowercase: true }, [
      [O.TEXT, 'BCD'],
    ]],
    [O.TEXT, 'E']
  ], O.EOF];
  const engine = new CustomEngine({});
  const ctx = new Context({});
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('A<!-- some metadata -->bcdE');
});
