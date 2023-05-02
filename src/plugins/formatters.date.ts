import { GregorianDate } from '../calendars';
import { Context } from '../context';
import { Formatter, FormatterTable } from '../plugin';
import { Variable } from '../variable';
import { formatDate } from './util.date';

/**
 * Retrieves the Website's timeZone from the context, falling
 * back to the default NY.
 */
const getTimeZone = (ctx: Context) => {
  const node = ctx.resolve(['website', 'timeZone']);
  return node.isMissing() ? 'America/New_York' : node.asString();
};

export class DateFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];

    // No args, just return no output. On the server-side this would raise an
    // error, but just bail out here.
    if (args.length === 0) {
      first.set('');
      return;
    }

    const instant = vars[0].node.asNumber();
    const timezone = getTimeZone(ctx);
    const d = GregorianDate.fromUnixEpoch(instant, timezone);

    // Build format and apply
    const value = formatDate(d, args.join(' '));
    first.set(value);
  }
}

export const DATE_FORMATTERS: FormatterTable = {
  date: new DateFormatter(),
};
