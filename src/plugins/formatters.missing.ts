import { Formatter, FormatterTable } from '../plugin';
import { Context } from '../context';
import { Variable } from '../variable';
import { atMost } from './args';
// import { TemplateError } from '../errors';

// const missing = (name: string): TemplateError =>
//   ({ type: 'engine', message: `"${name}" formatter is not yet implemented` });

// export class MissingFormatter extends Formatter {
//   private error: TemplateError;
//   constructor(name: string) {
//     super();
//     this.error = missing(name);
//   }

//   apply(args: string[], vars: Variable[], ctx: Context): void {
//     ctx.error(this.error);
//   }
// }

export class NotImplementedFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    // NO OP
  }
}

/**
 * Validates a locale string with the shape commons-lang3 3.1
 * LocaleUtils.toLocale accepts: a two-letter lowercase language, then the
 * optional forms _YY, __variant and _YY_variant, with a two-letter
 * uppercase country. Anything else throws IllegalArgumentException there,
 * which the LegacyMoneyFormatter reports as an invalid-locale error.
 */
const isLocale = (s: string): boolean => {
  const len = s.length;
  if (len !== 2 && len !== 5 && len < 7) {
    return false;
  }
  const c0 = s.charCodeAt(0);
  const c1 = s.charCodeAt(1);
  if (c0 < 97 || c0 > 122 || c1 < 97 || c1 > 122) {
    return false;
  }
  if (len === 2) {
    return true;
  }
  if (s[2] !== '_') {
    return false;
  }
  if (s[3] === '_') {
    return true;
  }
  const c3 = s.charCodeAt(3);
  const c4 = s.charCodeAt(4);
  if (c3 < 65 || c3 > 90 || c4 < 65 || c4 > 90) {
    return false;
  }
  if (len === 5) {
    return true;
  }
  return s[5] === '_';
};

/**
 * Parse-time validation for i18n-money-format, mirroring the Java
 * LegacyMoneyFormatter: at most one argument, and a present, non-blank
 * argument must be a locale. The runtime half stays a stub; see the legacy
 * money decision in todo 050.
 */
export class LegacyMoneyFormatter extends Formatter {
  validateArgs(args: string[]): void {
    atMost(args.length, 1);
    if (args.length === 1) {
      // Java trims the argument and treats an empty one as absent.
      const locale = args[0].trim();
      if (locale !== '' && !isLocale(locale.replace(/-/g, '_'))) {
        throw new Error(`Invalid locale: ${locale}`);
      }
    }
  }

  apply(args: string[], vars: Variable[], ctx: Context): void {
    // NO OP
  }
}

const NOIMPL = ['datetimefield', 'money-format', 'money-string', 'moneyFormat', 'unit'];

export const NOIMPL_FORMATTERS: FormatterTable = NOIMPL.reduce((table, name) => {
  table[name] = new NotImplementedFormatter();
  return table;
}, {} as FormatterTable);

// The locale-validating stub is registered separately so its validateArgs
// survives the no-op reduce above.
NOIMPL_FORMATTERS['i18n-money-format'] = new LegacyMoneyFormatter();
