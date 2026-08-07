import { join } from 'path';
import { CONTENT_FORMATTERS as TABLE } from '../../src/plugins/formatters.content';
import { Context } from '../../src/context';
import { Compiler } from '../../src/compiler';
import { CompatLevel } from '../../src/compat/compat-level';
import { MISSING_NODE } from '../../src/node';
import { Image } from '../helpers';
import { framework } from '../cldr';
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

loader.paths('f-absurl-%N.html').forEach((path) => {
  test(`AbsUrl - ${path}`, () => loader.execute(path));
});

loader.paths('f-audio-player-%N.html').forEach((path) => {
  test(`audio-player - ${path}`, () => loader.execute(path));
});

loader.paths('f-capitalize-%N.html').forEach((path) => {
  test(`capitalize - ${path}`, () => loader.execute(path));
});

test('capitalize', () => {
  const impl = TABLE.capitalize;
  const vars = variables('abc');
  impl.apply([], vars, CTX);
  expect(vars[0].get()).toEqual('ABC');
});

test('child image meta', () => {
  const impl = TABLE['child-image-meta'];

  const image = IMAGE.focalPoint(0.3, 0.7)
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
    items: [image.title('').get()],
  });
  impl.apply([], vars, CTX);
  expect(vars[0].get()).toContain('alt=""');

  vars = variables({
    items: [image.title('').set('bar', 'body').get()],
  });
  impl.apply([], vars, CTX);
  expect(vars[0].get()).toContain('alt="bar"');

  vars = variables({
    items: [image.title('').set('baz', 'filename').get()],
  });
  impl.apply([], vars, CTX);
  expect(vars[0].get()).toContain('alt="baz"');

  vars = variables({
    items: [image.set(undefined, 'mediaFocalPoint').get()],
  });
  impl.apply([], vars, CTX);
  expect(vars[0].get()).toContain('data-image-focal-point="0.5,0.5"');

  vars = variables({ items: [image.get()] });
  impl.apply(['1'], vars, CTX);
  expect(vars[0].get()).toEqual('');
});

loader.paths('f-child-image-meta-%N.html').forEach((path) => {
  test(`child image meta - ${path}`, () => loader.execute(path));
});

test('cover image meta', () => {
  const impl = TABLE['cover-image-meta'];

  const image = IMAGE.focalPoint(0.3, 0.7)
    .title('foo')
    .originalSize('500x200')
    .set({ foo: 1 }, 'licensedAssetPreview')
    .assetUrl('http://squarespace.com/');

  const vars = variables({ coverImage: image.get() });
  impl.apply([], vars, CTX);
  expect(vars[0].get()).toContain('data-src="http://squarespace.com/');
});

loader.paths('f-color-weight-%N.html').forEach((path) => {
  test(`color-weight - ${path}`, () => loader.execute(path));
});

test('color-weight', () => {
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

  // A 4 or 5 char hex passes the released {3,6} match and reports dark.
  // Level 1 still sits below the patch threshold, so only level 2 and up
  // render it missing. A 7 char hex and non-hex strings are missing at
  // every level.
  const level1 = new Context({}, { compat: CompatLevel.at(1) });
  const fixed = new Context({}, { compat: CompatLevel.fixed() });
  const rows: Array<[Context, string, any]> = [
    [CTX, '#1234', 'dark'],
    [level1, '#1234', 'dark'],
    [fixed, '#1234', MISSING_NODE],
    [CTX, '#12345', 'dark'],
    [level1, '#12345', 'dark'],
    [fixed, '#12345', MISSING_NODE],
    [CTX, '1234567', MISSING_NODE],
    [fixed, '1234567', MISSING_NODE],
    [CTX, '#GGG', MISSING_NODE],
    [fixed, '#GGG', MISSING_NODE],
    [CTX, '#fff', 'light'],
    [fixed, '#fff', 'light'],
    [CTX, '#444', 'dark'],
    [fixed, '#444', 'dark'],
  ];

  rows.forEach(([ctx, input, expected]) => {
    vars = variables(input);
    impl.apply([], vars, ctx);
    if (expected === MISSING_NODE) {
      expect(vars[0].node).toEqual(MISSING_NODE);
    } else {
      expect(vars[0].get()).toEqual(expected);
    }
  });
});

