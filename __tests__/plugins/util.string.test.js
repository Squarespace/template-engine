import { removeTags, slugify, escapeHtmlAttributes } from '../../src/plugins/util.string';


test('remove tags', () => {
  const s = 'foo <bar> baz';
  expect(removeTags(s)).toEqual('foo   baz');
});


test('escape html attribute', () => {
  expect(escapeHtmlAttributes('<tag> "foo" & bar')).toEqual('&lt;tag&gt; &quot;foo&quot; &amp; bar');
});


test('slugify', () => {
  expect(slugify('Hello, \t \n World!')).toEqual('hello-world');
});
