import { CLDR, GregorianDate, ISO8601Date } from '@phensley/cldr-core';

interface Calc {
  calc: string;
}

/**
 * Maps legacy Unix date pattern to CLDR form:
 * https://www.unicode.org/reports/tr35/tr35-dates.html#Date_Format_Patterns
 */
const UNIX_TO_CLDR_FORMATS: { [field: string]: string | Calc } = {

  // %a     locale's abbreviated weekday name (e.g., Sun)
  a: 'E',

  // %A     locale's full weekday name (e.g., Sunday)
  A: 'EEEE',

  // %b     locale's abbreviated month name (e.g., Jan)
  b: 'MMM',

  // %B     locale's full month name (e.g., January)
  B: 'MMMM',

  // %c     locale's date and time (e.g., Thu Mar  3 23:05:25 2005)
  c: 'E, MMM d, y h:mm:ss a z',

  // %C     century; like %Y, except omit last two digits (e.g., 20)
  C: { calc: 'century' },

  // %D     date; same as %m/%d/%y
  D: 'MM/dd/yy',

  // %d     day of month (e.g., 01)
  d: 'dd',

  // %e     day of month, space padded; same as %_d
  e: { calc: 'day-space' },

  // %F     full date; same as %Y-%m-%d
  F: 'y-MM-dd',

  // %g     last two digits of year of ISO week number (see %G)
  g: { calc: 'iso-week-number-year-2' },

  // %G     year of ISO week number (see %V); normally useful only with %V
  G: { calc: 'iso-week-number-year' },

  // %h     same as %b
  h: 'MMM',

  // %H     hour (00..23)
  H: 'HH',

  // %I     hour (01..12)
  I: 'hh',

  // %j     day of year (001..366)
  j: 'DDD',

  // %k     hour, space padded ( 0..23); same as %H
  k: { calc: 'hour-24-space' },

  // %l     hour, space padded ( 1..12); same as %I
  l: { calc: 'hour-12-space' },

  // %m     month (01..12)
  m: 'MM',

  // %M     minute (00..59)
  M: 'mm',

  // %n     a newline
  n: '\n',

  // %N     nanoseconds (000000000..999999999)
  N: 'SSSSSSSSS',

  // %p     locale's equivalent of either AM or PM; blank if not known
  p: 'a',

  // %P     like %p, but lower case
  P: 'a',

  // %q     quarter of year (1..4)
  q: 'Q',

  // %r     locale's 12-hour clock time (e.g., 11:11:04 PM)
  r: 'h:mm:ss a',

  // %R     24-hour hour and minute; same as %H:%M
  R: '%H:%M',

  // %s     seconds since 1970-01-01 00:00:00 UTC
  s: { calc: 'epoch-seconds' },

  // %S     second (00..60)
  S: 'ss',

  // %t     a tab
  t: '\t',

  // %T     time; same as %H:%M:%S
  T: 'HH:mm:ss',

  // %u     day of week (1..7); 1 is Monday
  u: { calc: 'day-of-week-1' },

  // %U     week number of year, with Sunday as first day of week (00..53)
  U: '', // TODO: not supported directly in moment. %U range is 00-53, moment has no comparable field.

  // %w     day of week (0..6); 0 is Sunday
  w: { calc: 'day-of-week-2' },

  // %W     week number of year, with Monday as first day of week (00..53)
  W: 'ww',

  // %x     locale's date representation (e.g., 12/31/99)
  x: 'MM/dd/yy',

  // %X     locale's time representation (e.g., 23:13:48)
  X: 'h:mm:ss a',

  // %y     last two digits of year (00..99)
  y: 'yy',

  // %Y     year
  Y: 'y',

  // %z     +hhmm numeric time zone (e.g., -0400)
  z: 'ZZ',

  // %Z     alphabetic time zone abbreviation (e.g., EDT)
  Z: 'z',

  // Undocumented
  v: 'd',

  // %V     ISO week number, with Monday as first day of week (01..53)
  V: { calc: 'iso-week-number' },

  // NOT IMPLEMENTED:
  // %:z    +hh:mm numeric time zone (e.g., -04:00)
  // %::z   +hh:mm:ss numeric time zone (e.g., -04:00:00)
  // %:::z  numeric time zone with : to necessary precision (e.g., -04, +05:30)
};

/**
 * Translate a YUI / UNIX date format to CLDR format.
 */
export const translateUnixToCLDR = (fmt: string) => {
  let esc = '';
  const parts = [];
  const len = fmt.length;
  let i = 0;
  while (i < len) {
    let ch = fmt[i];

    // Any non-format sequence is appended to the current escape buffer.
    if (ch !== '%') {
      esc += ch;
      i++;
      continue;
    }

    // Examine char after '%'. If we're at end, escape it and bail.
    i++;
    if (i === len) {
      esc += ch;
      break;
    }

    ch = fmt[i];

    // Escaped escape.
    if (ch === '%') {
      esc += ch;
      i++;
      continue;
    }

    // Push any escaped characters we accumulated.
    const hasEscape = esc.length > 0;
    if (hasEscape) {
      parts.push(`'${esc}'`);
      esc = '';
    }

    const replacement = UNIX_TO_CLDR_FORMATS[ch];
    if (replacement) {
      parts.push(replacement);
    }

    i++;
  }

  // Append any trailing escape characters.
  if (esc.length > 0) {
    parts.push(`'${esc}'`);
  }

  return parts;
};

const pad = (str: string) => str.length === 2 ? str : ` ${str}`;

/**
 * We translate the old YUI Unix datetime pattern into CLDR patterns that
 * can be formatted using the raw formatter.
 *
 * Argument 'd' is a GregorianDate instance.
 */
export const getDatePattern = (cldr: CLDR, d: GregorianDate, unixfmt: string) => {
  let iso!: ISO8601Date;
  const makeiso = () => {
    if (!iso) {
      iso = cldr.Calendars.toISO8601Date(d);
    }
  };
  const parts = translateUnixToCLDR(unixfmt);
  const len = parts.length;
  for (let i = 0; i < len; i++) {
    const part = parts[i];
    if (typeof part !== 'string') {
      switch (part.calc) {
        case 'century':
          parts[i] = `'${(d.year() / 100) | 0}'`;
          break;

        case 'day-of-week-1': {
          const wk = d.dayOfWeek() - 1;
          parts[i] = wk === 0 ? '7' : `${wk}`;
          break;
        }

        case 'day-of-week-2': {
          parts[i] = `${d.dayOfWeek() - 1}`;
          break;
        }

        case 'day-space':
          parts[i] = pad(`${d.dayOfMonth()}`);
          break;

        case 'epoch-seconds':
          parts[i] = `'${(d.unixEpoch() / 1000) | 0}'`;
          break;

        case 'hour-12-space':
          parts[i] = pad(`${d.hour()}`);
          break;

        case 'hour-24-space':
          parts[i] = pad(`${d.hourOfDay()}`);
          break;

        case 'iso-week-number':
          makeiso();
          parts[i] = pad(`${iso.weekOfYear()}`);
          break;

        case 'iso-week-number-year':
          makeiso();
          parts[i] = `${iso.yearOfWeekOfYear()}`;
          break;

        case 'iso-week-number-year-2': {
          makeiso();
          const y = iso.yearOfWeekOfYear() % 100;
          parts[i] = `${y}`;
          break;
        }
      }

    }
  }
  return parts.join('');
};
