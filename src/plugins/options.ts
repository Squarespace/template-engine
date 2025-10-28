import {
  CalendarType,
  ContextType,
  CurrencyFormatOptions,
  CurrencyFormatStyleType,
  CurrencySymbolWidthType,
  DateFieldWidthType,
  DateFormatOptions,
  DateIntervalFormatOptions,
  DecimalFormatOptions,
  DecimalFormatStyleType,
  FormatWidthType,
  NumberFormatOptions,
  RelativeTimeFormatOptions,
  RoundingModeType,
  TimePeriodField,
} from '@phensley/cldr-core';

// Arbitrary value just to have an upper limit.
const CLAMP_MAX = 50;

const DECIMAL_STYLE = new Set<DecimalFormatStyleType>([
  'decimal',
  'short',
  'long',
  'scientific',
  'percent',
  'percent-scaled',
  'permille',
  'permille-scaled',
]);

const CURRENCY_STYLE = new Set<CurrencyFormatStyleType>(['symbol', 'accounting', 'code', 'name', 'short']);

const CURRENCY_WIDTH = new Set<CurrencySymbolWidthType>(['default', 'narrow']);

const ROUNDING_MODE = new Set<RoundingModeType>(['up', 'down', 'ceiling', 'floor', 'half-up', 'half-down', 'half-even']);

const FORMAT_WIDTH = new Set<FormatWidthType>(['short', 'medium', 'long', 'full']);

const CONTEXT_TYPE = new Set<ContextType>(['middle-of-text', 'begin-sentence', 'standalone', 'ui-list-or-menu']);

const TIMEPERIOD_FIELD = new Set<TimePeriodField>(['year', 'month', 'week', 'day', 'hour', 'minute', 'second', 'millis']);

const DATEFIELD_WIDTH = new Set<DateFieldWidthType>(['short', 'narrow', 'wide']);

export type Parser<T> = (arg: string, val: string, opts: T) => void;

export const decimalOptions = (args: string[]): DecimalFormatOptions => {
  const opts: DecimalFormatOptions = {};
  parse(args, opts, decimalOption);
  return opts;
};

export const currencyOptions = (args: string[]): CurrencyFormatOptions => {
  const opts: CurrencyFormatOptions = {};
  parse(args, opts, currencyOption);
  return opts;
};

export const datetimeOptions = (args: string[]): DateFormatOptions => {
  const opts: DateFormatOptions = {};
  parse(args, opts, datetimeOption);
  if (!opts.ca) {
    opts.ca = 'gregory';
  }
  return opts;
};

export const intervalOptions = (args: string[]): DateIntervalFormatOptions => {
  const opts: DateIntervalFormatOptions = {};
  parse(args, opts, intervalOption);
  if (!opts.ca) {
    opts.ca = 'gregory';
  }
  return opts;
};

export const relativetimeOptions = (args: string[]): RelativeTimeFormatOptions => {
  const opts: RelativeTimeFormatOptions = {};
  parse(args, opts, relativetimeOption);
  if (!opts.ca) {
    opts.ca = 'gregory';
  }
  return opts;
};

/**
 * Parses the string options and maps them to the options type T via the parser.
 */
const parse = <T>(args: string[], options: T, parser: Parser<T>) => {
  if (args === null || args === undefined) {
    return;
  }
  for (let arg of args) {
    let val = '';
    const i = arg.indexOf(':');
    if (i !== -1) {
      val = arg.substring(i + 1);
      arg = arg.substring(0, i);
    }
    parser(arg, val, options);
  }
};

const decimalOption = (arg: string, val: string, options: DecimalFormatOptions) => {
  if (arg === 'style') {
    if (DECIMAL_STYLE.has(val as DecimalFormatStyleType)) {
      options.style = val as DecimalFormatStyleType;
    } else if (val === 'standard') {
      options.style = 'decimal';
    }
  } else {
    numberOption(arg, val, options);
  }
};

const currencyOption = (arg: string, val: string, options: CurrencyFormatOptions) => {
  if (arg === 'style') {
    if (CURRENCY_STYLE.has(val as CurrencyFormatStyleType)) {
      options.style = val as CurrencyFormatStyleType;
    } else if (val === 'standard') {
      options.style = 'symbol';
    }
  } else if (arg === 'symbol') {
    if (CURRENCY_WIDTH.has(val as CurrencySymbolWidthType)) {
      options.symbolWidth = val as CurrencySymbolWidthType;
    }
  } else {
    numberOption(arg, val, options);
  }
};

