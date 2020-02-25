import { join } from 'path';
import { CLDR } from '@phensley/cldr';
import { framework } from '../cldr';
import { Context } from '../../src/context';
import { I18N_FORMATTERS as TABLE, TimeSinceFormatter } from '../../src/plugins/formatters.i18n';
import { Variable } from '../../src/variable';
import { TemplateTestLoader } from '../loader';
import { pathseq } from '../helpers';

const loader = new TemplateTestLoader(join(__dirname, 'resources'));

const variables = (...n: any[]) => n.map((v, i) => new Variable('var' + i, v));

const EN = framework.get('en');
const DE = framework.get('de');
const ES = framework.get('es');
const JA = framework.get('ja');

const ZONE_NY = 'America/New_York';
const ZONE_LA = 'America/Los_Angeles';
const ZONE_LON = 'Europe/London';

const ONE_DAY_MS = 86400 * 1000;

const formatDecimal = (engine: CLDR, n: string, args: string[]) => {
  const impl = TABLE.decimal;
  const ctx = new Context({}, { cldr: engine });
  const vars = variables(n);
  impl.apply(args, vars, ctx);
  return vars[0].get();
};

const formatMoney = (engine: CLDR, n: any, args: string[]) => {
  const impl = TABLE.money;
  const ctx = new Context({}, { cldr: engine });
  const vars = variables(n);
  impl.apply(args, vars, ctx);
  return vars[0].get();
};

const formatDatetime = (engine: CLDR, epoch: string, zoneId: string, args: string[]) => {
  const impl = TABLE.datetime;
  const ctx = new Context({ website: { timeZone: zoneId } }, { cldr: engine });
  const vars = variables(epoch);
  impl.apply(args, vars, ctx);
  return vars[0].get();
};

const formatMessage = (engine: CLDR, msg: string, args: string[], context: any) => {
  const impl = TABLE.message;
  const ctx = new Context(context, { cldr: engine });
  const vars = variables(msg);
  impl.apply(args, vars, ctx);
  return vars[0].get();
};

const formatInterval = (engine: CLDR, start: number, end: number, zoneId: string, args: string[]) => {
  const impl = TABLE['datetime-interval'];
  const ctx = new Context({ website: { timeZone: zoneId } }, { cldr: engine });
  const vars = variables(String(start), String(end));
  impl.apply(args, vars, ctx);
  return vars[0].get();
};

const formatTimeSince = (engine: CLDR, start: Date, end: number, args: string[]) => {
  const impl = TABLE.timesince as TimeSinceFormatter;
  // 'timesince' formatter computes relative to now, so use a special
  // property on the formatter to set "now"
  impl.NOW = start;
  const ctx = new Context({}, { cldr: engine });
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

test('money', () => {
  let args: string[] = [];
  const money = { decimalValue: '12345.67811111', currencyCode: 'USD' };
  expect(formatMoney(EN, money, args)).toEqual('$12,345.68');
  expect(formatMoney(DE, money, args)).toEqual('12.345,68 $');

  args = ['style:accounting'];
  money.decimalValue = '-175332.9999';
  expect(formatMoney(EN, money, args)).toEqual('($175,333.00)');
  expect(formatMoney(DE, money, args)).toEqual('-175.333,00 $');
});

test('datetime', () => {
  // March 12, 2018 5:48:54 PM UTC
  let d = '1520876934000';
  let args: string[] = [];
  expect(formatDatetime(EN, d, ZONE_NY, args)).toEqual('March 12, 2018');
  expect(formatDatetime(DE, d, ZONE_NY, args)).toEqual('12. März 2018');

  args = ['date:full', 'time:full'];
  expect(formatDatetime(EN, d, ZONE_NY, args))
    .toEqual('Monday, March 12, 2018 at 1:48:54 PM Eastern Daylight Time');
  expect(formatDatetime(DE, d, ZONE_NY, args))
    .toEqual('Montag, 12. März 2018 um 13:48:54 Nordamerikanische Ostküsten-Sommerzeit');

  args = ['time:medium'];
  expect(formatDatetime(EN, d, ZONE_LON, args)).toEqual('5:48:54 PM');
  expect(formatDatetime(EN, d, ZONE_NY, args)).toEqual('1:48:54 PM');
  expect(formatDatetime(EN, d, ZONE_LA, args)).toEqual('10:48:54 AM');

  // Mixed date/time and skeleton
  args = ['date:medium', 'time:Bh'];
  expect(formatDatetime(EN, d, ZONE_NY, args)).toEqual('Mar 12, 2018, 1 in the afternoon');

  d = '1509647217000';
  args = [];
  expect(formatDatetime(EN, d, ZONE_NY, args)).toEqual('November 2, 2017');
  expect(formatDatetime(DE, d, ZONE_NY, args)).toEqual('2. November 2017');

  args = ['skeleton:EyMMMd'];
  expect(formatDatetime(EN, d, ZONE_NY, args)).toEqual('Thu, Nov 2, 2017');
});

test('japanese', () => {
  // March 12, 2018 5:48:54 PM UTC
  const d = '1520876934000';
  let args: string[] = [];
  expect(formatDatetime(JA, d, ZONE_NY, args)).toEqual('平成30年3月12日');

  args = ['date:short'];
  expect(formatDatetime(JA, d, ZONE_NY, args)).toEqual('H30/3/12');

  args = ['date:full'];
  expect(formatDatetime(JA, d, ZONE_NY, args)).toEqual('平成30年3月12日月曜日');
});

test('datetime-interval', () => {
  // March 12, 2018 5:48:54 PM UTC
  const start = 1520876934000;
  const args: string[] = [];
  expect(formatInterval(EN, start, start + 2000, ZONE_NY, args)).toEqual('1:48:54 PM');
  expect(formatInterval(EN, start, start + 12000, ZONE_NY, args)).toEqual('1:48 – 1:49 PM');
  expect(formatInterval(EN, start, start + ONE_DAY_MS, ZONE_NY, args)).toEqual('Mar 12 – 13, 2018');
});

pathseq('f-message-%N.html', 1).forEach(path => {
  test(`comment count - ${path}`, () => loader.execute(path));
});

test('message', () => {
  const ctx: any = { person: { name: 'Bob' } };
  let args = ['person.name'];
  expect(formatMessage(EN, 'Hi, {0}', args, ctx)).toEqual('Hi, Bob');

  args = ['name:person.name'];
  expect(formatMessage(EN, 'Hi, {name}', args, ctx)).toEqual('Hi, Bob');

  args = ['name=person.name'];
  expect(formatMessage(EN, 'Hi, {name}', args, ctx)).toEqual('Hi, Bob');
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
