import Core from '../../src/plugins/formatters.core';
import Context from '../../src/context';
import Engine from '../../src/engine';
import { EOF, ROOT, TEXT, VARIABLE } from '../../src/opcodes';
import Variable from '../../src/variable';


const variables = (...n) => {
  return n.map((v, i) => new Variable('var' + i, v));
};


test('apply', () => {
  const engine = new Engine();
  const inst = [ROOT, 1, [
    [TEXT, 'Hi, '],
    [VARIABLE, [['person']], [['apply', ['person.html']]]]
  ], EOF];
  const partial = [ROOT, 1, [
    [VARIABLE, [['name']], 0],
    [VARIABLE, [['sym']], 0]
  ], EOF];

  const node = { person: { name: 'User Name' }, sym: '!!' };
  const ctx = new Context(node, { partials: { 'person.html': partial } });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('Hi, User Name!!');
});


test('apply private scope', () => {
  const engine = new Engine();
  const inst = [ROOT, 1, [
    [TEXT, 'Hi, '],
    [VARIABLE, [['person']], [['apply', ['person.html', 'private']]]],
  ], EOF];
  const partial = [ROOT, 1, [
    [VARIABLE, [['name']], 0],
    [VARIABLE, [['sym']], 0]
  ], EOF];

  const node = { person: { name: 'User Name' }, sym: '!!' };
  const ctx = new Context(node, { partials: { 'person.html': partial } });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('Hi, User Name');
});


test('apply missing partial', () => {
  const engine = new Engine();
  const inst = [ROOT, 1, [
    [TEXT, 'Hi, '],
    [VARIABLE, ['person'], [['apply', ['missing.html']]]],
  ], EOF];
  const partial = [ROOT, 1, [
    [VARIABLE, ['name'], 0],
    [VARIABLE, ['sym'], 0]
  ], EOF];

  const node = { person: { name: 'User Name' } };
  const ctx = new Context(node, { partials: { 'person.html': partial } });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('Hi, ');
});


test('apply no arguments', () => {
  const engine = new Engine();
  const inst = [ROOT, 1, [
    [TEXT, 'Hi, '],
    [VARIABLE, ['person'], [['apply']]],
  ], EOF];
  const partial = [ROOT, 1, [
    [VARIABLE, ['name'], 0],
    [VARIABLE, ['sym'], 0]
  ], EOF];

  const node = { person: { name: 'User Name' } };
  const ctx = new Context(node, { partials: { 'person.html': partial } });
  engine.execute(inst, ctx);
  expect(ctx.render()).toEqual('Hi, ');
});


test('count', () => {
  let vars = variables([]);
  Core.count.apply([], vars, null);
  expect(vars[0].get()).toEqual(0);

  vars = variables([1, 2, 3]);
  Core.count.apply([], vars, null);
  expect(vars[0].get()).toEqual(3);

  vars = variables({});
  Core.count.apply([], vars, null);
  expect(vars[0].get()).toEqual(0);

  vars = variables({ a: 1, b: { c: 2 } });
  Core.count.apply([], vars, null);
  expect(vars[0].get()).toEqual(2);

  vars = variables(123);
  Core.count.apply([], vars, null);
  expect(vars[0].get()).toEqual(0);

  vars = variables('hello');
  Core.count.apply([], vars, null);
  expect(vars[0].get()).toEqual(0);

  vars = variables(true);
  Core.count.apply([], vars, null);
  expect(vars[0].get()).toEqual(0);
});


test('cycle', () => {
  const args = ['a', 'b', 'c'];

  let vars = variables(-4);
  Core.cycle.apply(args, vars, null);
  expect(vars[0].get()).toEqual('b');

  vars = variables(1);
  Core.cycle.apply(args, vars, null);
  expect(vars[0].get()).toEqual('a');

  vars = variables(2);
  Core.cycle.apply(args, vars, null);
  expect(vars[0].get()).toEqual('b');

  vars = variables(3);
  Core.cycle.apply(args, vars, null);
  expect(vars[0].get()).toEqual('c');

  vars = variables(4);
  Core.cycle.apply(args, vars, null);
  expect(vars[0].get()).toEqual('a');
});


