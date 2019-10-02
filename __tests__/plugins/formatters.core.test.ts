import { join } from 'path';
import { TABLE as Core } from '../../src/plugins/formatters.core';
import { Context } from '../../src/context';
import { Engine } from '../../src/engine';
import { pathseq } from '../helpers';
import { TemplateTestLoader } from '../loader';
import { Opcode as O } from '../../src/opcodes';
import { RootCode } from '../../src/instructions';
import { Variable } from '../../src/variable';

const loader = new TemplateTestLoader(join(__dirname, 'resources'));
const variables = (...n: any[]) => n.map((v, i) => new Variable('var' + i, v));
const newEngine = () => new Engine({ formatters: Core });

const CTX = new Context({});

test('apply', () => {
  const engine = newEngine();
  const inst: RootCode = [O.ROOT, 1, [
    [O.TEXT, 'Hi, '],
    [O.VARIABLE, [['person']], [['apply', [['person.html'], ' ']]]]
  ], O.EOF];
  const partial: RootCode = [O.ROOT, 1, [
    [O.VARIABLE, [['name']], 0],
    [O.VARIABLE, [['sym']], 0]
  ], O.EOF];

  const node = { person: { name: 'User Name' }, sym: '!!' };
  const ctx = new Context(node, { partials: { 'person.html': partial } });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('Hi, User Name!!');
});

test('apply private scope', () => {
  const engine = newEngine();
  const inst: RootCode = [O.ROOT, 1, [
    [O.TEXT, 'Hi, '],
    [O.VARIABLE, [['person']], [['apply', [['person.html', 'private'], ' ']]]],
  ], O.EOF];
  const partial: RootCode = [O.ROOT, 1, [
    [O.VARIABLE, [['name']], 0],
    [O.VARIABLE, [['sym']], 0]
  ], O.EOF];

  const node = { person: { name: 'User Name' }, sym: '!!' };
  const ctx = new Context(node, { partials: { 'person.html': partial } });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('Hi, User Name');
});

test('apply missing partial', () => {
  const engine = newEngine();
  const inst: RootCode = [O.ROOT, 1, [
    [O.TEXT, 'Hi, '],
    [O.VARIABLE, [['person']], [['apply', [['missing.html'], ' ']]]],
  ], O.EOF];
  const partial: RootCode = [O.ROOT, 1, [
    [O.VARIABLE, [['name']], 0],
    [O.VARIABLE, [['sym']], 0]
  ], O.EOF];

  const node = { person: { name: 'User Name' } };
  const ctx = new Context(node, { partials: { 'person.html': partial } });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('Hi, ');
  expect(ctx.errors.length).toEqual(1);
  expect(ctx.errors[0].type).toEqual('engine');
  expect(ctx.errors[0].message).toContain('apply partial');
});

test('apply no arguments', () => {
  const engine = newEngine();
  const inst: RootCode = [O.ROOT, 1, [
    [O.TEXT, 'Hi, '],
    [O.VARIABLE, [['person']], [['apply']]],
  ], O.EOF];
  const partial: RootCode = [O.ROOT, 1, [
    [O.VARIABLE, [['name']], 0],
    [O.VARIABLE, [['sym']], 0]
  ], O.EOF];

  const node = { person: { name: 'User Name' } };
  const ctx = new Context(node, { partials: { 'person.html': partial } });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('Hi, ');
});

test('apply self recursion', () => {
  const engine = newEngine();
  const inst: RootCode = [O.ROOT, 1, [
    [O.VARIABLE, [['person']], [['apply', [['foo.html'], ' ']]]]
  ], O.EOF];
  const partial: RootCode = [O.ROOT, 1, [
    [O.VARIABLE, [['@']], [['apply', [['foo.html'], ' ']]]]
  ], O.EOF];

  const node = { person: { name: 'User Name' } };
  const ctx = new Context(node, { partials: { 'foo.html': partial } });
  engine.execute(inst, ctx);
  expect(ctx.errors.length).toEqual(1);
  expect(ctx.errors[0].type).toEqual('engine');
  expect(ctx.errors[0].message).toContain('Recursion into self');
});

test('apply max recursion depth', () => {
  const engine = newEngine();
  const inst: RootCode = [O.ROOT, 1, [
    [O.VARIABLE, [['person']], [['apply', [['partial-0.html'], ' ']]]]
  ], O.EOF];

  const partials: { [x: string]: RootCode } = {};
  for (let i = 0; i < 20; i++) {
    partials[`partial-${i}.html`] = [O.ROOT, 1, [
      [O.VARIABLE, [['@']], [['apply', [[`partial-${i + 1}.html`], ' ']]]]
    ], O.EOF];
  }

  const node = { person: { name: 'User Name' } };
  const ctx = new Context(node, { partials });
  engine.execute(inst, ctx);
  expect(ctx.errors.length).toEqual(1);
  expect(ctx.errors[0].type).toEqual('engine');
  expect(ctx.errors[0].message).toContain('recursion depth');
});

pathseq('f-apply-%N.html', 1).forEach(path => {
  test(`apply - ${path}`, () => loader.execute(path));
});

