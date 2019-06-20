import { Formatter, FormatterTable } from '../plugin';
import { Context } from '../context';
import { Variable } from '../variable';

// TODO: datetime
// TODO: datetime-interval
// TODO: datetimefield
// TODO: decimal
// TODO: i18n-money-format  (Legacy)

export class MessageFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    // TODO: message formatter
  }
}

// TODO: money
// TODO: plural (Legacy, deprecate)
// TODO: unit


export const TABLE: FormatterTable = {
  message: new MessageFormatter()
};
