import dateutil from '../../src/formatters/dateutil';

test('translate', () => {
  expect(dateutil.translate('%Y')).toEqual(['YYYY']);
  expect(dateutil.translate('%y')).toEqual(['YY']);
  expect(dateutil.translate('%%')).toEqual(['[%]']);
  expect(dateutil.translate('%Y foo [bar] baz %Y')).toEqual(['YYYY', '[ foo bar baz ]', 'YYYY']);
  expect(dateutil.translate('%y%Y')).toEqual(['YY', '[]', 'YYYY']);

  // Calculated fields. No direct format translation available.
  expect(dateutil.translate('%C')).toEqual([{ calc: 'century' }]);
  expect(dateutil.translate('%s')).toEqual([{ calc: 'epoch-seconds' }]);
});
