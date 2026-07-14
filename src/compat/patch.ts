/**
 * Legacy behaviors gated by a {@link CompatLevel}. A behavior's legacy form
 * stays active while the level sits below its threshold, or when a per-site
 * override forces it on. A fix that changes output ships with a legacy path
 * behind a new patch at a higher threshold, so higher levels apply more fixes
 * without changing the released surface at level 0.
 *
 * The thresholds freeze once a release ships; moving one would change live
 * sites at intermediate levels. The table below is frozen for the 3.0.0
 * release. Do not re-tier entries and do not rename. Retire a patch only when
 * no site needs it, and remove its legacy path, its tests, and the entry
 * together.
 *
 * Typescript compiler's level 0 must match Java level 0 current with the
 * 3.0.0 release.
 */

export type PatchName =
  | 'PARTIAL_DEPTH_LEAK'
  | 'COMPARE_TOTAL_ORDER'
  | 'TWITTER_BUTTON_USERNAME'
  | 'MONEY_BAD_DECIMAL'
  | 'MONEY_LOCALE_SYMBOLS'
  | 'MONEY_DOUBLE_ROUNDING'
  | 'MOD_ZERO'
  | 'NTH_MODULO_ZERO'
  | 'TRUNCATE_NEGATIVE'
  | 'HUMANIZE_DATE_TZ'
  | 'WEEK_MONDAY_ANCHOR'
  | 'SUBPATH_PARENT_SCOPE'
  | 'HTMLATTR_QUOTE'
  | 'SOCIAL_BUTTON_ATTRIBUTES'
  | 'TWITTER_LINKS_RAW_HTML'
  | 'JSON_LINE_SEPARATORS'
  | 'ENCODE_SPACE_WHITESPACE'
  | 'MONEY_BLANK_PARSE'
  | 'MONEY_UNKNOWN_CURRENCY'
  | 'LEGACY_MONEY_BAD_CURRENCY'
  | 'SPLIT_DIMENSIONS_NONNUMERIC'
  | 'DATETIME_MISSING_EPOCH'
  | 'MESSAGE_ARG_URL_SPLIT'
  | 'CURRENT_TYPE_ARITY'
  | 'JSON_START_KEYWORD'
  | 'COLOR_WEIGHT_LENGTH'
  | 'FORMAT_STATE_DIGITS'
  | 'ENCODE_URI_SURROGATE'
  | 'ENCODE_URI_QUOTE'
  | 'CART_QUANTITY_MISSING'
  | 'VARIED_PRICES_NON_ARRAY'
  | 'TIMEZONE_NULL_LITERAL'
  | 'SUMMARY_FIELD_TITLE_ESCAPES'
  | 'PRODUCT_PRICE_TRUE_SLOT'
  | 'DATETIME_INTERVAL_RAW'
  | 'EVAL_INTEGRAL_LONG'
  | 'SCARCITY_MISSING_FIELD';

/**
 * A gated behavior and the lowest level at which it is fixed.
 */
export interface Patch {
  readonly name: PatchName;
  readonly threshold: number;
}

/**
 * One entry per gated behavior, in release order. The threshold is the lowest
 * level where the behavior is fixed.
 */
