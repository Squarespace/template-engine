import { join } from 'path';
import { GregorianDate } from '../../src/calendars';
import { CompatLevel } from '../../src/compat/compat-level';
import { DATE_FORMATTERS as TABLE } from '../../src/plugins/formatters.date';
import { formatDate, mondayWeekOfYear } from '../../src/plugins/util.date';
import { Context } from '../../src/context';
import { Variable } from '../../src/variable';
import { framework } from '../cldr';
import { TemplateTestLoader } from '../loader';

const loader = new TemplateTestLoader(join(__dirname, 'resources'));

const variables = (...n: any[]) => n.map((v, i) => new Variable('var' + i, v));

// Week anchor test rows, ported from PluginDateUtilsTest in Java. All
// instants are UTC, so the week numbers do not depend on the system zone.
const JAN_01_2020_UTC = 1577836800000; // Wednesday
const JAN_01_2023_UTC = 1672531200000; // Sunday
const JAN_02_2023_UTC = 1672617600000; // Monday
const JUL_03_2023_UTC = 1688342400000; // Monday
const JUL_09_2023_UTC = 1688860800000; // Sunday
const DEC_31_2023_UTC = 1703980800000; // Sunday
const DEC_31_2024_UTC = 1735603200000; // Tuesday, leap year

loader.paths('f-date-%N.html').forEach((path) => {
  test(`date - ${path}`, () => loader.execute(path));
});

loader.paths('f-date-week-%N.html').forEach((path) => {
  test(`date - ${path}`, () => loader.execute(path));
});

// The timezone fixtures use hyphenated names the numbered globs above do
// not match, so run them directly. The first pins no level and runs at
// the default; the second pins level 3.
test('date timezone null', () => {
  loader.execute('f-date-timezone-null-1.html');
  loader.execute('f-date-timezone-null-2.html');
});

test('date', () => {
  const en = framework.get('en');

  const tz = (s: string) => {
    return { website: { timeZone: s } };
  };
  const losAngeles = tz('America/Los_Angeles');
  const paris = tz('Europe/Paris');
  const may2013 = 1368406800000;

  let ctx = new Context({}, { cldr: en });
  let vars = variables(may2013);
  TABLE.date.apply(['%c'], vars, ctx);
  expect(vars[0].get()).toEqual('Sun, May 12, 2013 9:00:00 PM EDT');

  vars = variables(may2013);
  TABLE.date.apply(['%Y %q %'], vars, ctx);
  expect(vars[0].get()).toEqual('2013 2 %');

  // Unknown directives echo % plus the char, as in the Java formatter.
  vars = variables(may2013);
  TABLE.date.apply(['%Y-%Q-%m'], vars, ctx);
  expect(vars[0].get()).toEqual('2013-%Q-05');

  // %% escapes a literal %, so the Q after it is plain text.
  vars = variables(may2013);
  TABLE.date.apply(['%%Q'], vars, ctx);
  expect(vars[0].get()).toEqual('%Q');

  // A lone trailing % is a literal.
  vars = variables(may2013);
  TABLE.date.apply(['%Y%'], vars, ctx);
  expect(vars[0].get()).toEqual('2013%');

  ctx = new Context(losAngeles, { cldr: en });
  vars = variables(may2013);
  TABLE.date.apply(['%c'], vars, ctx);
  expect(vars[0].get()).toEqual('Sun, May 12, 2013 6:00:00 PM PDT');

  ctx = new Context(losAngeles, { cldr: en });
  vars = variables(may2013 - 86400000 * 5);
  TABLE.date.apply(['%c'], vars, ctx);
  expect(vars[0].get()).toEqual('Tue, May 7, 2013 6:00:00 PM PDT');

  vars = variables(may2013);
  TABLE.date.apply(['%Y-%m-%d %H:%M:%S %Z'], vars, ctx);
  expect(vars[0].get()).toEqual('2013-05-12 18:00:00 PDT');

  vars = variables(may2013);
  TABLE.date.apply(['%C'], vars, ctx);
  expect(vars[0].get()).toEqual('20');

  vars = variables(may2013);
  TABLE.date.apply(['%s'], vars, ctx);
  expect(vars[0].get()).toEqual('1368406800');

  vars = variables(may2013);
  TABLE.date.apply([], vars, ctx);
  expect(vars[0].get()).toEqual('');

  ctx = new Context(paris, { cldr: en });
  vars = variables(may2013);
  TABLE.date.apply(['%c'], vars, ctx);
  expect(vars[0].get()).toEqual('Mon, May 13, 2013 3:00:00 AM CEST');

  const fr = framework.get('fr');
  ctx = new Context(paris, { cldr: fr });
  vars = variables(may2013);
  TABLE.date.apply(['%c'], vars, ctx);
  expect(vars[0].get()).toEqual('Mon, May 13, 2013 3:00:00 AM CEST');
  // TABLE.date.apply(['%c'], vars, ctx);
  // expect(vars[0].get()).toEqual('lun., mai 13, 2013 3:00:00 AM CEST');
});

