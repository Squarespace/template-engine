import { Formatter, FormatterTable } from '../plugin';
import { Context } from '../context';
import { Variable } from '../variable';
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

const NOIMPL = ['datetimefield', 'i18n-money-format', 'money-format', 'money-string', 'moneyFormat', 'unit'];

// const MISSING = [
// ];

export const NOIMPL_FORMATTERS: FormatterTable = NOIMPL.reduce((table, name) => {
  table[name] = new NotImplementedFormatter();
  return table;
}, {} as FormatterTable);

// export const MISSING_FORMATTERS: FormatterTable = MISSING.reduce((table, name) => {
//   table[name] = new MissingFormatter(name);
//   return table;
// }, {} as FormatterTable);
