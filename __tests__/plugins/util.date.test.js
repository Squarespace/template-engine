import { getMomentDateFormat, translateUnixToMoment } from '../../src/plugins/util.date';

import moment from 'moment-timezone';


test('translate unix to moment', () => {
  expect(translateUnixToMoment('%Y')).toEqual(['YYYY']);
  expect(translateUnixToMoment('%y')).toEqual(['YY']);
  expect(translateUnixToMoment('%%')).toEqual(['[%]']);
  expect(translateUnixToMoment('%Y foo [bar] baz %Y')).toEqual(['YYYY', '[ foo bar baz ]', 'YYYY']);
  expect(translateUnixToMoment('%y%Y')).toEqual(['YY', '[]', 'YYYY']);

  // Calculated fields. No direct format translation available.
  expect(translateUnixToMoment('%C')).toEqual([{ calc: 'century' }]);
  expect(translateUnixToMoment('%s')).toEqual([{ calc: 'epoch-seconds' }]);
});


test('get moment date format', () => {
  const instant = 1384518716400;
  const m = moment.tz(instant, 'UTC');
  const format = getMomentDateFormat(m, '%Y %C %s');
  expect(format).toEqual('YYYY[ ][20][ ][1384518716]');
});
