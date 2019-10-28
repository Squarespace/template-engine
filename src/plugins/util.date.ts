import { GregorianDate } from '../calendars';
import { Context } from '../context';

interface Calc {
  calc: string;
}

/**
 * Maps Unix date pattern to CLDR form:
 * https://www.unicode.org/reports/tr35/tr35-dates.html#Date_Format_Patterns
 */
// const UNIX_TO_CLDR_FORMATS: { [field: string]: string | Calc } = {

//   // %a     locale's abbreviated weekday name (e.g., Sun)
//   a: 'E',

//   // %A     locale's full weekday name (e.g., Sunday)
//   A: 'EEEE',

//   // %b     locale's abbreviated month name (e.g., Jan)
//   b: 'MMM',

//   // %B     locale's full month name (e.g., January)
//   B: 'MMMM',

//   // %c     locale's date and time (e.g., Thu Mar  3 23:05:25 2005)
//   c: 'E, MMM d, y h:mm:ss a z',

//   // %C     century; like %Y, except omit last two digits (e.g., 20)
//   C: { calc: 'century' },

//   // %D     date; same as %m/%d/%y
//   D: 'MM/dd/yy',

//   // %d     day of month (e.g., 01)
//   d: 'dd',

//   // %e     day of month, space padded; same as %_d
//   e: { calc: 'day-space' },

//   // %F     full date; same as %Y-%m-%d
//   F: 'y-MM-dd',

//   // %g     last two digits of year of ISO week number (see %G)
//   g: 'G',

//   // %G     year of ISO week number (see %V); normally useful only with %V
//   G: 'GGGG',

//   // %h     same as %b
//   h: 'MMM',

//   // %H     hour (00..23)
//   H: 'HH',

//   // %I     hour (01..12)
//   I: 'hh',

//   // %j     day of year (001..366)
//   j: 'DDD',

//   // %k     hour, space padded ( 0..23); same as %H
//   k: { calc: 'hour-24-space' },

//   // %l     hour, space padded ( 1..12); same as %I
//   l: { calc: 'hour-12-space' },

//   // %m     month (01..12)
//   m: 'MM',

//   // %M     minute (00..59)
//   M: 'mm',

//   // %n     a newline
//   n: '\n',

//   // %N     nanoseconds (000000000..999999999)
//   N: 'SSSSSSSSS',

//   // %p     locale's equivalent of either AM or PM; blank if not known
//   p: 'a',

//   // %P     like %p, but lower case
//   P: 'a',

//   // %q     quarter of year (1..4)
//   q: 'Q',

//   // %r     locale's 12-hour clock time (e.g., 11:11:04 PM)
//   r: 'h:mm:ss a',

//   // %R     24-hour hour and minute; same as %H:%M
//   R: '%H:%M',

//   // %s     seconds since 1970-01-01 00:00:00 UTC
//   s: { calc: 'epoch-seconds' },

//   // %S     second (00..60)
//   S: 'ss',

//   // %t     a tab
//   t: '\t',

//   // %T     time; same as %H:%M:%S
//   T: 'HH:mm:ss',

//   // %u     day of week (1..7); 1 is Monday
//   u: { calc: 'day-of-week-1' },

//   // %U     week number of year, with Sunday as first day of week (00..53)
//   U: '', // TODO: not supported directly in moment. %U range is 00-53, moment has no comparable field.

//   // %w     day of week (0..6); 0 is Sunday
//   w: { calc: 'day-of-week-2' },

//   // %W     week number of year, with Monday as first day of week (00..53)
//   W: 'ww',

//   // %x     locale's date representation (e.g., 12/31/99)
//   x: 'MM/dd/yy',

//   // %X     locale's time representation (e.g., 23:13:48)
//   X: 'h:mm:ss a',

//   // %y     last two digits of year (00..99)
//   y: 'yy',

//   // %Y     year
//   Y: 'y',

//   // %z     +hhmm numeric time zone (e.g., -0400)
//   z: 'ZZ',

//   // %Z     alphabetic time zone abbreviation (e.g., EDT)
//   Z: 'z',

//   // Undocumented
//   v: 'd',

//   // %V     ISO week number, with Monday as first day of week (01..53)
//   V: { calc: 'iso-week-number' },

//   // NOT IMPLEMENTED:
//   // %:z    +hh:mm numeric time zone (e.g., -04:00)
//   // %::z   +hh:mm:ss numeric time zone (e.g., -04:00:00)
//   // %:::z  numeric time zone with : to necessary precision (e.g., -04, +05:30)
// };

/**
 * Translate a YUI / UNIX date format to CLDR format.
 */
