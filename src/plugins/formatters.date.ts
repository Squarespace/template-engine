import { GregorianDate } from '../calendars';
import { Patch } from '../compat/patch';
import { Context } from '../context';
import { Formatter, FormatterTable } from '../plugin';
import { Variable } from '../variable';
import { formatDate } from './util.date';

// A local copy of util.timezone.ts getTimeZone. Keep the
// TIMEZONE_NULL_LITERAL gate in both copies.
const getTimeZone = (ctx: Context, legacyNull: boolean = true) => {
  const node = ctx.resolve(['website', 'timeZone']);
  if (node.isMissing() || (!legacyNull && node.isNull())) {
    return 'America/New_York';
  }
  return node.asString();
};

export class DateFormatter extends Formatter {
  constructor() {
    // Java registers date with the required-arguments flag; its validateArgs
    // only stashes the raw arguments as opaque data, which this port drops.
    super(true);
  }

  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];

    // No args, just return no output. On the server-side this would raise an
    // error, but just bail out here.
    if (args.length === 0) {
      first.set('');
      return;
    }

    const instant = vars[0].node.asNumber();
    const timezone = getTimeZone(ctx, ctx.compatEnabled(Patch.TIMEZONE_NULL_LITERAL));
    const d = GregorianDate.fromUnixEpoch(instant, timezone);

    // Build format and apply
    const value = formatDate(d, args.join(' '), ctx.compatEnabled(Patch.WEEK_MONDAY_ANCHOR));
    first.set(value);
  }
}

export const DATE_FORMATTERS: FormatterTable = {
  date: new DateFormatter(),
};
