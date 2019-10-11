import { CLDR } from '@phensley/cldr';
import { framework } from '../cldr';
import { Context } from '../../src/context';
import { I18N_FORMATTERS as TABLE, TimeSinceFormatter } from '../../src/plugins/formatters.i18n';
import { Variable } from '../../src/variable';

const variables = (...n: any[]) => n.map((v, i) => new Variable('var' + i, v));

const EN = framework.get('en');
const DE = framework.get('de');
const ES = framework.get('es');

const ZONE_NY = 'America/New_York';
const ZONE_LA = 'America/Los_Angeles';
const ZONE_LON = 'Europe/London';

const formatDecimal = (engine: CLDR, n: string, args: string[]) => {
  const impl = TABLE.decimal;
  const ctx = new Context({}, { cldr: engine });
  const vars = variables(n);
  impl.apply(args, vars, ctx);
  return vars[0].get();
};

const formatGregorian = (engine: CLDR, epoch: string, zoneId: string, args: string[]) => {
  const impl = TABLE.datetime;
  const ctx = new Context({ website: { timeZone: zoneId } }, { cldr: engine });
  const vars = variables(epoch);
  impl.apply(args, vars, ctx);
  return vars[0].get();
};

const formatTimeSince = (engine: CLDR, start: Date, end: number, args: string[]) => {
  const impl = TABLE.timesince as TimeSinceFormatter;
  // 'timesince' formatter computes relative to now, so use a special
  // property on the formatter to set "now"
  impl.NOW = start;
  const ctx = new Context({ }, { cldr: engine });
  const vars = variables(end);
  impl.apply(args, vars, ctx);
  return vars[0].get();
};

test('decimal', () => {
  let args: string[] = ['group'];
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
  let args: string[] = [];
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

test('timesince', () => {
  const base = new Date();
  const start = EN.Calendars.toGregorianDate(base);
  const args: string[] = [];
  let e: number;

  e = start.add({ millis: 100 }).unixEpoch();
  expect(formatTimeSince(EN, base, e, args)).toEqual('Now');
  expect(formatTimeSince(DE, base, e, args)).toEqual('Jetzt');
  expect(formatTimeSince(ES, base, e, args)).toEqual('Ahora');

  e = start.add({ year: -1.6 }).unixEpoch();
  expect(formatTimeSince(EN, base, e, args)).toEqual('2 years ago');
  expect(formatTimeSince(DE, base, e, args)).toEqual('Vor 2 Jahren');
  expect(formatTimeSince(ES, base, e, args)).toEqual('Hace 2 años');

  e = start.add({ month: -6 }).unixEpoch();
  expect(formatTimeSince(EN, base, e, args)).toEqual('6 months ago');
  expect(formatTimeSince(DE, base, e, args)).toEqual('Vor 6 Monaten');
  expect(formatTimeSince(ES, base, e, args)).toEqual('Hace 6 meses');

  e = start.add({ day: -27 }).unixEpoch();
  expect(formatTimeSince(EN, base, e, args)).toEqual('4 weeks ago');
  expect(formatTimeSince(DE, base, e, args)).toEqual('Vor 4 Wochen');
  expect(formatTimeSince(ES, base, e, args)).toEqual('Hace 4 semanas');

  e = start.add({ hour: -27 }).unixEpoch();
  expect(formatTimeSince(EN, base, e, args)).toEqual('Yesterday');
  expect(formatTimeSince(DE, base, e, args)).toEqual('Gestern');
  expect(formatTimeSince(ES, base, e, args)).toEqual('Ayer');

  e = start.add({ minute: -27 }).unixEpoch();
  expect(formatTimeSince(EN, base, e, args)).toEqual('27 minutes ago');
  expect(formatTimeSince(DE, base, e, args)).toEqual('Vor 27 Minuten');
  expect(formatTimeSince(ES, base, e, args)).toEqual('Hace 27 minutos');
});
