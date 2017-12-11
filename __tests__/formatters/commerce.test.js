import Commerce from '../../src/formatters/commerce';
import Context from '../../src/context';
import Engine from '../../src/engine';
import Variable from '../../src/variable';


const variables = (...n) => n.map((v, i) => new Variable('var' + i, v));

// TODO: move entire test case to a file once test runner is complete

test('add-to-cart-btn', () => {
  const node = {
    item: {
      id: '560c37c1a7c8465c4a71d99a',
      collectionId: '560c37c1a7c8465c4a71d99b',
      structuredContent: {
        additionalFieldsFormId: '560c37c1a7c8465c4a71d99c',
        additionalFieldsForm: { name: 'TestForm', fields: [] },
        useCustomAddButtonText: true,
        customAddButtonText: 'Add This',
        productType: '1'
      }
    }
  };
  const engine = new Engine();
  const ctx = new Context(node);
  ctx.engine = engine;
  const impl = Commerce['add-to-cart-btn'];
  const vars = variables(node);
  impl.apply([], vars, ctx);

  expect(vars[0].get().trim()).toEqual(`<div class="sqs-add-to-cart-button-wrapper">
  <div class="sqs-add-to-cart-button sqs-suppress-edit-mode sqs-editable-button " data-collection-id="" data-item-id="" data-product-type="" data-use-custom-label="" data-original-label="Add To Cart" >
    <div class="sqs-add-to-cart-button-inner">Add To Cart</div>
  </div>
</div>`);
});