test('all fields', () => {
  const en = framework.get('en');
  const nov2019 = 1573241320123;

  const ctx = new Context({}, { cldr: en });
  let vars = variables(nov2019);

  vars = variables(nov2019);
  TABLE.date.apply(['%a'], vars, ctx);
  expect(vars[0].get()).toEqual('Fri');

  vars = variables(nov2019);
  TABLE.date.apply(['%A'], vars, ctx);
  expect(vars[0].get()).toEqual('Friday');

  vars = variables(nov2019);
  TABLE.date.apply(['%b'], vars, ctx);
  expect(vars[0].get()).toEqual('Nov');

  vars = variables(nov2019);
  TABLE.date.apply(['%B'], vars, ctx);
  expect(vars[0].get()).toEqual('November');

  vars = variables(nov2019);
  TABLE.date.apply(['%c'], vars, ctx);
  expect(vars[0].get()).toEqual('Fri, Nov 8, 2019 2:28:40 PM EST');

  vars = variables(nov2019);
  TABLE.date.apply(['%D'], vars, ctx);
  expect(vars[0].get()).toEqual('11/08/19');

  vars = variables(nov2019);
  TABLE.date.apply(['%d'], vars, ctx);
  expect(vars[0].get()).toEqual('08');

  vars = variables(nov2019);
  TABLE.date.apply(['%d'], vars, ctx);
  expect(vars[0].get()).toEqual('08');

  vars = variables(nov2019);
  TABLE.date.apply(['%e'], vars, ctx);
  expect(vars[0].get()).toEqual(' 8');

  vars = variables(nov2019);
  TABLE.date.apply(['%F'], vars, ctx);
  expect(vars[0].get()).toEqual('2019-11-08');

  vars = variables(nov2019);
  TABLE.date.apply(['%g'], vars, ctx);
  expect(vars[0].get()).toEqual('19');

  vars = variables(nov2019);
  TABLE.date.apply(['%G'], vars, ctx);
  expect(vars[0].get()).toEqual('2019');

  vars = variables(nov2019);
  TABLE.date.apply(['%H'], vars, ctx);
  expect(vars[0].get()).toEqual('14');

  vars = variables(nov2019);
  TABLE.date.apply(['%h'], vars, ctx);
  expect(vars[0].get()).toEqual('Nov');

  vars = variables(nov2019);
  TABLE.date.apply(['%I'], vars, ctx);
  expect(vars[0].get()).toEqual('02');

  vars = variables(nov2019);
  TABLE.date.apply(['%j'], vars, ctx);
  expect(vars[0].get()).toEqual('312');

  vars = variables(nov2019);
  TABLE.date.apply(['%j'], vars, ctx);
  expect(vars[0].get()).toEqual('312');

  vars = variables(nov2019);
  TABLE.date.apply(['%k'], vars, ctx);
  expect(vars[0].get()).toEqual('14');

  vars = variables(nov2019);
  TABLE.date.apply(['%l'], vars, ctx);
  expect(vars[0].get()).toEqual(' 2');

  vars = variables(nov2019);
  TABLE.date.apply(['%m'], vars, ctx);
  expect(vars[0].get()).toEqual('11');

  vars = variables(nov2019);
  TABLE.date.apply(['%M'], vars, ctx);
  expect(vars[0].get()).toEqual('28');

  vars = variables(nov2019);
  TABLE.date.apply(['%n'], vars, ctx);
  expect(vars[0].get()).toEqual('\n');

  vars = variables(nov2019);
  TABLE.date.apply(['%N'], vars, ctx);
  expect(vars[0].get()).toEqual('123000000');

  vars = variables(nov2019);
  TABLE.date.apply(['%p'], vars, ctx);
  expect(vars[0].get()).toEqual('PM');

  vars = variables(nov2019);
  TABLE.date.apply(['%p'], vars, ctx);
  expect(vars[0].get()).toEqual('PM');

  vars = variables(nov2019);
  TABLE.date.apply(['%q'], vars, ctx);
  expect(vars[0].get()).toEqual('4');

  vars = variables(nov2019);
  TABLE.date.apply(['%r'], vars, ctx);
  expect(vars[0].get()).toEqual('2:28:40 PM');

  vars = variables(nov2019);
  TABLE.date.apply(['%s'], vars, ctx);
  expect(vars[0].get()).toEqual('1573241320');

  vars = variables(nov2019);
  TABLE.date.apply(['%S'], vars, ctx);
  expect(vars[0].get()).toEqual('40');

  vars = variables(nov2019);
  TABLE.date.apply(['%t'], vars, ctx);
  expect(vars[0].get()).toEqual('\t');

  vars = variables(nov2019);
  TABLE.date.apply(['%T'], vars, ctx);
  expect(vars[0].get()).toEqual('14:28:40');

  vars = variables(nov2019);
  TABLE.date.apply(['%u'], vars, ctx);
  expect(vars[0].get()).toEqual('5');

  vars = variables(nov2019);
  TABLE.date.apply(['%w'], vars, ctx);
  expect(vars[0].get()).toEqual('5');

  vars = variables(nov2019);
  TABLE.date.apply(['%W'], vars, ctx);
  expect(vars[0].get()).toEqual('45');

  vars = variables(nov2019);
  TABLE.date.apply(['%x'], vars, ctx);
  expect(vars[0].get()).toEqual('11/08/2019');

  vars = variables(nov2019);
  TABLE.date.apply(['%X'], vars, ctx);
  expect(vars[0].get()).toEqual('02:28:40 PM');

  vars = variables(nov2019);
  TABLE.date.apply(['%y'], vars, ctx);
  expect(vars[0].get()).toEqual('19');

  vars = variables(nov2019);
  TABLE.date.apply(['%Y'], vars, ctx);
  expect(vars[0].get()).toEqual('2019');

  vars = variables(nov2019);
  TABLE.date.apply(['%z'], vars, ctx);
  expect(vars[0].get()).toEqual('-05:00');

  vars = variables(nov2019);
  TABLE.date.apply(['%Z'], vars, ctx);
  expect(vars[0].get()).toEqual('EST');
});

