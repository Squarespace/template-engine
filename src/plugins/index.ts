import { Formatter, PredicatePlugin } from '../plugin';

export * from './formatters.commerce';
export * from './formatters.content';
export * from './formatters.core';
export * from './formatters.date';
export * from './formatters.missing';
export * from './formatters.social';

export * from './predicates.commerce';
export * from './predicates.content';
export * from './predicates.core';
export * from './predicates.missing';
export * from './predicates.slide';
export * from './predicates.social';

import { COMMERCE_FORMATTERS } from './formatters.commerce';
import { CONTENT_FORMATTERS } from './formatters.content';
import { CORE_FORMATTERS } from './formatters.core';
import { DATE_FORMATTERS } from './formatters.date';
import { MISSING_FORMATTERS } from './formatters.missing';
import { SOCIAL_FORMATTERS } from './formatters.social';

import { COMMERCE_PREDICATES } from './predicates.commerce';
import { CONTENT_PREDICATES } from './predicates.content';
import { CORE_PREDICATES } from './predicates.core';
import { MISSING_PREDICATES } from './predicates.missing';
import { SLIDE_PREDICATES } from './predicates.slide';
import { SOCIAL_PREDICATES } from './predicates.social';

// Table of default formatter instances.
export const Formatters: { [name: string]: Formatter } = {
  ...COMMERCE_FORMATTERS,
  ...CONTENT_FORMATTERS,
  ...CORE_FORMATTERS,
  ...DATE_FORMATTERS,
  ...MISSING_FORMATTERS,
  ...SOCIAL_FORMATTERS,
};

// Table of default predicate instances.
export const Predicates: { [name: string]: PredicatePlugin } = {
  ...COMMERCE_PREDICATES,
  ...CONTENT_PREDICATES,
  ...CORE_PREDICATES,
  ...MISSING_PREDICATES,
  ...SLIDE_PREDICATES,
  ...SOCIAL_PREDICATES,
};