test('count', () => {
  let vars = variables([]);
  Core.count.apply([], vars, CTX);
  expect(vars[0].get()).toEqual(0);

  vars = variables([1, 2, 3]);
  Core.count.apply([], vars, CTX);
  expect(vars[0].get()).toEqual(3);

  vars = variables({});
  Core.count.apply([], vars, CTX);
  expect(vars[0].get()).toEqual(0);

  vars = variables({ a: 1, b: { c: 2 } });
  Core.count.apply([], vars, CTX);
  expect(vars[0].get()).toEqual(2);

  vars = variables(123);
  Core.count.apply([], vars, CTX);
  expect(vars[0].get()).toEqual(0);

  vars = variables('hello');
  Core.count.apply([], vars, CTX);
  expect(vars[0].get()).toEqual(0);

  vars = variables(true);
  Core.count.apply([], vars, CTX);
  expect(vars[0].get()).toEqual(0);
});

test('cycle', () => {
  const args = ['a', 'b', 'c'];

  let vars = variables(-4);
  Core.cycle.apply(args, vars, CTX);
  expect(vars[0].get()).toEqual('b');

  vars = variables(1);
  Core.cycle.apply(args, vars, CTX);
  expect(vars[0].get()).toEqual('a');

  vars = variables(2);
  Core.cycle.apply(args, vars, CTX);
  expect(vars[0].get()).toEqual('b');

  vars = variables(3);
  Core.cycle.apply(args, vars, CTX);
  expect(vars[0].get()).toEqual('c');

  vars = variables(4);
  Core.cycle.apply(args, vars, CTX);
  expect(vars[0].get()).toEqual('a');
});

test('encode-space', () => {
  const vars = variables(' \t\n ');
  Core['encode-space'].apply([], vars, CTX);
  expect(vars[0].get()).toEqual('&nbsp;&nbsp;&nbsp;&nbsp;');
});

test('encode-uri', () => {
  const vars = variables('<=%>');
  Core['encode-uri'].apply([], vars, CTX);
  expect(vars[0].get()).toEqual('%3C=%25%3E');
});

test('encode-uri-component', () => {
  const vars = variables('<=%>');
  Core['encode-uri-component'].apply([], vars, CTX);
  expect(vars[0].get()).toEqual('%3C%3D%25%3E');
});

test('format', () => {
  const msg = 'The {0} is {1}.';
  const ctx = new Context({ what: 'sky', color: 'bronze' });

  let vars = variables(msg);
  Core.format.apply(['what', 'color'], vars, ctx);
  expect(vars[0].get()).toEqual('The sky is bronze.');

  vars = variables(msg);
  Core.format.apply(['missing', 'none'], vars, ctx);
  expect(vars[0].get()).toEqual('The  is .');
});

pathseq('f-format-%N.html', 3).forEach(path => {
  test(`format - ${path}`, () => loader.execute(path));
});

test('html', () => {
  const vars = variables('"<foo & bar>"');
  Core.html.apply([], vars, CTX);
  expect(vars[0].get()).toEqual('"&lt;foo &amp; bar&gt;"');
});

const htmlattr = (name: string) => {
  const vars = variables('"<foo & bar>"');
  Core[name].apply([], vars, CTX);
  expect(vars[0].get()).toEqual('&quot;&lt;foo &amp; bar&gt;&quot;');
};

test('htmlattr', () => htmlattr('htmlattr'));

test('htmltag', () => htmlattr('htmltag'));

test('iter', () => {
  const vars = variables(' ');
  const ctx = new Context({ a: [1, 2, 3] });
  ctx.pushSection(['a']);
  ctx.initIteration();

  Core.iter.apply([], vars, ctx);
  ctx.pushNext();
  expect(vars[0].get()).toEqual('1');
  ctx.pop();

  ctx.frame().currentIndex++;
  ctx.pushNext();
  Core.iter.apply([], vars, ctx);
  ctx.pop();
  expect(vars[0].get()).toEqual('2');
});

test('json', () => {
  let vars = variables('foo bar');
  Core.json.apply([], vars, CTX);
  expect(vars[0].get()).toEqual('"foo bar"');

  vars = variables(['a', 2, 'c']);
  Core.json.apply([], vars, CTX);
  expect(vars[0].get()).toEqual('["a",2,"c"]');
});

pathseq('f-json-%N.html', 5).forEach(path => {
  test(`json - ${path}`, () => loader.execute(path));
});

test('json-pretty', () => {
  const vars = variables({ a: [1, 2] });
  Core['json-pretty'].apply([], vars, CTX);
  expect(vars[0].get()).toEqual('{\n  "a": [\n    1,\n    2\n  ]\n}');
});

pathseq('f-json-pretty-%N.html', 2).forEach(path => {
  test(`json pretty - ${path}`, () => loader.execute(path));
});

test('lookup', () => {
  const ctx = new Context({ key: 'a.b.c', a: { b: { c: 123 } } });
  ctx.pushSection(['a']);
  const vars = variables('key');
  Core.lookup.apply([], vars, ctx);
  expect(vars[0].get()).toEqual(123);
});

