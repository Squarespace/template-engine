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
  validateArgs(args: string[]): void {
    // Same option parsing the runtime applies, Java OptionParsers.datetime.
    // It rejects nothing; running it here keeps the parse-time and runtime
    // paths on the same code.
    datetimeOptions(args);
  }

  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const cldr = ctx.cldr;
    if (!cldr) {
      first.set('');
      return;
    }

    // Legacy, a missing or null value renders the epoch date. Fixed, it
    // renders missing.
    const legacy = ctx.compatEnabled(Patch.DATETIME_MISSING_EPOCH);
    if (!legacy && (first.node.isMissing() || first.node.isNull())) {
      first.set(MISSING_NODE);
      return;
    }

    const date = first.node.asNumber();
    if (isNaN(date)) {
      first.set('');
      return;
    }

    const opts = datetimeOptions(args);
    const zoneId = getTimeZone(ctx, ctx.compatEnabled(Patch.TIMEZONE_NULL_LITERAL));
    const res = cldr.Calendars.formatDate({ date, zoneId }, opts);
    first.set(res);
  }
}

export class DatetimeIntervalformatter extends Formatter {
  validateArgs(args: string[]): void {
    // Same option parsing the runtime applies, Java OptionParsers.interval.
    intervalOptions(args);
  }

  apply(args: string[], vars: Variable[], ctx: Context): void {
    const cldr = ctx.cldr;
    if (!cldr) {
      vars[0].set('');
      return;
    }
    // Java returns without touching the variable when only one operand is
    // present, so the raw value passes through unchanged at every level.
    if (vars.length < 2) {
      return;
    }

    // Legacy, a missing or null operand reads as epoch 0 and the interval
    // renders the 1969 range. Fixed, it renders missing.
    if (!ctx.compatEnabled(Patch.DATETIME_INTERVAL_RAW) &&
      (vars[0].node.isMissing() || vars[0].node.isNull() || vars[1].node.isMissing() || vars[1].node.isNull())) {
      vars[0].set(MISSING_NODE);
      return;
    }

    const n0 = vars[0].node.asNumber();
    const n1 = vars[1].node.asNumber();
    // Released surface: a non-numeric operand renders empty at every level.
    // Java's asLong reads the text as 0 and formats the epoch interval;
    // the port keeps the empty rendering.
    if (!isFinite(n0) || !isFinite(n1)) {
      vars[0].set('');
      return;
    }

    const zoneId = getTimeZone(ctx, ctx.compatEnabled(Patch.TIMEZONE_NULL_LITERAL));
    const start = { date: n0, zoneId };
    const end = { date: n1, zoneId };
    const opts = intervalOptions(args);
    const res = cldr.Calendars.formatDateInterval(start, end, opts);
    vars[0].set(res);
  }
}

// TODO: datetimefield DEPRECATED

export class DecimalFormatter extends Formatter {
  validateArgs(args: string[]): void {
    // Same option parsing the runtime applies, Java OptionParsers.decimal.
    decimalOptions(args);
  }

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

/**
 * Same shape as Java's isName. Java accepts any Unicode letter; this port
 * keeps the released ASCII surface, so an identifier starts with a letter,
 * underscore, or dollar sign and continues with those or digits.
 */
const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const isName = (s: string): boolean => IDENTIFIER.test(s);

/**
 * Find the name/value delimiter in an argument. At the fixed level an
 * argument is a named argument only when the name part is a plain
 * identifier and the delimiter is not part of a URL scheme (e.g.
 * http://example.com). Otherwise the argument is positional.
 */
const delimiter = (s: string, legacyUrlSplit = true): number => {
  const len = s.length;
  for (let i = 0; i < len; i++) {
    const c = s[i];
    if (c !== ':' && c !== '=') {
      continue;
    }
    // Legacy, the first colon or equals is the delimiter.
    if (legacyUrlSplit) {
      return i;
    }
    // A colon followed by "//" is a URL scheme, not a delimiter.
    if (c === ':' && i + 2 < len && s[i + 1] === '/' && s[i + 2] === '/') {
      continue;
    }
    // A later delimiter would extend the same name, which already failed,
    // so no later position can be a delimiter either.
    return isName(s.slice(0, i)) ? i : -1;
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
    // The 021 literal fallback below still keys off this patch.
    const legacy = ctx.compatEnabled(Patch.MESSAGE_ARG_URL_SPLIT);
    // Which frame an argument's first segment walks from. Legacy, the
    // message string's frame, so '@' points at the message key's value.
    // Fixed, the enclosing scope, so an '@'-relative path can reach it.
    // Java walks the stack for an '@' first segment, but resolveFrom
    // resolves it against exactly the starting frame, no walk. The two
    // agree while that frame's node exists and differ only when the
    // message string is missing, which no Java fixture pins. Keep the
    // no-walk behavior.
    const legacyScope = ctx.compatEnabled(Patch.SUBPATH_PARENT_SCOPE);
    const parent = ctx.frame().parent;
    const start = parent ? parent : ctx.frame();
    args.forEach((arg) => {
      const i = delimiter(arg, legacy);
      if (i === -1) {
        // A bare '@' is the starting frame's node at every level. Java
        // reads the whole arg the same way (splitVariable returns null
        // and resolve(null) returns the starting frame's node), so the
        // frame gate does not apply here.
        let value = arg === '@' ? start.node : ctx.resolveFrom(splitVariable(arg), legacyScope ? ctx.frame() : start);
        // Fixed, an argument that did not resolve to a variable passes
        // through as literal text. Legacy, it is dropped.
        if (value.isMissing() && !legacy) {
          value = ctx.newNode(arg);
        }
        positional.push(value);
      } else {
        const key = arg.slice(0, i);
        const val = arg.slice(i + 1);
        // A bare '@' value behaves like a bare '@' argument.
        let value = val === '@' ? start.node : ctx.resolveFrom(splitVariable(val), legacyScope ? ctx.frame() : start);
        // Fixed, an unresolved value passes through as literal text.
        // Legacy, it is dropped.
        if (value.isMissing() && !legacy) {
          value = ctx.newNode(val);
        }
        // Index the argument both as a keyword and positional
        keyword[key] = value;
        positional.push(value);
      }
    });

    const zoneId = getTimeZone(ctx, ctx.compatEnabled(Patch.TIMEZONE_NULL_LITERAL));
    const formatter = ctx.messageFormatter(zoneId);

    const msg = first.node.asString();
    const result = formatter.formatter.format(msg, positional, keyword);
    first.set(result);
  }
}

export class MoneyFormatter extends Formatter {
  validateArgs(args: string[]): void {
    // Same option parsing the runtime applies, Java OptionParsers.currency.
    currencyOptions(args);
  }

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
    // Legacy, a missing or null value renders the age since epoch 0.
    // Fixed, it renders missing.
    const legacy = ctx.compatEnabled(Patch.DATETIME_MISSING_EPOCH);
    if (!legacy && (first.node.isMissing() || first.node.isNull())) {
      first.set(MISSING_NODE);
      return;
    }
    let s = ctx.now === undefined ? new Date().getTime() : ctx.now;
    let e = first.node.asNumber();
    if (vars.length > 1) {
      // Legacy, a missing second operand also reads as epoch 0. Fixed, it
      // renders missing.
      if (!legacy && (vars[1].node.isMissing() || vars[1].node.isNull())) {
        first.set(MISSING_NODE);
        return;
      }
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
