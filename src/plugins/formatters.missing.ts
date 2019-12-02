import { Formatter, FormatterTable } from '../plugin';
import { Context } from '../context';
import { Variable } from '../variable';
import { TemplateError } from '../errors';

const missing = (name: string): TemplateError =>
  ({ type: 'engine', message: `"${name}" formatter is not yet implemented` });

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
  'datetime-interval',
  'datetimefield',
  'i18n-money-format',
  'money',
  'money-format',
  'money-string',
  'moneyFormat',
  'percentage-format',
  'plural',
  'product-price',
  'product-restock-notification',
  'product-scarcity',
  'unit',
];

export const MISSING_FORMATTERS: FormatterTable = NAMES.reduce((table, name) => {
  table[name] = new MissingFormatter(name);
  return table;
}, {} as FormatterTable);