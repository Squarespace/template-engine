import { join } from 'path';
import { TemplateTestLoader } from '../loader';


const loader = new TemplateTestLoader(join(__dirname, 'resources'));


test('add-to-cart-btn', () => {
  loader.execute('f-add-to-cart-btn-1.html');
  loader.execute('f-add-to-cart-btn-2.html');
  loader.execute('f-add-to-cart-btn-3.html');
});


test('cart-quantity', () => {
  loader.execute('f-cart-quantity-1.html');
  loader.execute('f-cart-quantity-2.html');
});


test('cart-url', () => {
  loader.execute('f-cart-url-1.html');
});


test('from-price', () => {
  // TODO: these return double in Java and get formatted with trailing zero,
  // e.g. '100.0'. Javascript formats as '100'.
  loader.execute('f-from-price-1.html');
  loader.execute('f-from-price-2.html');
  loader.execute('f-from-price-3.html');
  loader.execute('f-from-price-4.html');
  loader.execute('f-from-price-5.html');
  loader.execute('f-from-price-6.html');
  loader.execute('f-from-price-7.html');
});


test('normal-price', () => {
  // TODO: these return double in Java and get formatted with trailing zero,
  // e.g. '100.0'. Javascript formats as '100'.
  loader.execute('f-normal-price-1.html');
  loader.execute('f-normal-price-2.html');
  loader.execute('f-normal-price-3.html');
  loader.execute('f-normal-price-4.html');
  loader.execute('f-normal-price-5.html');
  loader.execute('f-normal-price-6.html');
  loader.execute('f-normal-price-7.html');
});


test('product-checkout', () => {
  // TODO:
  // loader.execute('f-product-checkout-1.html');
});


test('sale-price', () => {
  // TODO: these return double in Java and get formatted with trailing zero,
  // e.g. '100.0'. Javascript formats as '100'.
  loader.execute('f-sale-price-1.html');
  loader.execute('f-sale-price-2.html');
  loader.execute('f-sale-price-3.html');
  loader.execute('f-sale-price-4.html');
  loader.execute('f-sale-price-5.html');
  loader.execute('f-sale-price-6.html');
  loader.execute('f-sale-price-7.html');
});
