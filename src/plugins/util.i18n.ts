import { Decimal } from '@phensley/cldr';

export const parseDecimal = (s: string | number): Decimal => {
  const decimal: new (s: string | number) => Decimal = require('@phensley/cldr').Decimal;
  return new decimal(s);
};
