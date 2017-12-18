import Compiler from '../../src';
import Content from '../../src/plugins/formatters.content';
import Context from '../../src/context';
import { TemplateTestLoader } from '../loader';
import Variable from '../../src/variable';



const compiler = new Compiler();
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
  const spec = loader.load('./resources/f-audio-player-1.html');
  const { ctx } = compiler.execute({ code: spec.TEMPLATE, json: spec.JSON });
  const output = ctx.render();
  expect(output.trim()).toEqual(spec.OUTPUT);
});


test('capitalize', () => {
  const impl = Content.capitalize;
  const vars = variables('abc');
  impl.apply([], vars, null);
  expect(vars[0].get()).toEqual('ABC');
});