test('week number released vs fixed', () => {
  const fmt = (f: string, epoch: number, legacy = true) =>
    formatDate(GregorianDate.fromUnixEpoch(epoch, 'UTC'), f, legacy);

  // Released behavior: %W is Sunday anchored and duplicates %U.
  // Sunday 2023-01-01 is week 01 Sunday-based, ISO week 52 of 2022.
  expect(fmt('%U %W %V', JAN_01_2023_UTC)).toEqual('01 01 52');
  // Wednesday 2020-01-01 is before the first Monday but in the first
  // Sunday-based and ISO weeks of 2020.
  expect(fmt('%U %W %V', JAN_01_2020_UTC)).toEqual('01 01 01');
  // Sunday 2023-07-09 starts a new Sunday-based week but not a Monday one.
  expect(fmt('%U %W %V', JUL_09_2023_UTC)).toEqual('28 28 27');

  // Fixed behavior: %W is Monday anchored per POSIX.
  expect(fmt('%U %W %V', JAN_01_2023_UTC, false)).toEqual('01 00 52');
  // Before the first Monday of the year is week 00 even when the date
  // sits in week 1 Sunday-based and ISO.
  expect(fmt('%U %W %V', JAN_01_2020_UTC, false)).toEqual('01 00 01');
  // The Monday after starts the first Monday-anchored week.
  expect(fmt('%W', JAN_02_2023_UTC, false)).toEqual('01');
  // A mid-year Monday and the following Sunday are in the same %W week.
  expect(fmt('%W', JUL_03_2023_UTC, false)).toEqual('27');
  expect(fmt('%W', JUL_09_2023_UTC, false)).toEqual('27');
  // Year end, and a 53-week Monday-anchored year (2024 leap, Jan 1 Monday).
  expect(fmt('%W', DEC_31_2023_UTC, false)).toEqual('52');
  expect(fmt('%W', DEC_31_2024_UTC, false)).toEqual('53');

  // %U and %V anchor on Sunday and ISO weeks; the %W level change never
  // moves them. Checked on every date above, and pinned on two rows.
  const all = [JAN_01_2020_UTC, JAN_01_2023_UTC, JAN_02_2023_UTC, JUL_03_2023_UTC, JUL_09_2023_UTC,
    DEC_31_2023_UTC, DEC_31_2024_UTC];
  all.forEach((epoch) => {
    expect(fmt('%U %V', epoch)).toEqual(fmt('%U %V', epoch, false));
  });
  expect(fmt('%U %V', JAN_01_2023_UTC)).toEqual('01 52');
  // Tuesday 2024-12-31 sits in the week that rolls into 2025 for both
  // Sunday-based and ISO numbering.
  expect(fmt('%U %V', DEC_31_2024_UTC)).toEqual('01 01');
});

