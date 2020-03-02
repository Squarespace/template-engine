import { CurrencyType, RelativeTimeFormatOptions } from '@phensley/cldr-core';

import { Context } from '../context';
import { Variable } from '../variable';
import { FormatterTable } from '../plugin';
import { isTruthy } from '../node';
import { Formatter } from '../plugin';
import { getTimeZone } from './util.timezone';
import { parseDecimal } from './util.i18n';
import {
  currencyOptions,
  datetimeOptions,
  decimalOptions,
  intervalOptions
} from './options';
import { splitVariable } from '../util';
import { humanizeDate } from './util.content';

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

    const opts = datetimeOptions(args);
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

    const n0 = vars[0].node.asNumber();
    const n1 = vars[1].node.asNumber();
    if (!isFinite(n0) || !isFinite(n1)) {
      vars[0].set('');
      return;
    }

    const zoneId = getTimeZone(ctx);
    const start = { date: n0, zoneId };
    const end = { date: n1, zoneId };
    const opts = intervalOptions(args);
    const res = cldr.Calendars.formatDateInterval(start, end, opts);
    vars[0].set(res);
  }
}

// TODO: datetimefield DEPRECATED

export class DecimalFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const cldr = ctx.cldr;
    if (!cldr) {
      first.set('');
      return;
    }

    const node = first.node.asString();
    const opts = decimalOptions(args);
    const num = parseDecimal(node);
    if (num !== undefined) {
      const res = cldr.Numbers.formatDecimal(num, opts);
      first.set(res);
    } else {
      first.set('');
    }
  }
}

// TODO: i18n-money-format  (Legacy)

// Find the key/value delimiter in a string.
const delimiter = (s: string): number => {
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    // Either ':' or '=' can delimit arguments
    if (c === ':' || c === '=') {
      return i;
    }
  }
  return -1;
};

export class MessageFormatterImpl extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const node = first.node;
    const cldr = ctx.cldr;
    if (!cldr) {
      first.set('');
      return;
    }

    const positional: any[] = [];
    const keyword: { [name: string]: any } = {};
    args.forEach(arg => {
      const i = delimiter(arg);
      if (i === -1) {
        const _arg = ctx.resolve(splitVariable(arg), node);
        positional.push(_arg);
      } else {
        const key = arg.slice(0, i);
        const val = arg.slice(i + 1);
        const _val = ctx.resolve(splitVariable(val), node);
        // Index the argument both as a keyword and positional
        keyword[key] = _val;
        positional.push(_val);
      }
    });

    const { formatter } = ctx;
    const zoneId = getTimeZone(ctx);
    formatter!.setTimeZone(zoneId);

    const msg = first.node.asString();
    const result = formatter!.formatter.format(msg, positional, keyword);
    first.set(result);
  }
}

const useCLDRMode = (ctx: Context) =>
  isTruthy(ctx.resolve(['website', 'useCLDRMoneyFormat']));

export class MoneyFormatter extends Formatter {

  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const node = first.node;
    let decimalValue = node.path(['decimalValue']);
    let currencyNode = node.path(['currencyCode']);
    if (decimalValue.isMissing() || currencyNode.isMissing()) {
      if (useCLDRMode(ctx)) {
        decimalValue = node.path(['value']);
        currencyNode = node.path(['currency']);
      }

      // No valid money node found.
      if (decimalValue.isMissing() || currencyNode.isMissing()) {
        first.set('');
        return;
      }
    }

    const cldr = ctx.cldr;
    if (!cldr) {
      first.set('');
      return;
    }

    const code = currencyNode.asString();
    const decimal = parseDecimal(decimalValue.asString());
    if (decimal !== undefined) {
      const opts = currencyOptions(args);
      const res = cldr.Numbers.formatCurrency(decimal, code as CurrencyType, opts);
      first.set(res);
    } else {
      first.set('');
    }
  }

}

// TODO: relativetime

export class TimeSinceFormatter extends Formatter {

  // exposed only for testing
  public NOW: Date | undefined = undefined;

  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const { cldr } = ctx;
    if (!cldr) {
      first.set('');
      return;
    }
    const n = first.node.asNumber();
    const now = cldr.Calendars.toGregorianDate(this.NOW || new Date());
    const date = cldr.Calendars.toGregorianDate({ date: n });

    const delta = now.unixEpoch() - date.unixEpoch();
    const res = humanizeDate(delta, false);
    first.set(res);
  }
}

// TODO: unit

export const I18N_FORMATTERS: FormatterTable = {
  datetime: new DatetimeFormatter(),
  'datetime-interval': new DatetimeIntervalformatter(),
  decimal: new DecimalFormatter(),
  message: new MessageFormatterImpl(),
  money: new MoneyFormatter(),
  plural: new MessageFormatterImpl(),
  timesince: new TimeSinceFormatter()
};
