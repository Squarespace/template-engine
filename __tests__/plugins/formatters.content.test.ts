import { join } from 'path';
import { CONTENT_FORMATTERS as TABLE } from '../../src/plugins/formatters.content';
import { Context } from '../../src/context';
import { MISSING_NODE } from '../../src/node';
import { pathseq, Image } from '../helpers';
import { TemplateTestLoader } from '../loader';
import { Variable } from '../../src/variable';

const IMAGE = new Image();
const loader = new TemplateTestLoader(join(__dirname, 'resources'));
const variables = (...n: any[]) => n.map((v, i) => new Variable('var' + i, v));

const CTX = new Context({});

test('AbsUrl', () => {
  const impl = TABLE.AbsUrl;
  const ctx = new Context({ 'base-url': 'https://www.squarespace.com' });
  const vars = variables('foo/bar');
  impl.apply([], vars, ctx);
  expect(vars[0].get()).toEqual('https://www.squarespace.com/foo/bar');
});

pathseq('f-audio-player-%N.html', 1).forEach(path => {
  test(`audio-player - ${path}`, () => loader.execute(path));
});

test('capitalize', () => {
  const impl = TABLE.capitalize;
  const vars = variables('abc');
  impl.apply([], vars, CTX);
  expect(vars[0].get()).toEqual('ABC');
});

test('child image meta', () => {
  const impl = TABLE['child-image-meta'];

  const image = IMAGE
    .focalPoint(0.3, 0.7)
    .title('foo')
    .originalSize('500x200')
    .set({ foo: 1 }, 'licensedAssetPreview')
    .assetUrl('http://glonk.com/');

  let vars = variables({ items: [image.get()] });
  impl.apply([], vars, CTX);
  expect(vars[0].get()).toContain('data-licensed-asset-preview="true"');
  expect(vars[0].get()).toContain('data-src="http://glonk.com/"');
  expect(vars[0].get()).toContain('data-image="http://glonk.com/"');
  expect(vars[0].get()).toContain('data-image-dimensions="500x200"');
  expect(vars[0].get()).toContain('data-image-focal-point="0.3,0.7"');
  expect(vars[0].get()).toContain('alt="foo"');

  vars = variables({
    items: [
      image.title('').get()
    ]
  });
  impl.apply([], vars, CTX);
  expect(vars[0].get()).toContain('alt=""');

  vars = variables({
    items: [
      image.title('').set('bar', 'body').get()
    ]
  });
  impl.apply([], vars, CTX);
  expect(vars[0].get()).toContain('alt="bar"');

  vars = variables({
    items: [
      image.title('').set('baz', 'filename').get()
    ]
  });
  impl.apply([], vars, CTX);
  expect(vars[0].get()).toContain('alt="baz"');

  vars = variables({
    items: [
      image.set(undefined, 'mediaFocalPoint').get()
    ]
  });
  impl.apply([], vars, CTX);
  expect(vars[0].get()).toContain('data-image-focal-point="0.5,0.5"');

  vars = variables({ items: [image.get()] });
  impl.apply(['1'], vars, CTX);
  expect(vars[0].get()).toEqual('');
});

test('cover image meta', () => {
  const impl = TABLE['cover-image-meta'];

  const image = IMAGE
    .focalPoint(0.3, 0.7)
    .title('foo')
    .originalSize('500x200')
    .set({ foo: 1 }, 'licensedAssetPreview')
    .assetUrl('http://squarespace.com/');

  const vars = variables({ coverImage: image.get() });
  impl.apply([], vars, CTX);
  expect(vars[0].get()).toContain('data-src="http://squarespace.com/');
});

