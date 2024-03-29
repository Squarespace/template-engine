import { join } from 'path';
import { CORE_FORMATTERS as Core } from '../../src/plugins/formatters.core';
import { Context, Partials } from '../../src/context';
import { Engine } from '../../src/engine';
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
  const inst: RootCode = [
    O.ROOT,
    1,
    [
      [O.TEXT, 'Hi, '],
      [O.VARIABLE, [['person']], [['apply', [['person.html'], ' ']]]],
    ],
    O.EOF,
  ];
  const partial: RootCode = [
    O.ROOT,
    1,
    [
      [O.VARIABLE, [['name']], 0],
      [O.VARIABLE, [['sym']], 0],
    ],
    O.EOF,
  ];

  const node = { person: { name: 'User Name' }, sym: '!!' };
  const ctx = new Context(node, { partials: { 'person.html': partial } });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('Hi, User Name!!');
});

test('apply private scope', () => {
  const engine = newEngine();
  const inst: RootCode = [
    O.ROOT,
    1,
    [
      [O.TEXT, 'Hi, '],
      [O.VARIABLE, [['person']], [['apply', [['person.html', 'private'], ' ']]]],
    ],
    O.EOF,
  ];
  const partial: RootCode = [
    O.ROOT,
    1,
    [
      [O.VARIABLE, [['name']], 0],
      [O.VARIABLE, [['sym']], 0],
    ],
    O.EOF,
  ];

  const node = { person: { name: 'User Name' }, sym: '!!' };
  const ctx = new Context(node, { partials: { 'person.html': partial } });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('Hi, User Name');
});

test('apply missing partial', () => {
  const engine = newEngine();
  const inst: RootCode = [
    O.ROOT,
    1,
    [
      [O.TEXT, 'Hi, '],
      [O.VARIABLE, [['person']], [['apply', [['missing.html'], ' ']]]],
    ],
    O.EOF,
  ];
  const partial: RootCode = [
    O.ROOT,
    1,
    [
      [O.VARIABLE, [['name']], 0],
      [O.VARIABLE, [['sym']], 0],
    ],
    O.EOF,
  ];

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
  const inst: RootCode = [
    O.ROOT,
    1,
    [
      [O.TEXT, 'Hi, '],
      [O.VARIABLE, [['person']], [['apply']]],
    ],
    O.EOF,
  ];
  const partial: RootCode = [
    O.ROOT,
    1,
    [
      [O.VARIABLE, [['name']], 0],
      [O.VARIABLE, [['sym']], 0],
    ],
    O.EOF,
  ];

  const node = { person: { name: 'User Name' } };
  const ctx = new Context(node, { partials: { 'person.html': partial } });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('Hi, ');
});

test('apply no parsefunc', () => {
  const engine = newEngine();
  const inst: RootCode = [
    O.ROOT,
    1,
    [
      [O.TEXT, 'Hi, '],
      [O.VARIABLE, [['person']], [['apply', [['person.html'], ' ']]]],
    ],
    O.EOF,
  ];
  const partials: Partials = {
    'person.html': '{name}{sym}',
  };

  const node = { person: { name: 'User Name', sym: '!' } };
  // This context doesn't define a parse function, so has no way of parsing
  // a string into a partial template.
  const ctx = new Context(node, { partials });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('Hi, ');
  expect(ctx.errors[0].message).toContain('apply partial');
});

test('apply self recursion', () => {
  const engine = newEngine();
  const inst: RootCode = [O.ROOT, 1, [[O.VARIABLE, [['person']], [['apply', [['foo.html'], ' ']]]]], O.EOF];
  const partial: RootCode = [O.ROOT, 1, [[O.VARIABLE, [['@']], [['apply', [['foo.html'], ' ']]]]], O.EOF];

  const node = { person: { name: 'User Name' } };
  const ctx = new Context(node, { partials: { 'foo.html': partial } });
  engine.execute(inst, ctx);
  expect(ctx.errors.length).toEqual(1);
  expect(ctx.errors[0].type).toEqual('engine');
  // self-recursion is now allowed but limited to max recursion depth
  expect(ctx.errors[0].message).toContain('exceeded maximum recursion depth');
});