loader.paths('f-height-%N.html').forEach((path) => {
  test(`height - ${path}`, () => loader.execute(path));
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

loader.paths('f-humanize-duration-%N.html').forEach((path) => {
  test(`humanize duration - ${path}`, () => loader.execute(path));
});

loader.paths('f-image-%N.html').forEach((path) => {
  test(`image - ${path}`, () => loader.execute(path));
});

test('image alt stays released at the fixed level', () => {
  // The image-alt path calls the released escape form, so the quote stays
  // raw even when every patch is fixed.
  const compiler = new Compiler();
  const { ctx, errors } = compiler.execute({
    code: '{@|image}',
    json: { id: 'x1', title: "it's", assetUrl: '/a.jpg' },
    compat: CompatLevel.fixed(),
  });
  expect(errors).toEqual([]);
  const output = ctx.render();
  expect(output).toContain('alt="it\'s"');
  expect(output).not.toContain('alt="it&#39;s"');
});

loader.paths('f-image-meta-%N.html').forEach((path) => {
  test(`image meta - ${path}`, () => loader.execute(path));
});

loader.paths('f-image-srcset-%N.html').forEach((path) => {
  test(`image srcset - ${path}`, () => loader.execute(path));
});

loader.paths('f-image-color-%N.html').forEach((path) => {
  test(`image color - ${path}`, () => loader.execute(path));
});

loader.paths('f-item-classes-%N.html').forEach((path) => {
  test(`item classes - ${path}`, () => loader.execute(path));
});

loader.paths('f-resized-%N.html').forEach((path) => {
  test(`resized - ${path}`, () => loader.execute(path));
});

test('resize height for width', () => {
  const impl = TABLE.resizedHeightForWidth;
  const cases = [
    { input: '100x200', arg: '50', expected: 100 },
    { input: '1200x2400', arg: '600', expected: 1200 },
  ];

  cases.forEach((c) => {
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

  cases.forEach((c) => {
    const vars = variables(c.input);
    impl.apply([c.arg], vars, CTX);
    expect(vars[0].get()).toEqual(c.expected);
  });
});

// The friendly messages for the two invalid-source paths. Fixed width and
// height match Java and end with a period; the released resize message does
// not, so the resize helper keeps its own text.
const WIDTH_HEIGHT_MESSAGE = "Invalid source parameter. Pass in 'originalSize'.";
const RESIZE_MESSAGE = "Invalid source parameter. Pass in 'originalSize'";
// Fixed matches the Java text, which carries the trailing period.
const RESIZE_MESSAGE_FIXED = RESIZE_MESSAGE + '.';

const FIXED = new Context({}, { compat: CompatLevel.fixed() });

test('width and height on non-numeric dimensions', () => {
  const rows: Array<[Context, string, any, any]> = [
    // Legacy: non-numeric renders NaN, empty renders missing. These pin the
    // released surface.
    [CTX, 'axb', NaN, NaN],
    [CTX, '', MISSING_NODE, MISSING_NODE],
    // Fixed routes both to the friendly message.
    [FIXED, 'axb', WIDTH_HEIGHT_MESSAGE, WIDTH_HEIGHT_MESSAGE],
    [FIXED, '', WIDTH_HEIGHT_MESSAGE, WIDTH_HEIGHT_MESSAGE],

    // Valid dimensions parse at every level.
    [CTX, '640x360', 640, 360],
    [FIXED, '640x360', 640, 360],
    // A float part parses loosely at level 0, and is rejected when fixed.
    [CTX, '6.5x360', 6, 360],
    [FIXED, '6.5x360', WIDTH_HEIGHT_MESSAGE, WIDTH_HEIGHT_MESSAGE],
    // A negative part is a valid signed integer.
    [CTX, '-5x360', -5, 360],
    [FIXED, '-5x360', -5, 360],
  ];

  rows.forEach(([ctx, input, widthExpected, heightExpected]) => {
    let vars = variables(input);
    TABLE.width.apply([], vars, ctx);
    const width = vars[0].node === MISSING_NODE ? MISSING_NODE : vars[0].get();
    expect(width).toEqual(widthExpected);

    vars = variables(input);
    TABLE.height.apply([], vars, ctx);
    const height = vars[0].node === MISSING_NODE ? MISSING_NODE : vars[0].get();
    expect(height).toEqual(heightExpected);
  });
});

test('resize on non-numeric dimensions', () => {
  const rows: Array<[Context, string, any]> = [
    // Legacy: a non-numeric part computes to 0, an empty value falls to the
    // friendly message.
    [CTX, 'axb', 0],
    [CTX, '', RESIZE_MESSAGE],
    // Fixed reaches the friendly message for both, with the Java period.
    [FIXED, 'axb', RESIZE_MESSAGE_FIXED],
    [FIXED, '', RESIZE_MESSAGE_FIXED],

    // Valid dimensions compute the same at every level.
    [CTX, '640x360', 180],
    [FIXED, '640x360', 180],
    // A float part divides loosely at level 0, and is rejected when fixed.
    [CTX, '6.5x360', 19200],
    [FIXED, '6.5x360', RESIZE_MESSAGE_FIXED],
  ];

  rows.forEach(([ctx, input, expected]) => {
    const vars = variables(input);
    TABLE.resizedHeightForWidth.apply(['320'], vars, ctx);
    expect(vars[0].get()).toEqual(expected);
  });

  ['axb', '640x360'].forEach((input) => {
    const vars = variables(input);
    TABLE.resizedWidthForHeight.apply(['320'], vars, FIXED);
    if (input === 'axb') {
      expect(vars[0].get()).toEqual(RESIZE_MESSAGE_FIXED);
    } else {
      expect(vars[0].get()).toEqual(568);
    }
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

  cases.forEach((c) => {
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
    {
      input: '1200',
      arg: '600',
      expected: "Invalid source parameter. Pass in 'originalSize'",
    },
  ];

  cases.forEach((c) => {
    const vars = variables(c.input);
    impl.apply([c.arg], vars, CTX);
    expect(vars[0].get()).toEqual(c.expected);
  });
});

loader.paths('f-video-%N.html').forEach((path) => {
  test(`video - ${path}`, () => loader.execute(path));
});

loader.paths('f-width-%N.html').forEach((path) => {
  test(`width - ${path}`, () => loader.execute(path));
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

loader.paths('f-website-color-%N.html').forEach((path) => {
  test(`website-color - ${path}`, () => loader.execute(path));
});

test('website-color locale', () => {
  const run = (data: any, cldr?: any): any => {
    const ctx = cldr ? new Context({}, { cldr }) : new Context({});
    const vars = variables(data);
    TABLE['website-color'].apply([], vars, ctx);
    return vars[0].get();
  };

  const en = framework.get('en');
  const fr = framework.get('fr');

  // The decimal symbol follows the context locale; no cldr means the dot.
  const node = { hue: 0, saturation: 0.1234, lightness: 0.5 };
  expect(run(node, en)).toEqual('hsl(0, 12.34%, 50%)');
  expect(run(node, fr)).toEqual('hsl(0, 12,34%, 50%)');
  expect(run(node)).toEqual('hsl(0, 12.34%, 50%)');

  // Trailing zeroes are stripped after the 2-place round, in both locales.
  const trailing = { hue: 0, saturation: 0.12, lightness: 0.5 };
  expect(run(trailing, en)).toEqual('hsl(0, 12%, 50%)');
  expect(run(trailing, fr)).toEqual('hsl(0, 12%, 50%)');

  // The 0.125 row scales to exactly 12.5, which fits two places, so both
  // engines keep it: this pins the locale swap on a non-integer row.
  const half = { hue: 0, saturation: 0.125, lightness: 0.5 };
  expect(run(half, en)).toEqual('hsl(0, 12.5%, 50%)');
  expect(run(half, fr)).toEqual('hsl(0, 12,5%, 50%)');

  // The alpha component is fourth and localized too.
  expect(run({ hue: 0, saturation: 0.2, lightness: 0.5, alpha: 0.75 }, fr))
    .toEqual('hsla(0, 20%, 50%, 0,75)');
});
