import Content from '../../src/formatters/content';
import Context from '../../src/context';
import Engine from '../../src/engine';
import Variable from '../../src/variable';

const variables = (...n) => n.map((v, i) => new Variable('var' + i, v));

test('AbsUrl', () => {
  const impl = Content.AbsUrl;
  const ctx = new Context({ 'base-url': 'https://www.squarespace.com' });
  const vars = variables('foo/bar');
  impl.apply([], vars, ctx);
  expect(vars[0].get()).toEqual('https://www.squarespace.com/foo/bar');
});


test('audio-player', () => {
  const engine = new Engine();
  const impl = Content['audio-player'];
  const ctx = new Context({});
  ctx.engine = engine;
  const vars = variables({
    structuredContent: {
      audioAssetUrl: 'https://www.squarespace.com/favicon.ico',
    },
    id: '12345',
  });
  impl.apply([], vars, ctx);
  expect(vars[0].get()).toEqual(
    '<script>Y.use(\'squarespace-audio-player-frontend\');</script>' +
    '<div class="squarespace-audio-player" data-audio-asset-url="' +
    'https://www.squarespace.com/favicon.ico' +
    '" data-item-id="12345" id="audio-player-12345"' +
    '></div>'
  );
});


test('capitalize', () => {
  const impl = Content.capitalize;
  const vars = variables('abc');
  impl.apply([], vars, null);
  expect(vars[0].get()).toEqual('ABC');
});
