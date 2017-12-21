import Compiler from '../../src';
import Content from '../../src/plugins/formatters.content';
import Context from '../../src/context';
import { MISSING_NODE } from '../../src/node';
import { Image } from '../helpers';
import { TemplateTestLoader } from '../loader';
import Variable from '../../src/variable';


const IMAGE = new Image();

const loader = new TemplateTestLoader(__dirname);

const variables = (...n) => n.map((v, i) => new Variable('var' + i, v));


test('AbsUrl', () => {
  const impl = Content.AbsUrl;
  const ctx = new Context({ 'base-url': 'https://www.squarespace.com' });
  const vars = variables('foo/bar');
  impl.apply([], vars, ctx);
  expect(vars[0].get()).toEqual('https://www.squarespace.com/foo/bar');
});


test('audio-player', () => {
  loader.execute('./resources/f-audio-player-1.html');
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


test('image', () => {
  loader.execute('./resources/f-image-1.html');
  loader.execute('./resources/f-image-2.html');
});


test('image color', () => {
  loader.execute('./resources/f-image-color-1.html');
  loader.execute('./resources/f-image-color-2.html');
  loader.execute('./resources/f-image-color-3.html');
  loader.execute('./resources/f-image-color-4.html');
  loader.execute('./resources/f-image-color-5.html');
});
