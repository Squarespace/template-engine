import moment from 'moment-timezone';
import { Formatter } from '../plugin';
import { getMomentDateFormat } from './util.date';

/**
 * Retrieves the Website's timeZone from the context, falling
 * back to the default NY.
 */
const getTimeZone = (ctx) => {
  const node = ctx.resolve(['website', 'timeZone']);
  return node.isMissing() ? 'America/New_York' : node.asString();
};


export class DateFormatter extends Formatter {
  apply(args, vars, ctx) {
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

export const TABLE = {
  'date': new DateFormatter()
};