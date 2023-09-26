import { Decimal } from '@phensley/cldr-core';

export const parseDecimal = (s: string | number): Decimal | undefined => {
  try {
    return new Decimal(s);
  } catch (e) {
    return undefined;
  }
};
