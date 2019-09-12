import { Decimal } from '@phensley/cldr-core';

export const parseDecimal = (s: string | number): Decimal => {
  const decimal: new (s: string | number) => Decimal = require('@phensley/cldr-core').Decimal;
  return new decimal(s);
};
