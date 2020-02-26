import {
  CurrencyType,
  CLDR,
  Decimal,
  DefaultMessageArgConverter,
  MessageArgConverter,
  MessageFormatter,
  MessageFormatterOptions,
  MessageFormatFuncMap,
} from '@phensley/cldr-core';

import { Node } from '../node';
import { currencyOptions, datetimeOptions, decimalOptions, intervalOptions } from './options';
import { parseDecimal } from './util.i18n';
import { Type } from '../types';

const DEFAULT_ZONE = 'America/New_York';

/**
 * Customized message formatter with i18n tags.
 */
export class MessageFormats {

  readonly converter: ArgConverter;
  readonly formatter: MessageFormatter;
  private zoneId: string = DEFAULT_ZONE;

  /**
   * This type will only be constructed if we have a valid cldr instance attached.
   */
  constructor(private cldr: CLDR) {
    this.converter = new ArgConverter();
    const bundle = cldr.General.bundle();
    const opts: MessageFormatterOptions = {
      cacheSize: 100,
      converter: this.converter,
      formatters: this.formatters(),
      language: bundle.language(),
      region: bundle.region()
    };
    this.formatter = new MessageFormatter(opts);
  }

  setTimeZone(zoneId: string): void {
    this.zoneId = zoneId;
  }

  private formatters(): MessageFormatFuncMap {
    const currency = this.currency.bind(this);
    const decimal = this.decimal.bind(this);
    return {
      money: currency,
      currency: currency,
      'datetime-interval': this.interval.bind(this),
      datetime: this.datetime.bind(this),
      number: decimal,
      decimal: decimal
    };
  }

  /**
   * Format a currency value.
   */
  private currency(args: any[], options: string[]): string {
    if (!args || !args.length) {
      return '';
    }
    const node = args[0] as Node;
    let decimalValue = node.path(['decimalValue']);
    let currencyCode = node.path(['currencyCode']);
    if (decimalValue.isMissing() || currencyCode.isMissing()) {
      decimalValue = node.path(['value']);
      currencyCode = node.path(['currency']);
    }
    if (decimalValue.isMissing() || currencyCode.isMissing()) {
      return '';
    }

    const value = this.converter.asDecimal(decimalValue);
    const code = this.converter.asString(currencyCode);
    const opts = currencyOptions(options);
    return this.cldr.Numbers.formatCurrency(value, code as CurrencyType, opts);
  }

  private datetime(args: any[], options: string[]): string {
    if (!args || !args.length) {
      return '';
    }
    const node = args[0] as Node;
    const epoch = node.asNumber();
    if (isFinite(epoch)) {
      const date = this.cldr.Calendars.toGregorianDate({ date: epoch, zoneId: this.zoneId });
      const opts = datetimeOptions(options);
      return this.cldr.Calendars.formatDate(date, opts);
    }
    return '';
  }

  private decimal(args: any[], options: string[]): string {
    if (!args || !args.length) {
      return '';
    }
    const value = this.converter.asDecimal(args[0]);
    const opts = decimalOptions(options);
    return this.cldr.Numbers.formatDecimal(value, opts);
  }

  private interval(args: any[], options: string[]): string {
    if (!args || args.length < 2) {
      return '';
    }
    const v1 = args[0].asNumber();
    const v2 = args[1].asNumber();
    const start = this.cldr.Calendars.toGregorianDate({ date: v1, zoneId: this.zoneId });
    const end = this.cldr.Calendars.toGregorianDate({ date: v2, zoneId: this.zoneId });
    const opts = intervalOptions(options);
    return this.cldr.Calendars.formatDateInterval(start, end, opts);
  }
}

class ArgConverter extends DefaultMessageArgConverter {

  private one: Decimal;
  private zero: Decimal;

  constructor() {
    super();
    this.one = parseDecimal('1')!;
    this.zero = parseDecimal('0')!;
  }

  asDecimal(arg: any): Decimal {
    if (arg instanceof Node) {
      const node = arg as Node;
      const decimal = this.currency(node);
      if (!decimal.isMissing()) {
        try {
          const d = parseDecimal(decimal.asString())!;
          return d ? d : this.zero;
        } catch (e) {
          return this.zero;
        }
      }
      switch (node.type) {
        case Type.BOOLEAN:
          return node.value ? this.one : this.zero;
        case Type.NULL:
        case Type.MISSING:
        case Type.OBJECT:
        case Type.ARRAY:
          return this.zero;
        case Type.NUMBER:
        case Type.STRING:
        default:
          try {
            const d = parseDecimal(node.value)!;
            return d ? d : this.zero;
          } catch (e) {
            // fall through
            return this.zero;
          }
      }
    }
    return super.asDecimal(arg);
  }

  asString(arg: any): string {
    if (arg instanceof Node) {
      const node = arg as Node;
      const decimal = this.currency(node);
      if (!decimal.isMissing()) {
        return decimal.asString();
      }
      switch (node.type) {
        case Type.BOOLEAN:
          return node.value ? 'true' : 'false';
        case Type.NULL:
        case Type.MISSING:
          return '';
        case Type.NUMBER:
        case Type.ARRAY:
        case Type.OBJECT:
        case Type.STRING:
        default:
          return node.asString();
      }
    }
    return super.asString(arg);
  }

  currency(node: Node): Node {
    let decimal = node.path(['decimalValue']);
    if (decimal.isMissing()) {
      decimal = node.path(['value']);
    }
    return decimal;
  }
}
