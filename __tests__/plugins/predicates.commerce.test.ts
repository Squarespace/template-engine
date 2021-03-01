import { join } from 'path';
import { TemplateTestLoader } from '../loader';

const loader = new TemplateTestLoader(join(__dirname, 'resources'));

loader.paths('p-has-variants-%N.html').forEach(path => {
  test(`has-variants - ${path}`, () => loader.execute(path));
});

test('on sale', () => {
  loader.execute('p-on-sale.html');
});

test('sold out', () => {
  loader.execute('p-sold-out.html');
});

test('varied prices', () => {
  loader.execute('p-varied-prices.html');
});
