import { FormatterMap, PredicateMap } from '../plugin';

export * from './formatters.commerce';
export * from './formatters.content';
export * from './formatters.core';
export * from './formatters.date';
// export * from './formatters.datecldr';
export * from './formatters.i18n';
export * from './formatters.missing';
export * from './formatters.social';

export * from './predicates.commerce';
export * from './predicates.content';
export * from './predicates.core';
export * from './predicates.i18n';
export * from './predicates.missing';
export * from './predicates.slide';
export * from './predicates.social';

import { COMMERCE_FORMATTERS } from './formatters.commerce';
import { CONTENT_FORMATTERS } from './formatters.content';
import { CORE_FORMATTERS } from './formatters.core';
// import { DATECLDR_FORMATTERS } from './formatters.datecldr';
import { DATE_FORMATTERS } from './formatters.date';
import { I18N_FORMATTERS } from './formatters.i18n';
// import { MISSING_FORMATTERS } from './formatters.missing';
import { SOCIAL_FORMATTERS } from './formatters.social';

import { COMMERCE_PREDICATES } from './predicates.commerce';
import { CONTENT_PREDICATES } from './predicates.content';
import { CORE_PREDICATES } from './predicates.core';
import { I18N_PREDICATES } from './predicates.i18n';
import { MISSING_PREDICATES } from './predicates.missing';
import { SLIDE_PREDICATES } from './predicates.slide';
import { SOCIAL_PREDICATES } from './predicates.social';

// Table of default formatter instances.
export const Formatters: FormatterMap = {
  ...COMMERCE_FORMATTERS,
  ...CONTENT_FORMATTERS,
  ...CORE_FORMATTERS,
  // ...DATECLDR_FORMATTERS,
  ...DATE_FORMATTERS,
  ...I18N_FORMATTERS,
  // ...MISSING_FORMATTERS,
  ...SOCIAL_FORMATTERS,
};

// Table of default predicate instances.
export const Predicates: PredicateMap = {
  ...COMMERCE_PREDICATES,
  ...CONTENT_PREDICATES,
  ...CORE_PREDICATES,
  ...I18N_PREDICATES,
  ...MISSING_PREDICATES,
  ...SLIDE_PREDICATES,
  ...SOCIAL_PREDICATES,
};