export const formatDate = (d: GregorianDate, fmt: string) => {
  let esc = '';
  const parts = [];
  const len = fmt.length;
  let i = 0;
  let out: string = '';
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
      parts.push(esc);
      esc = '';
    }

    out = '';
    switch (ch) {
      // %a     locale's abbreviated weekday name (e.g., Sun)
      case 'a':
        out = SHORT_DAYS[d.dayOfWeek() - 1];
        break;

      // %A     locale's full weekday name (e.g., Sunday)
      case 'A':
        out = LONG_DAYS[d.dayOfWeek() - 1];
        break;

      // %b     locale's abbreviated month name (e.g., Jan)
      case 'b':
        out = SHORT_MONTHS[d.month() - 1];
        break;

      // %B     locale's full month name (e.g., January)
      case 'B':
        out = LONG_MONTHS[d.month() - 1];
        break;

      // %c     locale's date and time (e.g., Thu Mar  3 23:05:25 2005)
      case 'c': {
        // hour without an extra space
        out = formatDate(d, `%a, %b %e, %Y ${d.hour()}:%M:%S %p %Z`);
        break;
      }

      // %C     century; like %Y, except omit last two digits (e.g., 20)
      case 'C':
        out = `${(d.year() / 100) | 0}`;
        break;

      // %D     date; same as %m/%d/%y
      case 'D':
        out = formatDate(d, '%m/%d/%y');
        break;

      // %d     day of month (e.g., 01)
      case 'd':
        out = pad(`${d.dayOfMonth()}`, '0', 2);
        break;

      // %e     day of month, space padded; same as %_d
      case 'e':
        out = pad(`${d.dayOfMonth()}`, ' ', 2);
        break;

      // %F     full date; same as %Y-%m-%d
      case 'F':
        out = formatDate(d, '%Y-%m-%d');
        break;

      // %g     last two digits of year of ISO week number (see %G)
      case 'g':
        // out = pad(`${d.weekOfYear()}`, '0', 2);
        break;

      // %G     year of ISO week number (see %V); normally useful only with %V
      case 'G':
        // out = `${d.yearOfWeekOfYear()}`;
        break;

      // %h     same as %b
      case 'h':
        out = SHORT_MONTHS[d.month() - 1];
        break;

      // %H     hour (00..23)
      case 'H':
        out = pad(`${d.hourOfDay()}`, '0', 2);
        break;

      // %I     hour (01..12)
      case 'I':
        out = pad(`${d.hour()}`, '0', 2);
        break;

      // %j     day of year (001..366)
      case 'j':
        out = pad(`${d.dayOfYear()}`, '0', 3);
        break;

      // %k     hour, space padded ( 0..23); same as %H
      case 'k':
        out = pad(`${d.hourOfDay()}`, '0', 2);
        break;

      // %l     hour, space padded ( 1..12); same as %I
      case 'l':
        out = pad(`${d.hour()}`, ' ', 2);
        break;

      // %m     month (01..12)
      case 'm':
        out = pad(`${d.month()}`, '0', 2);
        break;

      // %M     minute (00..59)
      case 'M':
        out = pad(`${d.minute()}`, '0', 2);
        break;

      // %n     a newline
      case 'n':
        out = '\n';
        break;

      // %N     nanoseconds (000000000..999999999)
      case 'N':
        out = pad(`${d.milliseconds()}`, '0', 9);
        break;

      // %p     locale's equivalent of either AM or PM; blank if not known
      case 'p':
        out = d.isAM() ? 'AM' : 'PM';
        break;

      // %P     like %p, but lower case
      case 'P':
        out = d.isAM() ? 'am' : 'pm';
        break;

      // %q     quarter of year (1..4)
      case 'q': {
        const q = ((d.month() - 1) / 4 | 0) + 1;
        out = `${q}`;
        break;
      }

      // %r     locale's 12-hour clock time (e.g., 11:11:04 PM)
      case 'r':
        out = formatDate(d, '%l:%M:%S %p');
        break;

      // %R     24-hour hour and minute; same as %H:%M
      case 'R':
        out = formatDate(d, '%H:%M');
        break;

      // %s     seconds since 1970-01-01 00:00:00 UTC
      case 's':
        out = `${(d.unixEpoch() / 1000) | 0}`;
        break;

      // %S     second (00..60)
      case 'S':
        out = pad(`${d.second()}`, '0', 2);
        break;

      // %t     a tab
      case 't':
        out = '\t';
        break;

      // %T     time; same as %H:%M:%S
      case 'T':
        out = formatDate(d, '%H:%M:%S');
        break;

      // %u     day of week (1..7); 1 is Monday
      case 'u': {
        const wk = d.dayOfWeek() - 1;
        out = wk === 0 ? '7' : `${wk}`;
        break;
      }

      // %U     week number of year, with Sunday as first day of week (00..53)
      case 'U':
        out = pad(`${d.weekOfYear()}`, '0', 2);
        break;

      // %w     day of week (0..6); 0 is Sunday
      case 'w':
        out = `${d.dayOfWeek() - 1}`;
        break;

      // %W     week number of year, with Monday as first day of week (00..53)
      case 'W':
        out = pad(`${d.weekOfYear()}`, '0', 2);
        break;

      // %x     locale's date representation (e.g., 12/31/99)
      case 'x':
        out = formatDate(d, '%m/%d/%y');
        break;

      // %X     locale's time representation (e.g., 23:13:48)
      case 'X':
        out = formatDate(d, '%H:%M:%S');
        break;

      // %y     last two digits of year (00..99)
      case 'y': {
        const y = d.year() % 100;
        out = pad(`${y}`, '0', 2);
        break;
      }

      // %Y     year
      case 'Y':
        out = `${d.year()}`;
        break;

      // %z     +hhmm numeric time zone (e.g., -0400)
      case 'z': {
        const [neg, hrs, mins] = getTZC(d.timeZoneOffset());
        const h = pad(`${hrs}`, '0', 2);
        const m = pad(`${mins}`, '0', 2);
        out = `${neg ? '-' : '+'}${h}:${m}`;
        break;
      }

      // %Z     alphabetic time zone abbreviation (e.g., EDT)
      case 'Z':
        out = d.timeZoneAbbr();
        break;

      // Undocumented
      case 'v':
        break;

      // %V     ISO week number, with Monday as first day of week (01..53)
      case 'V':
        out = pad(`${d.weekOfYearISO()}`, '0', 2);
        break;

      // NOT IMPLEMENTED:
      // %:z    +hh:mm numeric time zone (e.g., -04:00)
      // %::z   +hh:mm:ss numeric time zone (e.g., -04:00:00)
      // %:::z  numeric time zone with : to necessary precision (e.g., -04, +05:30)

    }

    if (out) {
      parts.push(out);
    }

    // const replacement = UNIX_TO_CLDR_FORMATS[ch];
    // if (replacement) {
    //   parts.push(replacement);
    // }

    i++;
  }

  // Append any trailing escape characters.
  if (esc.length > 0) {
    parts.push(esc);
  }

  return parts.join('');
};