test('apply max recursion depth', () => {
  const engine = newEngine();
  const inst: RootCode = [O.ROOT, 1, [[O.VARIABLE, [['person']], [['apply', [['partial-0.html'], ' ']]]]], O.EOF];

  const partials: { [x: string]: RootCode } = {};
  for (let i = 0; i < 20; i++) {
    partials[`partial-${i}.html`] = [O.ROOT, 1, [[O.VARIABLE, [['@']], [['apply', [[`partial-${i + 1}.html`], ' ']]]]], O.EOF];
  }

  const node = { person: { name: 'User Name' } };
  const ctx = new Context(node, { partials });
  engine.execute(inst, ctx);
  expect(ctx.errors.length).toEqual(1);
  expect(ctx.errors[0].type).toEqual('engine');
  expect(ctx.errors[0].message).toContain('recursion depth');
});

loader.paths('f-apply-%N.html').forEach((path) => {
  test(`apply - ${path}`, () => loader.execute(path));
});

loader.paths('f-count-%N.html').forEach((path) => {
  test(`count - ${path}`, () => loader.execute(path));
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

loader.paths('f-cycle-%N.html').forEach((path) => {
  test(`cycle - ${path}`, () => loader.execute(path));
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

loader.paths('f-encode-space-%N.html').forEach((path) => {
  test(`encode-space - ${path}`, () => loader.execute(path));
});

test('encode-space', () => {
  const vars = variables(' \t\n ');
  Core['encode-space'].apply([], vars, CTX);
  expect(vars[0].get()).toEqual('&nbsp;&nbsp;&nbsp;&nbsp;');
});

loader.paths('f-encode-uri-%N.html').forEach((path) => {
  test(`encode-uri - ${path}`, () => loader.execute(path));
});

test('encode-uri', () => {
  const vars = variables('<=%>');
  Core['encode-uri'].apply([], vars, CTX);
  expect(vars[0].get()).toEqual('%3C=%25%3E');
});

loader.paths('f-encode-uri-component-%N.html').forEach((path) => {
  test(`encode-uri-component - ${path}`, () => loader.execute(path));
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

loader.paths('f-format-%N.html').forEach((path) => {
  test(`format - ${path}`, () => loader.execute(path));
});

loader.paths('f-html-%N.html').forEach((path) => {
  test(`html - ${path}`, () => loader.execute(path));
});

test('html', () => {
  const vars = variables('"<foo & bar>"');
  Core.html.apply([], vars, CTX);
  expect(vars[0].get()).toEqual('"&lt;foo &amp; bar&gt;"');
});

loader.paths('f-htmlattr-%N.html').forEach((path) => {
  test(`htmlattr - ${path}`, () => loader.execute(path));
});

const htmlattr = (name: string) => {
  const vars = variables('"<foo & bar>"');
  Core[name].apply([], vars, CTX);
  expect(vars[0].get()).toEqual('&quot;&lt;foo &amp; bar&gt;&quot;');
};

test('htmlattr', () => htmlattr('htmlattr'));

loader.paths('f-htmltag-%N.html').forEach((path) => {
  test(`htmltag - ${path}`, () => loader.execute(path));
});

test('htmltag', () => htmlattr('htmltag'));

loader.paths('f-iter-%N.html').forEach((path) => {
  test(`iter - ${path}`, () => loader.execute(path));
});

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

loader.paths('f-json-%N.html').forEach((path) => {
  test(`json - ${path}`, () => loader.execute(path));
});

test('json-pretty', () => {
  let vars = variables({ a: [1, 2] });
  Core['json-pretty'].apply([], vars, CTX);
  expect(vars[0].get()).toEqual('{\n  "a": [\n    1,\n    2\n  ]\n}');

  vars = variables(undefined);
  Core['json-pretty'].apply([], vars, CTX);
  expect(vars[0].get()).toEqual('');
});

loader.paths('f-json-pretty-%N.html').forEach((path) => {
  test(`json pretty - ${path}`, () => loader.execute(path));
});

test('key-by', () => {
  let vars = variables([{ id: 1 }]);
  Core['key-by'].apply([], vars, CTX);
  expect(vars[0].get()).toEqual({});

  vars = variables({});
  Core['key-by'].apply(['id'], vars, CTX);
  expect(vars[0].get()).toEqual({});

  vars = variables([]);
  Core['key-by'].apply(['id'], vars, CTX);
  expect(vars[0].get()).toEqual({});

  vars = variables([{ id: 1 }, { id: 2 }, { invalid: 4 }]);
  Core['key-by'].apply(['id'], vars, CTX);
  expect(vars[0].get()).toEqual({
    1: { id: 1 },
    2: { id: 2 },
  });

  vars = variables([{ test: [{ deep: 1 }] }, { test: [{ deep: 2 }] }]);
  Core['key-by'].apply(['test.0.deep'], vars, CTX);
  expect(vars[0].get()).toEqual({
    1: { test: [{ deep: 1 }] },
    2: { test: [{ deep: 2 }] },
  });
});

loader.paths('f-key-by-%N.html').forEach((path) => {
  test(`key-by - ${path}`, () => loader.execute(path));
});

loader.paths('f-lookup-%N.html').forEach((path) => {
  test(`lookup - ${path}`, () => loader.execute(path));
});

test('lookup', () => {
  const ctx = new Context({ key: 'a.b.c', a: { b: { c: 123 } } });
  const vars = variables({});
  Core.lookup.apply(['key'], vars, ctx);
  expect(vars[0].get()).toEqual(123);

  Core.lookup.apply([''], vars, ctx);
  expect(vars[0].get()).toEqual('');
});

loader.paths('f-mod-%N.html').forEach((path) => {
  test(`mod - ${path}`, () => loader.execute(path));
});

test('mod', () => {
  const ctx = new Context({});
  let vars = variables(11);
  Core.mod.apply(['3'], vars, ctx);
  expect(vars[0].get()).toEqual(2);

  vars = variables(12);
  Core.mod.apply(['3'], vars, ctx);
  expect(vars[0].get()).toEqual(0);

  vars = variables(13);
  Core.mod.apply(['3'], vars, ctx);
  expect(vars[0].get()).toEqual(1);

  // default to mod 2
  vars = variables(3);
  Core.mod.apply([], vars, ctx);
  expect(vars[0].get()).toEqual(1);

  // bad modulus, default to mod 2
  vars = variables(3);
  Core.mod.apply(['foo'], vars, ctx);
  expect(vars[0].get()).toEqual(1);

  // non-number argument
  vars = variables({ foo: 'bar' });
  Core.mod.apply(['3'], vars, ctx);
  expect(vars[0].get()).toEqual(0);
});

loader.paths(`f-get-%N.html`).forEach((path) => {
  test(`get - ${path}`, () => loader.execute(path));
});

loader.paths('f-macro-%N.html').forEach((path) => {
  test(`apply macro - ${path}`, () => loader.execute(path));
});

loader.paths('f-macro-ctx-%N.html').forEach((path) => {
  test(`apply macro ctx - ${path}`, () => loader.execute(path));
});

loader.paths('f-output-%N.html').forEach((path) => {
  test(`output - ${path}`, () => loader.execute(path));
});

test('output', () => {
  const vars = variables(' ');
  Core.output.apply(['a', 'b', 'c'], vars, CTX);
  expect(vars[0].get()).toEqual('a b c');
});

loader.paths('f-plural-%N.html').forEach((path) => {
  test(`plural - ${path}`, () => loader.execute(path));
});

loader.paths('f-pluralize-%N.html').forEach((path) => {
  test(`pluralize - ${path}`, () => loader.execute(path));
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

loader.paths(`f-prop-%N.html`).forEach((path) => {
  test(`prop - ${path}`, () => loader.execute(path));
});

test('prop', () => {
  let vars = variables({ foo: 123 });
  Core.prop.apply(['foo'], vars, CTX);
  expect(vars[0].get()).toEqual(123);

  vars = variables({ bar: '123' });
  Core.prop.apply(['bar'], vars, CTX);
  expect(vars[0].get()).toEqual('123');

  vars = variables({ bar: '123' });
  Core.prop.apply(['foo'], vars, CTX);
  expect(vars[0].get()).toEqual(null);

  vars = variables({ bar: '123' });
  Core.prop.apply(['bar', 'quux'], vars, CTX);
  expect(vars[0].get()).toEqual(null);

  vars = variables({});
  Core.prop.apply(['foo', 'bar'], vars, CTX);
  expect(vars[0].get()).toEqual(null);
});

loader.paths(`f-raw-%N.html`).forEach((path) => {
  test(`raw - ${path}`, () => loader.execute(path));
});

test('raw', () => {
  const vars = variables(3.14159);
  Core.raw.apply([], vars, CTX);
  expect(vars[0].get()).toEqual('3.14159');
});

loader.paths(`f-round-%N.html`).forEach((path) => {
  test(`round - ${path}`, () => loader.execute(path));
});

test('round', () => {
  let vars = variables(1.44);
  Core.round.apply([], vars, CTX);
  expect(vars[0].get()).toEqual(1);

  vars = variables(1.6);
  Core.round.apply([], vars, CTX);
  expect(vars[0].get()).toEqual(2);
});

loader.paths(`f-safe-%N.html`).forEach((path) => {
  test(`safe - ${path}`, () => loader.execute(path));
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

  vars = variables('<div>foo</div>');
  Core.safe.apply([], vars, CTX);
  expect(vars[0].get()).toEqual('foo');
});

loader.paths(`f-slugify-%N.html`).forEach((path) => {
  test(`slugify - ${path}`, () => loader.execute(path));
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

loader.paths(`f-smartypants-%N.html`).forEach((path) => {
  test(`smartypants - ${path}`, () => loader.execute(path));
});

test('smartypants', () => {
  let vars = variables("Fred's and Joe's");
  Core.smartypants.apply([], vars, CTX);
  expect(vars[0].get()).toEqual('Fred\u2019s and Joe\u2019s');

  vars = variables('"foo"');
  Core.smartypants.apply([], vars, CTX);
  expect(vars[0].get()).toEqual('\u201cfoo\u201d');

  vars = variables('I spoke to Larry--the project\nlead--about the issue');
  Core.smartypants.apply([], vars, CTX);
  expect(vars[0].get()).toEqual('I spoke to Larry\u2014the project\nlead\u2014about the issue');
});

loader.paths(`f-str-%N.html`).forEach((path) => {
  test(`str - ${path}`, () => loader.execute(path));
});

test('str', () => {
  let vars = variables(123.4);
  Core.str.apply([], vars, CTX);
  expect(vars[0].get()).toEqual('123.4');

  vars = variables({ foo: 1 });
  Core.str.apply([], vars, CTX);
  expect(vars[0].get()).toEqual('');
});

loader.paths(`f-truncate-%N.html`).forEach((path) => {
  test(`truncate - ${path}`, () => loader.execute(path));
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
  Core.truncate.apply(['5', '…'], vars, CTX);
  expect(vars[0].get()).toEqual('abcde…');

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

loader.paths('f-url-encode-%N.html').forEach((path) => {
  test(`url-encode - ${path}`, () => loader.execute(path));
});

test('urlencode', () => {
  const vars = variables('\u201ca b\u201d');
  Core['url-encode'].apply([], vars, CTX);
  expect(vars[0].get()).toEqual('%E2%80%9Ca%20b%E2%80%9D');
});
