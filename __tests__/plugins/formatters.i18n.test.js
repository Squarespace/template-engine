import { framework } from '../cldr';
import Context from '../../src/context';
import { TABLE as I18N } from '../../src/plugins/formatters.i18n';
import Variable from '../../src/variable';

const variables = (...n) => n.map((v, i) => new Variable('var' + i, v));

const EN = framework.get('en');
const DE = framework.get('de');

const ZONE_NY = 'America/New_York';
const ZONE_LA = 'America/Los_Angeles';
const ZONE_LON = 'Europe/London';

const formatDecimal = (engine, n, args) => {
  const impl = I18N.decimal;
  const ctx = new Context({}, { cldr: engine });
  const vars = variables(n);
  impl.apply(args, vars, ctx);
  return vars[0].get();
};

const formatGregorian = (engine, epoch, zoneId, args) => {
  const impl = I18N.datetime;
  const ctx = new Context({ website: { timeZone: zoneId } }, { cldr: engine });
  const vars = variables(epoch);
  impl.apply(args, vars, ctx);
  return vars[0].get();
};

test('decimal', () => {
  let args = ['group'];
  expect(formatDecimal(EN, '12345.67811111', args)).toEqual('12,345.678');
  expect(formatDecimal(DE, '12345.67811111', args)).toEqual('12.345,678');

  args = ['group', 'maxfrac:1'];
  expect(formatDecimal(EN, '12345.67811111', args)).toEqual('12,345.7');
  expect(formatDecimal(DE, '12345.67811111', args)).toEqual('12.345,7');

  const big = String(Number.MAX_SAFE_INTEGER);
  args = ['group', 'style:long'];
  expect(formatDecimal(EN, big, args)).toEqual('9,007 trillion');
  expect(formatDecimal(DE, big, args)).toEqual('9.007 Billionen');
});

test('datetime', () => {
  // March 12, 2018 5:48:54 PM UTC
  const d = '1520876934000';
  let args = [];
  expect(formatGregorian(EN, d, ZONE_NY, args)).toEqual('March 12, 2018');
  expect(formatGregorian(DE, d, ZONE_NY, args)).toEqual('12. März 2018');

  args = ['date:full', 'time:full'];
  expect(formatGregorian(EN, d, ZONE_NY, args))
    .toEqual('Monday, March 12, 2018 at 1:48:54 PM Eastern Daylight Time');
  expect(formatGregorian(DE, d, ZONE_NY, args))
    .toEqual('Montag, 12. März 2018 um 13:48:54 Nordamerikanische Ostküsten-Sommerzeit');

  args = ['time:medium'];
  expect(formatGregorian(EN, d, ZONE_LON, args)).toEqual('5:48:54 PM');
  expect(formatGregorian(EN, d, ZONE_NY, args)).toEqual('1:48:54 PM');
  expect(formatGregorian(EN, d, ZONE_LA, args)).toEqual('10:48:54 AM');

  // TODO:
  // args = ['skeleton:EyMMMd']
  // expect(formatGregorian(EN, d, ZONE_NY, args)).toEqual('');
});
