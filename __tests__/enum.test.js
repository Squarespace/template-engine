import makeEnum from '../src/enum';


const Animal = makeEnum('Animal', {
  CAT: { code: 1, string: 'Cat' },
  DOG: { code: 2, string: 'Dog' },
  FISH: { code: 3, string: 'Fish' }
});


test('basics', () => {
  expect(Animal.constructor.name).toEqual('Animal');
  expect(Animal.CAT.constructor.name).toEqual('AnimalValue');

  expect(Animal.type()).toEqual('Animal');
  expect(Animal.CAT.type()).toEqual('AnimalValue');

  expect(Animal.CAT).toBe(Animal.CAT);
  expect(Animal.CAT).toEqual(Animal.CAT);

  expect(Animal.CAT).not.toBe(Animal.DOG);
  expect(Animal.CAT).not.toEqual(Animal.DOG);

  expect(Animal.fromCode(3)).toBe(Animal.FISH);
  expect(Animal.fromString('Cat')).toBe(Animal.CAT);
});


test('distinct', () => {
  const Other = makeEnum('Animal', {
    CAT: { code: 1, string: 'Cat' }
  });

  expect(Animal.CAT).not.toBe(Other.CAT);
  expect(Animal.CAT).toEqual(Other.CAT);
});


test('is-a', () => {
  const Other = makeEnum('Other', {
    CAT: { code: 1, string: 'Cat' }
  });

  expect(Animal.is(Animal.CAT)).toEqual(true);

  expect(Animal.is(Animal)).toEqual(false);
  expect(Animal.is('cat')).toEqual(false);
  expect(Animal.is(Other.CAT)).toEqual(false);
});


test('unique codes', () => {
  expect(() => makeEnum('Other', {
    FOO: { code: 1 },
    BAR: { code: 2 },
    BAZ: { code: 1 },
  })).toThrow(Error);
});


test('missing string', () => {
  const Other = makeEnum('Other', {
    FOO: { code: 1 },
    BAR: { code: 2 },
  });

  expect(Other.fromString('FOO')).toBe(Other.FOO);
});


test('missing code', () => {
  expect(() => makeEnum('Other', {
    FOO: { string: 'foo' }
  })).toThrow(Error);
});


test('values', () => {
  expect(Animal.values()).toEqual([
    Animal.CAT, Animal.DOG, Animal.FISH
  ]);

  const Other = makeEnum('Other', {
    FOO: { code: 17 },
    BAR: { code: -3 },
    QUUX: { code: 10 },
    BAZ: { code: -123 }
  });
  expect(Other.values()).toEqual([
    Other.BAZ, Other.BAR, Other.QUUX, Other.FOO
  ]);
});