test('date', () => {
  const tz = (s) => { return { website: { timeZone: s } }; };
  const losAngeles = tz('America/Los_Angeles');
  const paris = tz('Europe/Paris');
  const may2013 = 1368406800000;

  let ctx = new Context({});
  let vars = variables(may2013);
  Core.date.apply(['%c'], vars, ctx);
  expect(vars[0].get()).toEqual('Sun, May 12, 2013 9:00:00 PM EDT');

  vars = variables(may2013);
  Core.date.apply(['%Y %q %'], vars, ctx);
  expect(vars[0].get()).toEqual('2013  %');

  ctx = new Context(losAngeles);
  vars = variables(may2013);
  Core.date.apply(['%c'], vars, ctx);
  expect(vars[0].get()).toEqual('Sun, May 12, 2013 6:00:00 PM PDT');

  vars = variables(may2013);
  Core.date.apply(['%Y-%m-%d %H:%M:%S %Z'], vars, ctx);
  expect(vars[0].get()).toEqual('2013-05-12 18:00:00 PDT');

  vars = variables(may2013);
  Core.date.apply(['%C'], vars, ctx);
  expect(vars[0].get()).toEqual('20');

  vars = variables(may2013);
  Core.date.apply(['%s'], vars, ctx);
  expect(vars[0].get()).toEqual('1368406800');

  vars = variables(may2013);
  Core.date.apply([], vars, ctx);
  expect(vars[0].get()).toEqual('');

  ctx = new Context(paris);
  vars = variables(may2013);
  Core.date.apply(['%c'], vars, ctx);
  expect(vars[0].get()).toEqual('Mon, May 13, 2013 3:00:00 AM CEST');
});


test('encode-space', () => {
  const vars = variables(' \t\n ');
  Core['encode-space'].apply([], vars, null);
  expect(vars[0].get()).toEqual('&nbsp;&nbsp;&nbsp;&nbsp;');
});


test('encode-uri', () => {
  const vars = variables('<=%>');
  Core['encode-uri'].apply([], vars, null);
  expect(vars[0].get()).toEqual('%3C=%25%3E');
});