const numberOption = (arg: string, val: string, options: NumberFormatOptions) => {
  switch (arg) {
    case 'group':
    case 'grouping':
      options.group = val === '' || val === 'true';
      break;

    case 'no-group':
    case 'no-grouping':
      options.group = false;
      break;

    case 'round':
    case 'rounding':
      switch (val) {
        case 'ceil':
          options.round = 'ceiling';
          break;
        case 'truncate':
          options.round = 'down';
          break;
        default:
          if (ROUNDING_MODE.has(val as RoundingModeType)) {
            options.round = val as RoundingModeType;
          }
          break;
      }
      break;

    case 'minint':
    case 'minInt':
    case 'minimumIntegerDigits':
      options.minimumIntegerDigits = clamp(int(val), 0, CLAMP_MAX);
      break;

    case 'maxfrac':
    case 'maxFrac':
    case 'maximumFractionDigits':
      options.maximumFractionDigits = clamp(int(val), 0, CLAMP_MAX);
      break;

    case 'minfrac':
    case 'minFrac':
    case 'minimumFractionDigits':
      options.minimumFractionDigits = clamp(int(val), 0, CLAMP_MAX);
      break;

    case 'maxsig':
    case 'maxSig':
    case 'maximumSignificantDigits':
      options.maximumSignificantDigits = clamp(int(val), 0, CLAMP_MAX);
      break;

    case 'minsig':
    case 'minSig':
    case 'minimumSignificantDigits':
      options.minimumSignificantDigits = clamp(int(val), 0, CLAMP_MAX);
      break;

    default:
      break;
  }
};

const datetimeOption = (arg: string, val: string, options: DateFormatOptions) => {
  if (!val) {
    switch (arg) {
      case 'date':
        options.date = 'short';
        break;
      case 'time':
        options.time = 'short';
        break;
      default:
        if (FORMAT_WIDTH.has(arg as FormatWidthType)) {
          options.datetime = arg as FormatWidthType;
        } else {
          const skel = options.skeleton;
          options.skeleton = skel === undefined ? arg : skel + arg;
        }
        break;
    }
    return;
  }

  switch (arg) {
    case 'calendar':
      options.ca = selectCalendar(val);
      break;

    case 'context':
      if (CONTEXT_TYPE.has(val as ContextType)) {
        options.context = val as ContextType;
      }
      break;

    case 'date':
    case 'time':
    case 'datetime':
      if (FORMAT_WIDTH.has(val as FormatWidthType)) {
        if (arg === 'date') {
          options.date = val as FormatWidthType;
        } else if (arg === 'time') {
          options.time = val as FormatWidthType;
        } else {
          options.datetime = val as FormatWidthType;
        }
      } else {
        // add skeleton fields
        const skel = options.skeleton;
        options.skeleton = skel === undefined ? val : skel + val;
      }
      break;

    case 'skeleton':
      options.skeleton = val;
      break;

    case 'wrap':
    case 'wrapper':
    case 'wrapped':
      if (FORMAT_WIDTH.has(val as FormatWidthType)) {
        options.wrap = val as FormatWidthType;
      }
      break;

    default:
      break;
  }
};

const selectCalendar = (s: string): CalendarType | undefined => {
  switch (s) {
    case 'gregorian':
      return 'gregory';
    case 'buddhist':
    case 'gregory':
    case 'iso8601':
    case 'persian':
    case 'japanese':
      return s;
    default:
      return undefined;
  }
};

const intervalOption = (arg: string, val: string, options: DateIntervalFormatOptions) => {
  if (!val) {
    switch (arg) {
      case 'context':
      case 'skeleton':
      case 'date':
      case 'time':
        break;
      default:
        if (arg) {
          options.skeleton = arg;
        }
        break;
    }
    return;
  }

  switch (arg) {
    case 'context':
      if (CONTEXT_TYPE.has(val as ContextType)) {
        options.context = val as ContextType;
      }
      break;

    case 'skeleton':
      options.skeleton = val;
      break;

    case 'date':
      options.date = val;
      break;

    case 'time':
      options.time = val;
      break;

    default:
      break;
  }
};

const relativetimeOption = (arg: string, val: string, options: RelativeTimeFormatOptions) => {
  switch (arg) {
    case 'context':
      if (CONTEXT_TYPE.has(val as ContextType)) {
        options.context = val as ContextType;
      }
      break;
    case 'dayOfWeek':
      options.dayOfWeek = val === 'true';
      break;
    case 'field':
      if (TIMEPERIOD_FIELD.has(val as TimePeriodField)) {
        options.field = val as TimePeriodField;
      }
      break;
    case 'numericOnly':
      options.numericOnly = val === 'true';
      break;
    case 'allowWeeks':
      options.allowWeeks = val === 'true';
      break;
    case 'alwaysNow':
      options.alwaysNow = val === 'true';
      break;
    case 'width':
      if (DATEFIELD_WIDTH.has(val as DateFieldWidthType)) {
        options.width = val as DateFieldWidthType;
      }
      break;
    default:
      numberOption(arg, val, options);
      break;
  }
};

const clamp = (n: number, min: number, max: number) => (n < min ? min : n > max ? max : n);

const int = (v: string) => {
  const n = parseInt(v, 10);
  return isFinite(n) ? n : 0;
};
