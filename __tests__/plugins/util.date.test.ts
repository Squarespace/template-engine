import { translateUnixToCLDR } from '../../src/plugins/util.date';

test('translate unix to moment', () => {
  expect(translateUnixToCLDR('%Y')).toEqual(['y']);
  expect(translateUnixToCLDR('%y')).toEqual(['yy']);
  expect(translateUnixToCLDR('%%')).toEqual(["'%'"]);
  expect(translateUnixToCLDR('%Y foo [bar] baz %Y')).toEqual(['y', "' foo [bar] baz '", 'y']);
  expect(translateUnixToCLDR('%y%Y')).toEqual(['yy', 'y']);

  // Calculated fields. No direct format translation available.
  expect(translateUnixToCLDR('%C')).toEqual([{ calc: 'century' }]);
  expect(translateUnixToCLDR('%s')).toEqual([{ calc: 'epoch-seconds' }]);
});
