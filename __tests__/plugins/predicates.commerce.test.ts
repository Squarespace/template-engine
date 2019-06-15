import { join } from 'path';
import { TemplateTestLoader } from '../loader';


const loader = new TemplateTestLoader(join(__dirname, 'resources'));


test('has variants', () => {
  loader.execute('p-has-variants.html');
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
