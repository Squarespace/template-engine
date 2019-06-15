import { Context } from '../context';
import { Formatter, FormatterTable } from '../plugin';
import { Variable } from '../variable';
import { getMomentDateFormat } from './util.date';

import * as moment from 'moment-timezone';

/**
 * Retrieves the Website's timeZone from the context, falling
 * back to the default NY.
 */
const getTimeZone = (ctx: Context) => {
  const node = ctx.resolve(['website', 'timeZone']);
  return node.isMissing() ? 'America/New_York' : node.asString();
};


export class DateFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context) {
    const first = vars[0];

    // No args, just return no output. On the server-side this would raise an
    // error, but just bail out here.
    if (args.length === 0) {
      first.set('');
      return;
    }

    // TODO: support locale

    // Compute the moment object
    const instant = vars[0].node.asNumber();
    const timezone = getTimeZone(ctx);
    const m = moment.tz(instant, 'UTC').tz(timezone);

    // Build format and apply
    const fmt = getMomentDateFormat(m, args[0]);
    const value = m.format(fmt);
    first.set(value);
  }
}

export const TABLE: FormatterTable = {
  'date': new DateFormatter()
};