const getTZC = (offset: number): [boolean, number, number] => {
  const negative = offset < 0;
  if (negative) {
    offset *= -1;
  }
  offset /= 60000;
  const hours = offset / 60 | 0;
  const minutes = offset % 60;
  return [negative, hours, minutes];
};

// const pad = (str: string, c: string = ' ') => str.length === 2 ? str : `${c}${str}`;

const pad = (s: string, ch: string, n: number) => {
  let d = n - s.length;
  let r = '';
  while (d--) {
    r += ch;
  }
  return r + s;
};

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const LONG_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const LONG_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

/**
 * We translate the old YUI Unix datetime pattern into CLDR patterns that
 * can be formatted using the raw formatter.
 *
 * Argument 'd' is a GregorianDate instance.
 */

/*
 export const formatDate = (d: GregorianDate, unixfmt: string) => {
  const res: string[] = [];
  const parts = translateUnixToCLDR(unixfmt);
  const len = parts.length;
  for (let i = 0; i < len; i++) {
    let out: string = '';
    const part = parts[i];
    if (typeof part === 'string') {
      switch (part) {
        case 'E':
          out = SHORT_DAYS[d.dayOfWeek() - 1];
          break;
        case 'EEEE':
          out = LONG_DAYS[d.dayOfWeek() - 1];
          break;
        case 'MMM':
          out = SHORT_MONTHS[d.month() - 1];
          break;
        case 'MMMM':
          out = LONG_MONTHS[d.month() - 1];
          break;
        case 'E, MMM d, y h:mm:ss a z':
          out = formatDate(d, part);
          break;
        case 'MM/dd/yy':

        default:
          out = part;
          if (part[0] === "'") {
            out = part.substring(1, part.length - 1);
          }
          break;
      }

    } else {
      switch (part.calc) {
        case 'century':
          out = `${(d.year() / 100) | 0}`;
          break;

        case 'day-of-week-1': {
          const wk = d.dayOfWeek() - 1;
          out = wk === 0 ? '7' : `${wk}`;
          break;
        }

        case 'day-of-week-2': {
          out = `${d.dayOfWeek() - 1}`;
          break;
        }

        case 'day-space':
          out = pad(`${d.dayOfMonth()}`);
          break;

        case 'epoch-seconds':
          out = `${(d.unixEpoch() / 1000) | 0}`;
          break;

        case 'hour-12-space':
          out = pad(`${d.hour()}`);
          break;

        case 'hour-24-space':
          out = pad(`${d.hourOfDay()}`);
          break;

        case 'iso-week-number':
          // TODO: requires date conversion to iso-8601 calendar currently
          out = '';
          break;
      }
      res.push(out);
    }
  }
  return parts.join('');
};

*/

/**
 * Retrieves the Website's timeZone from the context, falling
 * back to the default NY.
 */
export const getTimeZone = (ctx: Context) => {
  const node = ctx.resolve(['website', 'timeZone']);
  return node.isMissing() ? 'America/New_York' : node.asString();
};
