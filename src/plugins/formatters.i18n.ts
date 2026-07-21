import { CurrencyType, Decimal } from '@phensley/cldr-core';

import { Patch } from '../compat/patch';
import { Context } from '../context';
import { MISSING_NODE } from '../node';
import { Variable } from '../variable';
import { FormatterTable } from '../plugin';
import { Formatter } from '../plugin';
import { getTimeZone } from './util.timezone';
import { currencyOptions, datetimeOptions, decimalOptions, intervalOptions, relativetimeOptions } from './options';
import { splitVariable } from '../util';
import { humanizeDate, getZoneOffsetMs } from './util.content';

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

    const legacy = ctx.compatEnabled(Patch.MONEY_BAD_DECIMAL);
    let decimal: Decimal;
    try {
      decimal = new Decimal(first.node.asString());
    } catch (e) {
      if (legacy) {
        // Level 0 lets cldr's IllegalArgumentException escape, and the
        // engine records it as an unexpected error, matching Java.
        throw Object.assign(new Error((e as Error).message), { name: 'IllegalArgumentException' });
      }
      // Fixed, an unconvertible value renders missing.
      first.set(MISSING_NODE);
      return;
    }
    const opts = decimalOptions(args);
    const res = cldr.Numbers.formatDecimal(decimal, opts);
    first.set(res);
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
    const cldr = ctx.cldr;
    if (!cldr) {
      first.set('');
      return;
    }

    const positional: any[] = [];
    const keyword: { [name: string]: any } = {};
    args.forEach((arg) => {
      const parent = ctx.frame().parent;
      const i = delimiter(arg);
      if (i === -1) {
        const _arg = ctx.resolveFrom(splitVariable(arg), parent ? parent : ctx.frame());
        positional.push(_arg);
      } else {
        const key = arg.slice(0, i);
        const val = arg.slice(i + 1);
        const _val = ctx.resolveFrom(splitVariable(val), parent ? parent : ctx.frame());
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

export class MoneyFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const node = first.node;
    let decimalValue = node.path(['decimalValue']);
    let currencyNode = node.path(['currencyCode']);
    if (decimalValue.isMissing() || currencyNode.isMissing()) {
      decimalValue = node.path(['value']);
      currencyNode = node.path(['currency']);

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
    const legacy = ctx.compatEnabled(Patch.MONEY_BAD_DECIMAL);
    let decimal: Decimal;
    try {
      decimal = new Decimal(decimalValue.asString());
    } catch (e) {
      if (legacy) {
        // Level 0 lets cldr's IllegalArgumentException escape, and the
        // engine records it as an unexpected error, matching Java.
        throw Object.assign(new Error((e as Error).message), { name: 'IllegalArgumentException' });
      }
      // Fixed, an unconvertible decimalValue renders missing.
      first.set(MISSING_NODE);
      return;
    }
    // Legacy, an unknown currency code renders a bare number with a
    // leading NBSP. Fixed, the unknown code renders missing, like the
    // other bad-money paths.
    if (!ctx.compatEnabled(Patch.MONEY_UNKNOWN_CURRENCY) && !cldr.Numbers.getCurrencySymbol(code as CurrencyType)) {
      first.set(MISSING_NODE);
      return;
    }
    const opts = currencyOptions(args);
    const res = cldr.Numbers.formatCurrency(decimal, code as CurrencyType, opts);
    first.set(res);
  }
}

export class RelativeTimeFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const { cldr } = ctx;
    if (!cldr) {
      first.set('');
      return;
    }
    let s = ctx.now === undefined ? new Date().getTime() : ctx.now;
    let e = first.node.asNumber();
    if (vars.length > 1) {
      s = e;
      e = vars[1].node.asNumber();
    }
    if (!isFinite(s) || !isFinite(e)) {
      first.set('');
      return;
    }
    const start = cldr.Calendars.toGregorianDate({ date: s });
    const end = cldr.Calendars.toGregorianDate({ date: e });

    const opts = relativetimeOptions(args);
    const res = cldr.Calendars.formatRelativeTime(start, end, opts);
    first.set(res);
  }
}

export class TimeSinceFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const n = first.node.asNumber();
    const { cldr } = ctx;
    if (!cldr || !isFinite(n)) {
      first.set('Invalid date.');
      return;
    }
    const now = ctx.now === undefined ? new Date().getTime() : ctx.now;
    const base = cldr.Calendars.toGregorianDate({ date: now });
    const date = cldr.Calendars.toGregorianDate({ date: n });

    const delta = base.unixEpoch() - date.unixEpoch();
    // Legacy, the default zone's offset at the instant joins the delta,
    // matching the released Java code. At level 1 the delta is the raw epoch
    // millis difference. The system zone stands in for Java's
    // TimeZone.getDefault().getID() and is resolved per call.
    const legacy = ctx.compatEnabled(Patch.HUMANIZE_DATE_TZ);
    const zoneId = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const res = humanizeDate(legacy ? delta + getZoneOffsetMs(cldr, zoneId, n) : delta, false);
    const html = `<span class="timesince" data-date="${n}">${res}</span>`;
    first.set(html);
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
  'relative-time': new RelativeTimeFormatter(),
  timesince: new TimeSinceFormatter(),
};