test('mondayWeekOfYear', () => {
  // POSIX %W: the first Monday of the year starts week 1; before it is
  // week 00. jan1Dow is Jan 1's day of week, 1=Sun..7=Sat.
  // Jan 1 on Sunday (2023, 2029): the first Monday is Jan 2.
  expect(mondayWeekOfYear(1, 1)).toEqual(0);
  expect(mondayWeekOfYear(2, 1)).toEqual(1);
  expect(mondayWeekOfYear(8, 1)).toEqual(1);
  expect(mondayWeekOfYear(9, 1)).toEqual(2);
  // Jan 1 on Monday (2024): week 1 starts Jan 1.
  expect(mondayWeekOfYear(1, 2)).toEqual(1);
  expect(mondayWeekOfYear(7, 2)).toEqual(1);
  expect(mondayWeekOfYear(8, 2)).toEqual(2);
  // Jan 1 on Tuesday (2019): the first Monday is Jan 7.
  expect(mondayWeekOfYear(1, 3)).toEqual(0);
  expect(mondayWeekOfYear(6, 3)).toEqual(0);
  expect(mondayWeekOfYear(7, 3)).toEqual(1);
  // Jan 1 on Wednesday (2020): the first Monday is Jan 6.
  expect(mondayWeekOfYear(5, 4)).toEqual(0);
  expect(mondayWeekOfYear(6, 4)).toEqual(1);
  // Jan 1 on Thursday (2015): the first Monday is Jan 5.
  expect(mondayWeekOfYear(4, 5)).toEqual(0);
  expect(mondayWeekOfYear(5, 5)).toEqual(1);
  // Jan 1 on Friday (2021): the first Monday is Jan 4.
  expect(mondayWeekOfYear(3, 6)).toEqual(0);
  expect(mondayWeekOfYear(4, 6)).toEqual(1);
  // Jan 1 on Saturday (2022): the first Monday is Jan 3.
  expect(mondayWeekOfYear(2, 7)).toEqual(0);
  expect(mondayWeekOfYear(3, 7)).toEqual(1);
});

test('week formatter levels', () => {
  const en = framework.get('en');
  const utc = { website: { timeZone: 'UTC' } };

  // The default context uses level 0: %W is Sunday anchored.
  let ctx = new Context(utc, { cldr: en });
  let vars = variables(JAN_01_2023_UTC);
  TABLE.date.apply(['%U %W %V'], vars, ctx);
  expect(vars[0].get()).toEqual('01 01 52');

  // A fixed context switches %W to the Monday anchor; %U and %V hold.
  ctx = new Context(utc, { cldr: en, compat: CompatLevel.fixed() });
  vars = variables(JAN_01_2023_UTC);
  TABLE.date.apply(['%U %W %V'], vars, ctx);
  expect(vars[0].get()).toEqual('01 00 52');

  vars = variables(DEC_31_2024_UTC);
  TABLE.date.apply(['%W'], vars, ctx);
  expect(vars[0].get()).toEqual('53');
});

test('null timeZone literal', () => {
  const en = framework.get('en');
  // 2023-01-01T05:00:00Z, the instant both Java fixtures pin. The UTC
  // reading is 2023-01-01 and the NY reading is a day earlier.
  const EPOCH = 1672542000000;
  const UTC = '2023-01-01';
  const NY = '2022-12-31';
  const LEVELS = [CompatLevel.defaultLevel(), CompatLevel.at(1), CompatLevel.at(2), CompatLevel.at(3), CompatLevel.fixed()];

  const render = (json: any, compat: CompatLevel) => {
    const ctx = new Context(json, { cldr: en, compat });
    const vars = variables(EPOCH);
    TABLE.date.apply(['%Y-%m-%d'], vars, ctx);
    return vars[0].get();
  };

  // A null zone reads as an empty string below the threshold and the zone
  // lookup falls back to UTC. The fixed level treats it like missing.
  for (const compat of [CompatLevel.defaultLevel(), CompatLevel.at(1), CompatLevel.at(2)]) {
    expect(render({ website: { timeZone: null } }, compat)).toEqual(UTC);
  }
  for (const compat of [CompatLevel.at(3), CompatLevel.fixed()]) {
    expect(render({ website: { timeZone: null } }, compat)).toEqual(NY);
  }

  // A missing zone is the NY default at every level.
  for (const compat of LEVELS) {
    expect(render({}, compat)).toEqual(NY);
  }

  // Explicit zones pass through at every level: UTC stays UTC, NY stays NY.
  for (const compat of LEVELS) {
    expect(render({ website: { timeZone: 'UTC' } }, compat)).toEqual(UTC);
    expect(render({ website: { timeZone: 'America/New_York' } }, compat)).toEqual(NY);
  }

  // An empty string is not null and passes through to the UTC fallback at
  // every level, the over-broad-handling guard.
  for (const compat of LEVELS) {
    expect(render({ website: { timeZone: '' } }, compat)).toEqual(UTC);
  }
});
