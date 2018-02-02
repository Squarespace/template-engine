import * as commerceFormatters from './formatters.commerce';
import * as contentFormatters from './formatters.content';
import * as coreFormatters from './formatters.core';
import * as i18nFormatters from './formatters.i18n';
import * as socialFormatters from './formatters.social';

import * as commercePredicates from './predicates.commerce';
import * as contentPredicates from './predicates.content';
import * as corePredicates from './predicates.core';
import * as i18nPredicates from './predicates.i18n';
import * as slidePredicates from './predicates.slide';
import * as socialPredicates from './predicates.social';

// Table of default formatter instances.
export const Formatters = {
  ...commerceFormatters.TABLE,
  ...contentFormatters.TABLE,
  ...coreFormatters.TABLE,
  ...i18nFormatters.TABLE,
  ...socialFormatters.TABLE,
};

// Table of default predicate instances.
export const Predicates = {
  ...commercePredicates.TABLE,
  ...contentPredicates.TABLE,
  ...corePredicates.TABLE,
  ...i18nPredicates.TABLE,
  ...slidePredicates.TABLE,
  ...socialPredicates.TABLE,
};

// Formatter and predicate classes.
export const plugins = {
  ...commerceFormatters,
  ...contentFormatters,
  ...coreFormatters,
  ...i18nFormatters,
  ...socialFormatters,

  ...commercePredicates,
  ...contentPredicates,
  ...corePredicates,
  ...i18nPredicates,
  ...slidePredicates,
  ...socialPredicates
};
