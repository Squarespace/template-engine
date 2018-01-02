import CommerceFormatters from './formatters.commerce';
import ContentFormatters from './formatters.content';
import CoreFormatters from './formatters.core';
import I18nFormatters from './formatters.i18n';
import SocialFormatters from './formatters.social';

import CommercePredicates from './predicates.commerce';
import ContentPredicates from './predicates.content';
import CorePredicates from './predicates.core';
import I18nPredicates from './predicates.i18n';
import SlidePredicates from './predicates.slide';
import SocialPredicates from './predicates.social';


export const Formatters = {
  ...CommerceFormatters,
  ...ContentFormatters,
  ...CoreFormatters,
  ...I18nFormatters,
  ...SocialFormatters,
};

export const Predicates = {
  ...CommercePredicates,
  ...ContentPredicates,
  ...CorePredicates,
  ...I18nPredicates,
  ...SlidePredicates,
  ...SocialPredicates,
};
