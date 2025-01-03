import { join } from 'path';
import { CLDR } from '@phensley/cldr';
import { framework } from '../cldr';
import { Context } from '../../src/context';
import { I18N_FORMATTERS as TABLE, RelativeTimeFormatter, TimeSinceFormatter } from '../../src/plugins/formatters.i18n';
import { Variable } from '../../src/variable';
import { TemplateTestLoader } from '../loader';

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

const formatDecimal = (cldr: CLDR | undefined, n: string, args: string[]) => {
  const impl = TABLE.decimal;
  const ctx = new Context({}, { cldr });
  const vars = variables(n);
  impl.apply(args, vars, ctx);
  return vars[0].get();
};

const formatMoney = (cldr: CLDR | undefined, n: any, args: string[], context: any = {}) => {
  const impl = TABLE.money;
  const ctx = new Context(context, { cldr });
  const vars = variables(n);
  impl.apply(args, vars, ctx);
  return vars[0].get();
};

const formatDatetime = (cldr: CLDR | undefined, epoch: string, zoneId: string, args: string[]) => {
  const impl = TABLE.datetime;
  const ctx = new Context({ website: { timeZone: zoneId } }, { cldr });
  const vars = variables(epoch);
  impl.apply(args, vars, ctx);
  return vars[0].get();
};

const formatMessage = (cldr: CLDR | undefined, msg: string, args: string[], context: any) => {
  const impl = TABLE.message;
  const ctx = new Context(context, { cldr });
  const vars = variables(msg);
  impl.apply(args, vars, ctx);
  return vars[0].get();
};

const formatInterval = (cldr: CLDR | undefined, start: number, end: number, zoneId: string, args: string[]) => {
  const impl = TABLE['datetime-interval'];
  const ctx = new Context({ website: { timeZone: zoneId } }, { cldr });
  const vars = variables(String(start), String(end));
  impl.apply(args, vars, ctx);
  return vars[0].get();
};

const formatRelativeTime = (cldr: CLDR | undefined, start: number | undefined, vars: Variable[], args: string[]) => {
  const impl = TABLE['relative-time'] as RelativeTimeFormatter;
  const ctx = new Context({}, { cldr, now: start });
  impl.apply(args, vars, ctx);
  return vars[0].get();
};

loader.paths('f-decimal-%N.html').forEach((path) => {
  test(`decimal - ${path}`, () => loader.execute(path));
});

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

  // Undefined cldr produces empty output
  expect(formatDecimal(undefined, big, args)).toEqual('');

  // Bad input
  expect(formatDecimal(EN, '"abcdef"', [])).toEqual('');
});

loader.paths('f-money-%N.html').forEach((path) => {
  test(`money - ${path}`, () => loader.execute(path));
});

test('money', () => {
  let args: string[] = [];
  let money: any = { decimalValue: '12345.67811111', currencyCode: 'USD' };
  expect(formatMoney(EN, money, args)).toEqual('$12,345.68');
  expect(formatMoney(DE, money, args)).toEqual('12.345,68 $');

  args = ['style:accounting'];
  money.decimalValue = '-175332.9999';
  expect(formatMoney(EN, money, args)).toEqual('($175,333.00)');
  expect(formatMoney(DE, money, args)).toEqual('-175.333,00 $');

  // Undefined cldr produces empty output
  expect(formatMoney(undefined, money, args)).toEqual('');

  // Bad input
  expect(formatMoney(EN, '"abdef"', [])).toEqual('');

  const badmoney = { decimalValue: 'abdef', currencyCode: 'USD' };
  expect(formatMoney(EN, badmoney, [])).toEqual('');

  // Use value and currency instead of decimalValue and currencyCode
  money = { value: '155900.799', currency: 'EUR' };
  let ctx: any = {};
  expect(formatMoney(EN, money, ['style:short'], ctx)).toEqual('€156K');
});

loader.paths('f-datetime-%N.html').forEach((path) => {
  test(`datetime - ${path}`, () => loader.execute(path));
});

test('datetime', () => {
  // March 12, 2018 5:48:54 PM UTC
  let d = '1520876934000';
  let args: string[] = [];
  expect(formatDatetime(EN, d, ZONE_NY, args)).toEqual('March 12, 2018');
  expect(formatDatetime(DE, d, ZONE_NY, args)).toEqual('12. März 2018');

  args = ['date:full', 'time:full'];
  expect(formatDatetime(EN, d, ZONE_NY, args)).toEqual('Monday, March 12, 2018 at 1:48:54 PM Eastern Daylight Time');
  expect(formatDatetime(DE, d, ZONE_NY, args)).toEqual(
    'Montag, 12. März 2018 um 13:48:54 Nordamerikanische Ostküsten-Sommerzeit',
  );

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

  // Undefined cldr produces empty output
  expect(formatDatetime(undefined, d, ZONE_NY, args)).toEqual('');

  // Bad input
  expect(formatDatetime(EN, '"abcdef"', ZONE_NY, args)).toEqual('');
});