const THRESHOLDS = {
  /**
   * The partial depth counter is not balanced on a depth breach or on a
   * partial that throws, so a later include fails with a spurious depth
   * error.
   */
  PARTIAL_DEPTH_LEAK: 1,

  /**
   * The compare order for mixed types is not a total order, so predicate
   * results differ from the JS engine.
   */
  COMPARE_TOTAL_ORDER: 1,

  /**
   * twitter-follow-button throws on an empty derived username and leaves
   * data-username unescaped.
   */
  TWITTER_BUTTON_USERNAME: 1,

  /**
   * money and decimal throw when the value is null or not a number.
   */
  MONEY_BAD_DECIMAL: 1,

  /**
   * i18n-money-format throws a malformed pattern error on a JVM default
   * locale without a dot decimal separator. No-op in this port: the gated
   * formatter path is a stub. It stays for table parity; see the legacy
   * money decision in todo 050.
   */
  MONEY_LOCALE_SYMBOLS: 1,

  /**
   * The legacy money formatters (i18n-money-format, moneyFormat,
   * money-format, money-string, cart-subtotal) format through a double and
   * lose precision on large values. The i18n half is a no-op in this port:
   * the gated formatter path is a stub. It stays for table parity; see the
   * legacy money decision in todo 050.
   */
  MONEY_DOUBLE_ROUNDING: 1,

  /**
   * mod divides by zero when the divisor is 0.
   */
  MOD_ZERO: 1,

  /**
   * nth? divides by zero when the modulus is 0.
   */
  NTH_MODULO_ZERO: 1,

  /**
   * truncate throws a string index error on a negative length.
   */
  TRUNCATE_NEGATIVE: 1,

  /**
   * timesince adds the zone offset to an epoch millis delta and reports the
   * wrong age.
   */
  HUMANIZE_DATE_TZ: 1,

  /**
   * The %W date field is Sunday anchored and duplicates %U instead of
   * Monday anchored.
   */
  WEEK_MONDAY_ANCHOR: 1,

  /**
   * @subpath in a message argument cannot address the parent scope.
   */
  SUBPATH_PARENT_SCOPE: 2,

  /**
   * htmlattr does not escape the single quote.
   */
  HTMLATTR_QUOTE: 2,

  /**
   * social-button leaves assetUrl and other attributes unescaped and does
   * not fall back on a present but empty assetUrl.
   */
  SOCIAL_BUTTON_ATTRIBUTES: 2,

  /**
   * activate-twitter-links linkifies before escaping and passes raw html
   * tags through.
   */
  TWITTER_LINKS_RAW_HTML: 2,

  /**
   * json and json-pretty emit raw U+2028 and U+2029 line separators.
   */
  JSON_LINE_SEPARATORS: 2,

  /**
   * encode-space replaces tabs and newlines, not just spaces.
   */
  ENCODE_SPACE_WHITESPACE: 2,

  /**
   * cart-subtotal and the legacy money formatters throw on blank or null
   * input. No-op in this port: the gated formatter path is a stub. It stays
   * for table parity; see the legacy money decision in todo 050.
   */
  MONEY_BLANK_PARSE: 2,

  /**
   * money renders a bare number with no symbol for an unknown currency
   * code.
   */
  MONEY_UNKNOWN_CURRENCY: 2,

  /**
   * i18n-money-format throws for a present but invalid currency code. No-op
   * in this port: the gated formatter path is a stub. It stays for table
   * parity; see the legacy money decision in todo 050.
   */
  LEGACY_MONEY_BAD_CURRENCY: 2,

  /**
   * width, height, and resize throw on non numeric dimensions.
   */
  SPLIT_DIMENSIONS_NONNUMERIC: 2,

  /**
   * datetime and relative-time render the epoch date for a missing value.
   */
  DATETIME_MISSING_EPOCH: 2,

  /**
   * message splits a positional url argument on the colon.
   */
  MESSAGE_ARG_URL_SPLIT: 2,

  /**
   * current-type? throws when called with no arguments.
   */
  CURRENT_TYPE_ARITY: 2,

  /**
   * A boolean keyword argument with leading whitespace is not parsed as
   * json.
   */
  JSON_START_KEYWORD: 2,

  /**
   * color-weight accepts 4 and 5 character hex and reports a wrong weight.
   */
  COLOR_WEIGHT_LENGTH: 2,

  /**
   * format leaks a slot value after a bad tag and has no brace escape.
   */
  FORMAT_STATE_DIGITS: 2,

  /**
   * encode-uri renders the text null for a lone surrogate.
   */
  ENCODE_URI_SURROGATE: 2,

  /**
   * encode-uri percent encodes the single quote.
   */
  ENCODE_URI_QUOTE: 2,

  /**
   * cart-quantity throws when an entry has no quantity.
   */
  CART_QUANTITY_MISSING: 2,

  /**
   * varied-prices? throws when variants is an object with two or more
   * fields instead of an array.
   */
  VARIED_PRICES_NON_ARRAY: 2,

  /**
   * A null timeZone renders as the text null and fails the zone lookup.
   */
  TIMEZONE_NULL_LITERAL: 3,

  /**
   * summary-form-field leaves rawTitle and the fallback text unescaped.
   */
  SUMMARY_FIELD_TITLE_ESCAPES: 3,

  /**
   * product-price puts a boolean true in the formattedFromPrice slot.
   */
  PRODUCT_PRICE_TRUE_SLOT: 3,

  /**
   * datetime-interval returns the raw input for a missing operand.
   */
  DATETIME_INTERVAL_RAW: 3,

  /**
   * An integral eval result stays a plain number, so exact-value consumers
   * such as the level 1 compare ordering treat it as a double.
   */
  EVAL_INTEGRAL_LONG: 3,

  /**
   * product-scarcity and restock throw when the product has no id or the
   * merchandising context entry has no scarcityEnabled field.
   */
  SCARCITY_MISSING_FIELD: 3
} as const;

/**
 * Build the patch entries in table order.
 */
const _values: Patch[] = (Object.keys(THRESHOLDS) as PatchName[]).map(name =>
  Object.freeze({ name, threshold: THRESHOLDS[name] })
);

const _maxThreshold: number = _values.reduce((max, entry) => Math.max(max, entry.threshold), 0);

type PatchConst = { [name in PatchName]: Patch } & {
  /**
   * Every patch in release order.
   */
  values(): Patch[];

  /**
   * The highest threshold in the table.
   */
  maxThreshold(): number;
};

/**
 * The patch table. Each member names a legacy behavior and gives the lowest
 * level where it stops being active. The table is frozen for the 3.0.0
 * release; do not re-tier or rename entries.
 */
export const Patch = Object.freeze(
  Object.assign({}, ..._values.map(entry => ({ [entry.name]: entry })), {
    values(): Patch[] {
      return _values;
    },
    maxThreshold(): number {
      return _maxThreshold;
    }
  })
) as PatchConst;