test('color weight', () => {
  const impl = TABLE['color-weight'];

  let vars = variables('#fff');
  impl.apply([], vars, CTX);
  expect(vars[0].get()).toEqual('light');

  vars = variables('#000');
  impl.apply([], vars, CTX);
  expect(vars[0].get()).toEqual('dark');

  vars = variables('#ffffff');
  impl.apply([], vars, CTX);
  expect(vars[0].get()).toEqual('light');

  vars = variables('#000000');
  impl.apply([], vars, CTX);
  expect(vars[0].get()).toEqual('dark');

  vars = variables('#aaa');
  impl.apply([], vars, CTX);
  expect(vars[0].get()).toEqual('light');

  vars = variables('#444');
  impl.apply([], vars, CTX);
  expect(vars[0].get()).toEqual('dark');

  vars = variables('800000');
  impl.apply([], vars, CTX);
  expect(vars[0].get()).toEqual('light');

  vars = variables('7fffff');
  impl.apply([], vars, CTX);
  expect(vars[0].get()).toEqual('dark');

  vars = variables('zyz');
  impl.apply([], vars, CTX);
  expect(vars[0].node).toEqual(MISSING_NODE);
});

test('height', () => {
  const impl = TABLE.height;

  let vars = variables('800x400');
  impl.apply([], vars, CTX);
  expect(vars[0].get()).toEqual(400);

  vars = variables(undefined);
  impl.apply([], vars, CTX);
  expect(vars[0].node).toBe(MISSING_NODE);
});

pathseq('f-humanize-duration-%N.html', 1).forEach(path => {
  test(`humanize duration - ${path}`, () => loader.execute(path));
});

pathseq('f-image-%N.html', 4).forEach(path => {
  test(`image - ${path}`, () => loader.execute(path));
});

pathseq('f-image-srcset-%N.html', 1).forEach(path => {
  test(`image srcset - ${path}`, () => loader.execute(path));
});

pathseq('f-image-color-%N.html', 5).forEach(path => {
  test(`image color - ${path}`, () => loader.execute(path));
});

pathseq('f-item-classes-%N.html', 3).forEach(path => {
  test(`item classes - ${path}`, () => loader.execute(path));
});

test('resize height for width', () => {
  const impl = TABLE.resizedHeightForWidth;
  const cases = [
    { input: '100x200', arg: '50', expected: 100 },
    { input: '1200x2400', arg: '600', expected: 1200 },
  ];

  cases.forEach(c => {
    const vars = variables(c.input);
    impl.apply([c.arg], vars, CTX);
    expect(vars[0].get()).toEqual(c.expected);
  });
});

test('resize width for height', () => {
  const impl = TABLE.resizedWidthForHeight;
  const cases = [
    { input: '100x200', arg: '50', expected: 25 },
    { input: '1200x2400', arg: '600', expected: 300 },
  ];

  cases.forEach(c => {
    const vars = variables(c.input);
    impl.apply([c.arg], vars, CTX);
    expect(vars[0].get()).toEqual(c.expected);
  });
});

test('squarespace thumbnail for width', () => {
  const impl = TABLE.squarespaceThumbnailForWidth;
  const cases = [
    { arg: '50', expected: '100w' },
    { arg: '200', expected: '300w' },
    { arg: '400', expected: '500w' },
    { arg: '600', expected: '750w' },
    { arg: '800', expected: '1000w' },
    { arg: '1100', expected: '1500w' },
  ];

  cases.forEach(c => {
    const vars = variables('100x200');
    impl.apply([c.arg], vars, CTX);
    expect(vars[0].get()).toEqual(c.expected);
  });
});

test('squarespace thumbnail for height', () => {
  const impl = TABLE.squarespaceThumbnailForHeight;
  const cases = [
    { input: '100x200', arg: '50', expected: '100w' },
    { input: '1200x2400', arg: '600', expected: '300w' },
    { input: '1200', arg: '600', expected: "Invalid source parameter. Pass in 'originalSize'" },
  ];

  cases.forEach(c => {
    const vars = variables(c.input);
    impl.apply([c.arg], vars, CTX);
    expect(vars[0].get()).toEqual(c.expected);
  });
});

pathseq('f-video-%N.html', 3).forEach(path => {
  test(`video - ${path}`, () => loader.execute(path));
});

test('width', () => {
  const impl = TABLE.width;

  let vars = variables('800x400');
  impl.apply([], vars, CTX);
  expect(vars[0].get()).toEqual(800);

  vars = variables(undefined);
  impl.apply([], vars, CTX);
  expect(vars[0].node).toBe(MISSING_NODE);
});