test('japanese', () => {
  // March 12, 2018 5:48:54 PM UTC
  const d = '1520876934000';
  let args: string[] = [];
  expect(formatDatetime(JA, d, ZONE_NY, args)).toEqual('2018年3月12日');

  args = ['calendar:japanese'];
  expect(formatDatetime(JA, d, ZONE_NY, args)).toEqual('平成30年3月12日');

  args = ['date:short'];
  expect(formatDatetime(JA, d, ZONE_NY, args)).toEqual('2018/03/12');

  args = ['date:full'];
  expect(formatDatetime(JA, d, ZONE_NY, args)).toEqual('2018年3月12日月曜日');
});

loader.paths('f-datetime-interval-%N.html').forEach((path) => {
  test(`datetime-interval - ${path}`, () => loader.execute(path));
});

test('datetime-interval', () => {
  // March 12, 2018 5:48:54 PM UTC
  const start = 1520876934000;
  const args: string[] = [];
  expect(formatInterval(EN, start, start + 2000, ZONE_NY, args)).toEqual('1:48:54 PM');
  expect(formatInterval(EN, start, start + 12000, ZONE_NY, args)).toEqual('1:48 – 1:49 PM');
  expect(formatInterval(EN, start, start + ONE_DAY_MS, ZONE_NY, args)).toEqual('Mar 12 – 13, 2018');

  // Undefined cldr produces empty output
  expect(formatInterval(undefined, start, start + 2000, ZONE_NY, args)).toEqual('');

  // invalid
  expect(formatInterval(EN, start, Infinity, ZONE_NY, args)).toEqual('');
  expect(formatInterval(EN, Infinity, start, ZONE_NY, args)).toEqual('');
});

loader.paths('f-message-%N.html').forEach((path) => {
  test(`message - ${path}`, () => loader.execute(path));
});

loader.paths('f-message-plural-%N.html').forEach((path) => {
  test(`message plural - ${path}`, () => loader.execute(path));
});

test('message', () => {
  let ctx: any = { person: { name: 'Bob' } };
  let args = ['person.name'];
  expect(formatMessage(EN, 'Hi, {0}', args, ctx)).toEqual('Hi, Bob');

  args = ['name:person.name'];
  expect(formatMessage(EN, 'Hi, {name}', args, ctx)).toEqual('Hi, Bob');

  args = ['name=person.name'];
  expect(formatMessage(EN, 'Hi, {name}', args, ctx)).toEqual('Hi, Bob');

  ctx = { amount: { decimalValue: '12345.6789', currencyCode: 'USD' } };
  args = ['amount'];
  expect(formatMessage(EN, 'amt {0 currency}', args, ctx)).toEqual('amt $12,345.68');

  ctx = { epoch: 1582648395000 };
  args = ['epoch'];
  expect(formatMessage(EN, 'date {0 datetime}', args, ctx)).toEqual('date February 25, 2020');

  ctx = { website: { timeZone: 'America/Los_Angeles' }, epoch: 1582648395000 };
  args = ['epoch'];
  expect(formatMessage(EN, 'date {0 datetime time:full}', args, ctx)).toEqual('date 8:33:15 AM Pacific Standard Time');

  ctx = { n: '123456.789' };
  args = ['n'];
  expect(formatMessage(EN, 'num {0 decimal maximumFractionDigits:1}', args, ctx)).toEqual('num 123,456.8');

  ctx = { s: 1582648395000, e: 1583748395000 };
  args = ['s', 'e'];
  expect(formatMessage(EN, 'inv {0;1 datetime-interval}', args, ctx)).toEqual('inv Feb 25 – Mar 9, 2020');

  // Undefined cldr produces empty output
  expect(formatMessage(undefined, '{0}', args, ctx)).toEqual('');

  // Bad arguments
  ctx = { s: 'ABCDEF' };
  args = ['s'];
  expect(formatMessage(EN, '{0 decimal}', args, ctx)).toEqual('0');
  expect(formatMessage(EN, '{0 datetime}', args, ctx)).toEqual('');
});

loader.paths('f-relative-time-%N.html').forEach((path) => {
  test(`relative time - ${path}`, () => loader.execute(path));
});

