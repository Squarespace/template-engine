import { escapeHtmlAttributes, removeTags, slugify, truncate } from '../../src/plugins/util.string';


test('remove tags', () => {
  let s = 'foo <bar> baz';
  expect(removeTags(s)).toEqual('foo  baz');

  s = 'abc def ghi';
  expect(removeTags(s)).toEqual('abc def ghi');

  s = '<           >';
  expect(removeTags(s)).toEqual('');
});


test('escape html attribute', () => {
  expect(escapeHtmlAttributes('<tag> "foo" & bar')).toEqual('&lt;tag&gt; &quot;foo&quot; &amp; bar');
});


test('slugify', () => {
  expect(slugify('Hello, \t \n World!')).toEqual('hello-world');
});


test('truncate', () => {
  let str = 'abc def ghi jkl';
  expect(truncate(str, -1)).toEqual('...');
  expect(truncate(str, 4)).toEqual('abc ...');
  expect(truncate(str, 10)).toEqual('abc def ...');
  expect(truncate(str, 11)).toEqual('abc def ...');
  expect(truncate(str, 12)).toEqual('abc def ghi ...');
  expect(truncate(str, 13)).toEqual('abc def ghi ...');
  expect(truncate(str, 14)).toEqual('abc def ghi ...');
  expect(truncate(str, 15)).toEqual(str);
  expect(truncate(str, 16)).toEqual(str);
  expect(truncate(str, 17)).toEqual(str);
});
