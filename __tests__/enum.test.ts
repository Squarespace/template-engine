import { enum_, EnumValue } from '../src/enum';

type Animal = EnumValue<'Animal'>;
const Animal = enum_('Animal', {
  CAT: [1, 'Cat'],
  DOG: [2, 'Dog'],
  FISH: [3, 'Fish']
});

test('basics', () => {
  expect(Animal.CAT.kind).toEqual('Animal');

  expect(Animal.CAT).toBe(Animal.CAT);
  expect(Animal.CAT).toEqual(Animal.CAT);

  expect(Animal.CAT).not.toBe(Animal.DOG);
  expect(Animal.CAT).not.toEqual(Animal.DOG);

  expect(Animal.fromCode(3)).toBe(Animal.FISH);
  expect(Animal.fromName('Cat')).toBe(Animal.CAT);
});

test('typed', () => {
  let animal: Animal;
  animal = Animal.CAT;
  expect(Animal.CAT).toEqual(animal);
  expect(Animal).not.toEqual(animal);
});

test('distinct', () => {
  const Other = enum_('Animal', {
    CAT: [1, 'Cat']
  });

  expect(Animal.CAT).not.toBe(Other.CAT);
  expect(Animal.CAT).toEqual(Other.CAT);
});

test('is-a', () => {
  const Other = enum_('Other', {
    CAT: [1, 'Cat']
  });

  expect(Animal.is(Animal.CAT)).toEqual(true);

  expect(Animal.is(Animal)).toEqual(false);
  expect(Animal.is('cat')).toEqual(false);
  expect(Animal.is(Other.CAT)).toEqual(false);
});

test('unique codes', () => {
  expect(() => enum_('Other', {
    FOO: [1, 'Foo'],
    BAR: [2, 'Bar'],
    BAZ: [1, 'Baz']
  })).toThrow(Error);
});

test('values', () => {
  expect(Animal.values()).toEqual([
    Animal.CAT, Animal.DOG, Animal.FISH
  ]);

  const Other = enum_('Other', {
    FOO: [17, 'Foo'],
    BAR: [-3, 'Bar'],
    QUUX: [10, 'Quux'],
    BAZ: [-123, 'Baz']
  });
  expect(Other.values()).toEqual([
    Other.BAZ, Other.BAR, Other.QUUX, Other.FOO
  ]);
});
