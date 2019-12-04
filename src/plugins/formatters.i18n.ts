import { RelativeTimeFormatOptions } from '@phensley/cldr-core';

import { Context } from '../context';
import { Variable } from '../variable';
import { FormatterTable } from '../plugin';
import { Formatter } from '../plugin';
import { getTimeZone } from './util.timezone';
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

export class DatetimeIntervalformatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const cldr = ctx.cldr;
    if (!cldr || vars.length < 2) {
      vars[0].set('');
      return;
    }
    const first = vars[0].node.asNumber();
    // Java compiler compat, thought not really needed
    if (first === 0) {
      vars[0].set('');
      return;
    }

    const zoneId = getTimeZone(ctx);
    const start = { date: first, zoneId };
    const end = { date: vars[1].node.asNumber(), zoneId };
    let skeleton: string = args.length ? args[0] : '';
    if (!skeleton) {
      const field = cldr.Calendars.fieldOfVisualDifference(start, end);
      switch (field) {
        case 'y':
        case 'M':
        case 'd':
          skeleton = 'yMMMd';
          break;
        default:
          skeleton = 'hmv';
          break;
      }
    }
    const res = cldr.Calendars.formatDateInterval(start, end, { skeleton });
    vars[0].set(res);
  }
}

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
  datetime: new DatetimeFormatter(),
  'datetime-interval': new DatetimeIntervalformatter(),
  decimal: new DecimalFormatter(),
  message: new MessageFormatter(),
  plural: new MessageFormatter(),
  timesince: new TimeSinceFormatter()
};
