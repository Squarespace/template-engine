import { Node } from '../node';
import { Context } from '../context';
import { Variable } from '../variable';
import { FormatterTable } from '../plugin';
import { Decimal, ZonedDateTime } from '@phensley/cldr';
import { Formatter } from '../plugin';
import { getTimeZone } from './util.date';
import {
  setDecimalFormatOptions,
  setCalendarFormatOptions
} from './util.options';

export class DatetimeFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context) {
    const first = vars[0];
    const cldr = ctx.cldr;
    if (cldr === undefined) {
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
  apply(args: string[], vars: Variable[], ctx: Context) {
    const first = vars[0];
    const cldr = ctx.cldr;
    if (cldr === undefined) {
      first.set('');
      return;
    }

    const node = first.node.asString();
    const opts = setDecimalFormatOptions(args);
    const num = new Decimal(node);
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
// TODO: unit

export const TABLE: FormatterTable = {
  message: new MessageFormatter(),
  datetime: new DatetimeFormatter(),
  decimal: new DecimalFormatter()
};
