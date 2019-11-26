import { RelativeTimeFormatOptions } from '@phensley/cldr-core';

import { Context } from '../context';
import { Variable } from '../variable';
import { FormatterTable } from '../plugin';
import { Formatter } from '../plugin';
import { getTimeZone } from './util.date';
import { parseDecimal } from './util.i18n';
import {
  setCalendarFormatOptions,
  setDecimalFormatOptions
} from './util.options';

export class DatetimeFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const cldr = ctx.cldr;
    if (!cldr) {
      first.set('');
      return;
    }

    const date = first.node.asNumber();
    if (isNaN(date)) {
      first.set('');
      return;
    }

    const opts = setCalendarFormatOptions(args);
    const zoneId = getTimeZone(ctx);
    const res = cldr.Calendars.formatDate({ date, zoneId }, opts);
    first.set(res);
  }
}

// TODO: datetime-interval
// TODO: datetimefield

export class DecimalFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const cldr = ctx.cldr;
    if (cldr === undefined) {
      first.set('');
      return;
    }

    const node = first.node.asString();
    const opts = setDecimalFormatOptions(args);
    const num = parseDecimal(node);
    const res = cldr.Numbers.formatDecimal(num, opts);
    first.set(res);
  }
}

// TODO: i18n-money-format  (Legacy)

export class MessageFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    // TODO: message formatter
  }
}

// TODO: money
// TODO: plural (Legacy, deprecate)

export class TimeSinceFormatter extends Formatter {

  // exposed only for testing
  public NOW: Date | undefined = undefined;

  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const { cldr } = ctx;
    if (cldr === undefined) {
      first.set('');
      return;
    }
    const n = first.node.asNumber();
    const now = cldr.Calendars.toGregorianDate(this.NOW || new Date());
    const date = cldr.Calendars.toGregorianDate({ date: n });

    // TODO: parse arguments
    const opts: RelativeTimeFormatOptions = {
      context: 'begin-sentence'
    };

    const s = cldr.Calendars.formatRelativeTime(now, date, opts);
    first.set(s);
  }
}

// TODO: unit

export const I18N_FORMATTERS: FormatterTable = {
  message: new MessageFormatter(),
  datetime: new DatetimeFormatter(),
  decimal: new DecimalFormatter(),
  timesince: new TimeSinceFormatter()
};
