import { hexColorToInt } from '../../src/plugins/util.color';



test('hex 3', () => {
  expect(hexColorToInt('xyz')).toEqual(-1);
});


test('hex 6', () => {
  expect(hexColorToInt('#000000')).toEqual(0);
  expect(hexColorToInt('ffffff')).toEqual(16777215);

  expect(hexColorToInt('a')).toEqual(-1);
  expect(hexColorToInt('xyzxyz')).toEqual(-1);
});