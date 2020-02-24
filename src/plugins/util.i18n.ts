import { Decimal } from '@phensley/cldr-core';

export const parseDecimal = (s: string | number): Decimal | undefined => {
  const decimal: new (s: string | number) => Decimal = require('@phensley/cldr-core').Decimal;
  try {
    return new decimal(s);
  } catch (e) {
    return undefined;
  }
};
