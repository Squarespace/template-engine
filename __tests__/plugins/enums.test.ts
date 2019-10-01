import { CollectionType, ProductType } from '../../src/plugins/enums';

test('enums', () => {
  expect(CollectionType.fromName('gallery-block')).toBe(CollectionType.GALLERY_BLOCK);
  expect(ProductType.fromCode(2)).toBe(ProductType.DIGITAL);
});
