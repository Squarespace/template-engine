import { join } from 'path';
import Content from '../../src/plugins/formatters.content';
import Context from '../../src/context';
import { MISSING_NODE } from '../../src/node';
import { Image, pathseq } from '../helpers';
import { TemplateTestLoader } from '../loader';
import Variable from '../../src/variable';


const IMAGE = new Image();
const loader = new TemplateTestLoader(join(__dirname, 'resources'));
const variables = (...n) => n.map((v, i) => new Variable('var' + i, v));


test('AbsUrl', () => {
  const impl = Content.AbsUrl;
  const ctx = new Context({ 'base-url': 'https://www.squarespace.com' });
  const vars = variables('foo/bar');
  impl.apply([], vars, ctx);
  expect(vars[0].get()).toEqual('https://www.squarespace.com/foo/bar');
});


pathseq('f-audio-player-%N.html', 1).forEach(path => {
  test(`audio-player - ${path}`, () => loader.execute(path));
});


test('capitalize', () => {
  const impl = Content.capitalize;
  const vars = variables('abc');
  impl.apply([], vars, null);
  expect(vars[0].get()).toEqual('ABC');
});


test('child image meta', () => {
  const impl = Content['child-image-meta'];

  const image = IMAGE
    .focalPoint(0.3, 0.7)
    .title('foo')
    .originalSize('500x200')
    .set({ foo: 1 }, 'licensedAssetPreview')
    .assetUrl('http://glonk.com/');

  let vars = variables({ items: [image.get()] });
  impl.apply([], vars, null);
  expect(vars[0].get()).toContain('data-licensed-asset-preview="true"');
  expect(vars[0].get()).toContain('data-src="http://glonk.com/"');
  expect(vars[0].get()).toContain('data-image="http://glonk.com/"');
  expect(vars[0].get()).toContain('data-image-dimension="500x200"');
  expect(vars[0].get()).toContain('data-image-focal-point="0.3,0.7"');
  expect(vars[0].get()).toContain('alt="foo"');

  vars = variables({ items: [
    image.title('').get()
  ] });
  impl.apply([], vars, null);
  expect(vars[0].get()).toContain('alt=""');

  vars = variables({ items: [
    image.title('').set('bar', 'body').get()
  ] });
  impl.apply([], vars, null);
  expect(vars[0].get()).toContain('alt="bar"');

  vars = variables({ items: [
    image.title('').set('baz', 'filename').get()
  ] });
  impl.apply([], vars, null);
  expect(vars[0].get()).toContain('alt="baz"');

  vars = variables({ items: [
    image.set(undefined, 'mediaFocalPoint').get()
  ] });
  impl.apply([], vars, null);
  expect(vars[0].get()).toContain('data-image-focal-point="0.5,0.5"');

  vars = variables({ items: [image.get()] });
  impl.apply(['1'], vars, null);
  expect(vars[0].get()).toEqual('');
});


test('cover image meta', () => {
  const impl = Content['cover-image-meta'];

  const image = IMAGE
    .focalPoint(0.3, 0.7)
    .title('foo')
    .originalSize('500x200')
    .set({ foo: 1 }, 'licensedAssetPreview')
    .assetUrl('http://squarespace.com/');

  const vars = variables({ coverImage: image.get() });
  impl.apply([], vars, null);
  expect(vars[0].get()).toContain('data-src="http://squarespace.com/');
});


test('color weight', () => {
  const impl = Content['color-weight'];

  let vars = variables('#fff');
  impl.apply([], vars, null);
  expect(vars[0].get()).toEqual('light');

  vars = variables('#000');
  impl.apply([], vars, null);
  expect(vars[0].get()).toEqual('dark');

  vars = variables('#ffffff');
  impl.apply([], vars, null);
  expect(vars[0].get()).toEqual('light');

  vars = variables('#000000');
  impl.apply([], vars, null);
  expect(vars[0].get()).toEqual('dark');

  vars = variables('#aaa');
  impl.apply([], vars, null);
  expect(vars[0].get()).toEqual('light');

  vars = variables('#444');
  impl.apply([], vars, null);
  expect(vars[0].get()).toEqual('dark');

  vars = variables('800000');
  impl.apply([], vars, null);
  expect(vars[0].get()).toEqual('light');

  vars = variables('7fffff');
  impl.apply([], vars, null);
  expect(vars[0].get()).toEqual('dark');

  vars = variables('zyz');
  impl.apply([], vars, null);
  expect(vars[0].node).toEqual(MISSING_NODE);
});


test('height', () => {
  const impl = Content.height;

  let vars = variables('800x400');
  impl.apply([], vars, null);
  expect(vars[0].get()).toEqual(400);

  vars = variables(undefined);
  impl.apply([], vars, null);
  expect(vars[0].node).toBe(MISSING_NODE);
});


pathseq('f-image-%N.html', 2).forEach(path => {
  test(`image - ${path}`, () => loader.execute(path));
});


pathseq('f-image-color-%N.html', 5).forEach(path => {
  test(`image color - ${path}`, () => loader.execute(path));
});


pathseq('f-video-%N.html', 3).forEach(path => {
  test(`video - ${path}`, () => loader.execute(path));
});


test('resize', () => {
  const heightForWidth = Content.resizedHeightForWidth;
  const widthForHeight = Content.resizedWidthForHeight;

  let vars = variables('100x200');
  heightForWidth.apply(['50'], vars, null);
  expect(vars[0].get()).toEqual(100);

  vars = variables('100x200');
  widthForHeight.apply(['50'], vars, null);
  expect(vars[0].get()).toEqual(25);

  vars = variables('1200x2400');
  heightForWidth.apply(['600'], vars, null);
  expect(vars[0].get()).toEqual(1200);

  vars = variables('1200x2400');
  widthForHeight.apply(['600'], vars, null);
  expect(vars[0].get()).toEqual(300);
});


test('squarespace thumbnail', () => {
  const thumbForWidth = Content.squarespaceThumbnailForWidth;
  const thumbForHeight = Content.squarespaceThumbnailForHeight;

  let vars = variables('100x200');
  thumbForWidth.apply(['50'], vars, null);
  expect(vars[0].get()).toEqual('100w');

  vars = variables('100x200');
  thumbForHeight.apply(['50'], vars, null);
  expect(vars[0].get()).toEqual('100w');

  vars = variables('1200x2400');
  thumbForWidth.apply(['600'], vars, null);
  expect(vars[0].get()).toEqual('750w');

  vars = variables('1200x2400');
  thumbForHeight.apply(['600'], vars, null);
  expect(vars[0].get()).toEqual('300w');
});


test('width', () => {
  const impl = Content.width;

  let vars = variables('800x400');
  impl.apply([], vars, null);
  expect(vars[0].get()).toEqual(800);

  vars = variables(undefined);
  impl.apply([], vars, null);
  expect(vars[0].node).toBe(MISSING_NODE);
});
