import { Formatter, FormatterTable } from '../plugin';
import { Context } from '../context';
import { Variable } from '../variable';
import { TemplateError } from '../errors';

const missing = (name: string): TemplateError =>
  ({ type: 'engine', message: `"${name}" formatter is not implemented in 1.x` });

export class MissingFormatter extends Formatter {
  private error: TemplateError;
  constructor(name: string) {
    super();
    this.error = missing(name);
  }

  apply(args: string[], vars: Variable[], ctx: Context): void {
    ctx.error(this.error);
  }
}

const NAMES = [
  'bookkeeper-money-format',
  'cart-subtotal',
  'datetime',
  'datetime-interval',
  'datetimefield',
  'decimal',
  'humanizeDuration',
  'i18n-money-format',
  'message',
  'money',
  'money-format',
  'money-string',
  'moneyFormat',
  'percentage-format',
  'product-price',
  'product-restock-notification',
  'product-scarcity',
  'plural',
  'timesince',
  'unit'
];

export const MISSING_FORMATTERS: FormatterTable = NAMES.reduce((table, name) => {
  table[name] = new MissingFormatter(name);
  return table;
}, {} as FormatterTable);
