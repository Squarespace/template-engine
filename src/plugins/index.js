import CommerceFormatters from './formatters.commerce';
import ContentFormatters from './formatters.content';
import CoreFormatters from './formatters.core';

import CommercePredicates from './predicates.commerce';
import ContentPredicates from './predicates.content';
import CorePredicates from './predicates.core';

export const Formatters = {
  ...CommerceFormatters,
  ...ContentFormatters,
  ...CoreFormatters,
};

export const Predicates = {
  ...CommercePredicates,
  ...ContentPredicates,
  ...CorePredicates,
};