pathseq(`f-get-%N.html`, 5).forEach(path => {
  test(`get - ${path}`, () => loader.execute(path));
});

pathseq('f-macro-%N.html', 10).forEach(path => {
  test(`apply macro - ${path}`, () => loader.execute(path));
});

pathseq('f-macro-ctx-%N.html', 1).forEach(path => {
  test(`apply macro ctx - ${path}`, () => loader.execute(path));
});

test('output', () => {
  const vars = variables(' ');
  Core.output.apply(['a', 'b', 'c'], vars, CTX);
  expect(vars[0].get()).toEqual('a b c');
});

test('pluralize', () => {
  let vars = variables(1);
  Core.pluralize.apply([], vars, CTX);
  expect(vars[0].get()).toEqual('');

  vars = variables(1);
  Core.pluralize.apply(['x'], vars, CTX);
  expect(vars[0].get()).toEqual('');

  vars = variables(1);
  Core.pluralize.apply(['x', 'y'], vars, CTX);
  expect(vars[0].get()).toEqual('x');

  vars = variables(2);
  Core.pluralize.apply([], vars, CTX);
  expect(vars[0].get()).toEqual('s');

  vars = variables(2);
  Core.pluralize.apply(['x', 'y'], vars, CTX);
  expect(vars[0].get()).toEqual('y');
});

test('raw', () => {
  const vars = variables(3.14159);
  Core.raw.apply([], vars, CTX);
  expect(vars[0].get()).toEqual('3.14159');
});

test('round', () => {
  let vars = variables(1.44);
  Core.round.apply([], vars, CTX);
  expect(vars[0].get()).toEqual(1);

  vars = variables(1.6);
  Core.round.apply([], vars, CTX);
  expect(vars[0].get()).toEqual(2);
});

test('safe', () => {
  let vars = variables('foo <bar> bar');
  Core.safe.apply([], vars, CTX);
  expect(vars[0].get()).toEqual('foo  bar');

  vars = variables('<script\nsrc="url"\n>foobar</script>');
  Core.safe.apply([], vars, CTX);
  expect(vars[0].get()).toEqual('foobar');

  vars = variables('<div>\n<b>\nfoobar\n</b>\n</div>');
  Core.safe.apply([], vars, CTX);
  expect(vars[0].get()).toEqual('\n\nfoobar\n\n');

  vars = variables({});
  Core.safe.apply([], vars, CTX);
  expect(vars[0].get()).toEqual({});

  vars = variables({ a: '<div>foo</div>' });
  Core.safe.apply([], vars, CTX);
  expect(vars[0].get()).toEqual('{"a":"foo"}');
});

test('slugify', () => {
  let vars = variables('Next Total Eclipse on 20th of March 2015');
  Core.slugify.apply([], vars, CTX);
  expect(vars[0].get()).toEqual('next-total-eclipse-on-20th-of-march-2015');

  vars = variables('Value of PI is approx. 3.14159');
  Core.slugify.apply([], vars, CTX);
  expect(vars[0].get()).toEqual('value-of-pi-is-approx-314159');

  vars = variables('"1.2.3.4.5-()*&-foo.bar-baz');
  Core.slugify.apply([], vars, CTX);
  expect(vars[0].get()).toEqual('12345--foobar-baz');
});

test('smartypants', () => {
  let vars = variables('Fred\'s');
  Core.smartypants.apply([], vars, CTX);
  expect(vars[0].get()).toEqual('Fred\u2019s');

  vars = variables('"foo"');
  Core.smartypants.apply([], vars, CTX);
  expect(vars[0].get()).toEqual('\u201cfoo\u201d');
});

test('str', () => {
  const vars = variables(123.4);
  Core.str.apply([], vars, CTX);
  expect(vars[0].get()).toEqual('123.4');
});

test('truncate', () => {
  let str = 'abcdefg';
  let vars = variables(str);
  Core.truncate.apply(['5'], vars, CTX);
  expect(vars[0].get()).toEqual('abcde...');

  vars = variables(str);
  Core.truncate.apply(['5'], vars, CTX);
  expect(vars[0].get()).toEqual('abcde...');

  vars = variables(str);
  Core.truncate.apply([], vars, CTX);
  expect(vars[0].get()).toEqual(str);

  vars = variables(str);
  Core.truncate.apply(['100'], vars, CTX);
  expect(vars[0].get()).toEqual(str);

  vars = variables(str);
  Core.truncate.apply(['false'], vars, CTX);
  expect(vars[0].get()).toEqual(str);

  vars = variables(str);
  Core.truncate.apply(['-10'], vars, CTX);
  expect(vars[0].get()).toEqual(str);

  str = 'abc def ghi jkl';
  vars = variables(str);
  Core.truncate.apply(['10'], vars, CTX);
  expect(vars[0].get()).toEqual('abc def ...');
});

test('urlencode', () => {
  const vars = variables('\u201ca b\u201d');
  Core['url-encode'].apply([], vars, CTX);
  expect(vars[0].get()).toEqual('%E2%80%9Ca%20b%E2%80%9D');
});
