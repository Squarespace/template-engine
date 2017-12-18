import { CollectionType, ProductType } from '../../src/plugins/enums';


test('enums', () => {
  expect(CollectionType.fromString('gallery-block')).toBe(CollectionType.GALLERY_BLOCK);
  expect(ProductType.fromCode(2)).toBe(ProductType.DIGITAL);
});