test('relative time', () => {
  const base = new Date().getTime();
  const start = EN.Calendars.toGregorianDate({ date: base });
  const args: string[] = ['context:begin-sentence'];
  let e: number;

  e = start.add({ millis: 100 }).unixEpoch();
  expect(formatRelativeTime(EN, base, variables(e), args)).toEqual('Now');
  expect(formatRelativeTime(DE, base, variables(e), args)).toEqual('Jetzt');
  expect(formatRelativeTime(ES, base, variables(e), args)).toEqual('Ahora');

  expect(formatRelativeTime(EN, undefined, variables(base, e), args)).toEqual('Now');

  e = start.add({ millis: -100 }).unixEpoch();
  expect(formatRelativeTime(EN, base, variables(e), ['numericOnly:true'])).toEqual('0 seconds ago');

  e = start.add({ year: -1.6 }).unixEpoch();
  expect(formatRelativeTime(EN, base, variables(e), args)).toEqual('2 years ago');
  expect(formatRelativeTime(DE, base, variables(e), args)).toEqual('Vor 2 Jahren');
  expect(formatRelativeTime(ES, base, variables(e), args)).toEqual('Hace 2 años');

  expect(formatRelativeTime(EN, undefined, variables(base, e), args)).toEqual('2 years ago');

  e = start.add({ month: -6 }).unixEpoch();
  expect(formatRelativeTime(EN, base, variables(e), args)).toEqual('6 months ago');
  expect(formatRelativeTime(DE, base, variables(e), args)).toEqual('Vor 6 Monaten');
  expect(formatRelativeTime(ES, base, variables(e), args)).toEqual('Hace 6 meses');

  expect(formatRelativeTime(EN, undefined, variables(base, e), args)).toEqual('6 months ago');

  e = start.add({ day: -27 }).unixEpoch();
  expect(formatRelativeTime(EN, base, variables(e), args)).toEqual('4 weeks ago');
  expect(formatRelativeTime(DE, base, variables(e), args)).toEqual('Vor 4 Wochen');
  expect(formatRelativeTime(ES, base, variables(e), args)).toEqual('Hace 4 semanas');

  expect(formatRelativeTime(EN, undefined, variables(base, e), args)).toEqual('4 weeks ago');

  e = start.add({ hour: -27 }).unixEpoch();
  expect(formatRelativeTime(EN, base, variables(e), args)).toEqual('Yesterday');
  expect(formatRelativeTime(DE, base, variables(e), args)).toEqual('Gestern');
  expect(formatRelativeTime(ES, base, variables(e), args)).toEqual('Ayer');

  expect(formatRelativeTime(EN, undefined, variables(base, e), args)).toEqual('Yesterday');

  e = start.add({ minute: -27 }).unixEpoch();
  expect(formatRelativeTime(EN, base, variables(e), args)).toEqual('27 minutes ago');
  expect(formatRelativeTime(DE, base, variables(e), args)).toEqual('Vor 27 Minuten');
  expect(formatRelativeTime(ES, base, variables(e), args)).toEqual('Hace 27 minutos');

  expect(formatRelativeTime(EN, undefined, variables(base, e), args)).toEqual('27 minutes ago');

  // Undefined cldr produces empty output
  expect(formatRelativeTime(undefined, base, variables(e), args)).toEqual('');

  // Invalid type
  expect(formatRelativeTime(EN, base, variables('foo'), args)).toEqual('');
});

loader.paths('f-timesince-%N.html').forEach((path) => {
  test(`timesince - ${path}`, () => loader.execute(path));
});

const formatTimeSince = (cldr: CLDR | undefined, start: number | undefined, end: number, args: string[]) => {
  const impl = TABLE.timesince as TimeSinceFormatter;
  const ctx = new Context({}, { cldr, now: start });
  const vars = variables(end);
  impl.apply(args, vars, ctx);
  return vars[0].get();
};

test('timesince', () => {
  const base = new Date().getTime();
  const start = EN.Calendars.toGregorianDate({ date: base });
  const args: string[] = [];
  let e: number;

  e = start.add({ millis: 100 }).unixEpoch();
  expect(formatTimeSince(EN, base, e, args)).toContain('less than a minute ago');

  e = start.add({ year: -1.6 }).unixEpoch();
  expect(formatTimeSince(EN, base, e, args)).toContain('about a year ago');

  e = start.add({ month: -6 }).unixEpoch();
  expect(formatTimeSince(EN, base, e, args)).toContain('about 6 months ago');

  e = start.add({ day: -27 }).unixEpoch();
  expect(formatTimeSince(EN, base, e, args)).toContain('about 3 weeks ago');

  e = start.add({ hour: -27 }).unixEpoch();
  expect(formatTimeSince(EN, base, e, args)).toContain('about a day ago');

  e = start.add({ minute: -27 }).unixEpoch();
  expect(formatTimeSince(EN, base, e, args)).toContain('about 27 minutes ago');

  // base cldr produces empty output
  expect(formatTimeSince(undefined, base, e, args)).toEqual('Invalid date.');
});