test('encode-uri-component', () => {
  const vars = variables('<=%>');
  Core['encode-uri-component'].apply([], vars, null);
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


test('html', () => {
  const vars = variables('"<foo & bar>"');
  Core.html.apply([], vars, null);
  expect(vars[0].get()).toEqual('"&lt;foo &amp; bar&gt;"');
});


const htmlattr = () => {
  const vars = variables('"<foo & bar>"');
  Core.htmlattr.apply([], vars, null);
  expect(vars[0].get()).toEqual('&quot;&lt;foo &amp; bar&gt;&quot;');
};


test('htmlattr', htmlattr);


test('htmltag', htmlattr);


test('iter', () => {
  const vars = variables(' ');
  const ctx = new Context({ a: [1, 2, 3] });
  ctx.pushNames(['a']);
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
  Core.json.apply([], vars, null);
  expect(vars[0].get()).toEqual('"foo bar"');

  vars = variables(['a', 2, 'c']);
  Core.json.apply([], vars, null);
  expect(vars[0].get()).toEqual('["a",2,"c"]');
});


test('json-pretty', () => {
  const vars = variables({ a: [1, 2] });
  Core['json-pretty'].apply([], vars, null);
  expect(vars[0].get()).toEqual('{\n  "a": [\n    1,\n    2\n  ]\n}');
});


test('lookup', () => {
  const ctx = new Context({ key: 'a.b.c', a: { b: { c: 123 } } });
  ctx.pushNames(['a']);
  const vars = variables('key');
  Core.lookup.apply([], vars, ctx);
  expect(vars[0].get()).toEqual(123);
});


test('output', () => {
  const vars = variables(' ');
  Core.output.apply(['a', 'b', 'c'], vars, null);
  expect(vars[0].get()).toEqual('a b c');
});


test('pluralize', () => {
  let vars = variables(1);
  Core.pluralize.apply([], vars, null);
  expect(vars[0].get()).toEqual('');

  vars = variables(1);
  Core.pluralize.apply(['x'], vars, null);
  expect(vars[0].get()).toEqual('');

  vars = variables(1);
  Core.pluralize.apply(['x', 'y'], vars, null);
  expect(vars[0].get()).toEqual('x');

  vars = variables(2);
  Core.pluralize.apply([], vars, null);
  expect(vars[0].get()).toEqual('s');

  vars = variables(2);
  Core.pluralize.apply(['x', 'y'], vars, null);
  expect(vars[0].get()).toEqual('y');
});


test('raw', () => {
  const vars = variables(3.14159);
  Core.raw.apply([], vars, null);
  expect(vars[0].get()).toEqual('3.14159');
});


test('round', () => {
  let vars = variables(1.44);
  Core.round.apply([], vars, null);
  expect(vars[0].get()).toEqual(1);

  vars = variables(1.6);
  Core.round.apply([], vars, null);
  expect(vars[0].get()).toEqual(2);
});


test('safe', () => {
  let vars = variables('foo <bar> bar');
  Core.safe.apply([], vars, null);
  expect(vars[0].get()).toEqual('foo  bar');

  vars = variables('<script\nsrc="url"\n>foobar</script>');
  Core.safe.apply([], vars, null);
  expect(vars[0].get()).toEqual('foobar');

  vars = variables('<div>\n<b>\nfoobar\n</b>\n</div>');
  Core.safe.apply([], vars, null);
  expect(vars[0].get()).toEqual('\n\nfoobar\n\n');

  vars = variables({});
  Core.safe.apply([], vars, null);
  expect(vars[0].get()).toEqual({});

  vars = variables({ a: '<div>foo</div>' });
  Core.safe.apply([], vars, null);
  expect(vars[0].get()).toEqual('{"a":"foo"}');
});


test('slugify', () => {
  let vars = variables('Next Total Eclipse on 20th of March 2015');
  Core.slugify.apply([], vars, null);
  expect(vars[0].get()).toEqual('next-total-eclipse-on-20th-of-march-2015');

  vars = variables('Value of PI is approx. 3.14159');
  Core.slugify.apply([], vars, null);
  expect(vars[0].get()).toEqual('value-of-pi-is-approx-314159');

  vars = variables('"1.2.3.4.5-()*&-foo.bar-baz');
  Core.slugify.apply([], vars, null);
  expect(vars[0].get()).toEqual('12345--foobar-baz');
});


test('smartypants', () => {
  let vars = variables('Fred\'s');
  Core.smartypants.apply([], vars, null);
  expect(vars[0].get()).toEqual('Fred\u2019s');

  vars = variables('"foo"');
  Core.smartypants.apply([], vars, null);
  expect(vars[0].get()).toEqual('\u201cfoo\u201d');
});


test('str', () => {
  const vars = variables(123.4);
  Core.str.apply([], vars, null);
  expect(vars[0].get()).toEqual('123.4');
});


test('truncate', () => {
  const str = 'abcdefg';
  let vars = variables(str);
  Core.truncate.apply(['5'], vars, null);
  expect(vars[0].get()).toEqual('abcde');

  vars = variables(str);
  Core.truncate.apply([5], vars, null);
  expect(vars[0].get()).toEqual('abcde');

  vars = variables(str);
  Core.truncate.apply([], vars, null);
  expect(vars[0].get()).toEqual(str);

  vars = variables(str);
  Core.truncate.apply([100], vars, null);
  expect(vars[0].get()).toEqual(str);

  vars = variables(str);
  Core.truncate.apply([false], vars, null);
  expect(vars[0].get()).toEqual(str);

  vars = variables(str);
  Core.truncate.apply([-10], vars, null);
  expect(vars[0].get()).toEqual(str);
});


test('urlencode', () => {
  const vars = variables('\u201ca b\u201d');
  Core['url-encode'].apply([], vars, null);
  expect(vars[0].get()).toEqual('%E2%80%9Ca%20b%E2%80%9D');
});
