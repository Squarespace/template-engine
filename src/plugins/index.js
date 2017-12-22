import CommerceFormatters from './formatters.commerce';
import ContentFormatters from './formatters.content';
import CoreFormatters from './formatters.core';
import SocialFormatters from './formatters.social';

import CommercePredicates from './predicates.commerce';
import ContentPredicates from './predicates.content';
import CorePredicates from './predicates.core';
import SocialPredicates from './predicates.social';


export const Formatters = {
  ...CommerceFormatters,
  ...ContentFormatters,
  ...CoreFormatters,
  ...SocialFormatters,
};

export const Predicates = {
  ...CommercePredicates,
  ...ContentPredicates,
  ...CorePredicates,
  ...SocialPredicates,
};
