import { Compiler } from '../src/compiler';
import { CompatLevel } from '../src/compat/compat-level';
import { Patch } from '../src/compat/patch';

/**
 * Pins the compat level invariants. The ladder is defined by the patch
 * thresholds and must behave the same at every level in between.
 */
test('fixed level disables every patch', () => {
  // The fully fixed compiler sits at the highest level.
  const compat = CompatLevel.fixed();
  expect(compat.level()).toBe(Patch.maxThreshold());
  for (const patch of Patch.values()) {
    expect(compat.enabled(patch)).toBe(false);
  }
});

test('default level enables every patch', () => {
  // The default keeps every legacy behavior active, the released surface.
  const compat = CompatLevel.defaultLevel();
  expect(compat.level()).toBe(0);
  for (const patch of Patch.values()) {
    expect(compat.enabled(patch)).toBe(true);
  }
});

test('level thresholds', () => {
  // The legacy active set at level L is the patches with threshold above L.
  // A fix applies at its threshold level and above.
  for (let level = 0; level <= Patch.maxThreshold(); level++) {
    const compat = CompatLevel.at(level);
    for (const patch of Patch.values()) {
      expect(compat.enabled(patch)).toBe(patch.threshold > level);
    }
  }
});

test('raising a level only fixes behaviors', () => {
  // Raising a site level can only fix behaviors, never re-enable legacy.
  for (let level = 0; level < Patch.maxThreshold(); level++) {
    for (const patch of Patch.values()) {
      if (CompatLevel.at(level + 1).enabled(patch)) {
        expect(CompatLevel.at(level).enabled(patch)).toBe(true);
      }
    }
  }
});

test('overrides force legacy on', () => {
  const base = CompatLevel.fixed();
  const patched = base.withPatch(Patch.MOD_ZERO);
  for (const patch of Patch.values()) {
    expect(patched.enabled(patch)).toBe(patch === Patch.MOD_ZERO);
  }

  // The original level is untouched.
  for (const patch of Patch.values()) {
    expect(base.enabled(patch)).toBe(false);
  }

  // An override on an already active patch is a no-op for that patch.
  const defaulted = CompatLevel.defaultLevel().withPatch(Patch.MOD_ZERO);
  expect(defaulted.enabled(Patch.MOD_ZERO)).toBe(true);
  expect(defaulted.level()).toBe(0);
});

test('withLevel keeps overrides', () => {
  // A level change must not drop the override set.
  const patched = CompatLevel.at(0)
    .withPatch(Patch.MOD_ZERO)
    .withLevel(Patch.maxThreshold());
  expect(patched.level()).toBe(Patch.maxThreshold());
  for (const patch of Patch.values()) {
    expect(patched.enabled(patch)).toBe(patch === Patch.MOD_ZERO);
  }
});

test('executor wiring combines compat, compatLevel and compatPatch', () => {
  // Java tests both setter orders here. This port takes one props object and
  // applies the base, then the numeric level, then any forced patches. The
  // outcome matches both Java orders because a level change keeps overrides
  // and an override keeps the level.
  const compiler = new Compiler();
  let { ctx } = compiler.execute({
    code: 'x',
    json: {},
    compatLevel: 2,
    compatPatch: Patch.MOD_ZERO,
  });
  expect(ctx.compatEnabled(Patch.MOD_ZERO)).toBe(true);
  expect(ctx.compatEnabled(Patch.JSON_START_KEYWORD)).toBe(false);
  expect(ctx.compatEnabled(Patch.TIMEZONE_NULL_LITERAL)).toBe(true);
  expect(ctx.compat.level()).toBe(2);

  // The same outcome when the base level is supplied directly.
  ({ ctx } = compiler.execute({
    code: 'x',
    json: {},
    compat: CompatLevel.at(2),
    compatPatch: Patch.MOD_ZERO,
  }));
  expect(ctx.compatEnabled(Patch.MOD_ZERO)).toBe(true);
  expect(ctx.compatEnabled(Patch.JSON_START_KEYWORD)).toBe(false);
  expect(ctx.compatEnabled(Patch.TIMEZONE_NULL_LITERAL)).toBe(true);
  expect(ctx.compat.level()).toBe(2);

  // Default execution is still level 0 with no overrides.
  ({ ctx } = compiler.execute({ code: 'x', json: {} }));
  expect(ctx.compat.level()).toBe(0);
  expect(ctx.compatEnabled(Patch.MOD_ZERO)).toBe(true);
  // The compat argument travels into parse without changing output.
  ({ ctx } = compiler.execute({ code: '{a|html}', json: { a: '<tag>' }, compatLevel: 3 }));
  expect(ctx.render()).toEqual('&lt;tag&gt;');
});

test('negative levels throw', () => {
  expect(() => CompatLevel.at(-1)).toThrow();
  expect(() => CompatLevel.at(0).withLevel(-1)).toThrow();
});

test('equals', () => {
  expect(CompatLevel.at(2).equals(CompatLevel.at(2))).toBe(true);
  expect(CompatLevel.defaultLevel().equals(CompatLevel.at(0))).toBe(true);
  expect(CompatLevel.at(1).equals(CompatLevel.at(2))).toBe(false);
  const a = CompatLevel.at(2).withPatch(Patch.MOD_ZERO);
  const b = CompatLevel.at(2).withPatch(Patch.MOD_ZERO);
  expect(a.equals(b)).toBe(true);
  expect(a.equals(CompatLevel.at(2))).toBe(false);
});

/**
 * Pins the ladder shape and the table itself. Thresholds freeze once a
 * release ships, so the full table is pinned here: 37 entries in release
 * order, 11 at threshold 1, 20 at 2, 6 at 3.
 */
test('ladder shape and frozen table', () => {
  expect(Patch.maxThreshold()).toBe(3);

  const expected: { [name: string]: number } = {
    PARTIAL_DEPTH_LEAK: 1,
    COMPARE_TOTAL_ORDER: 1,
    TWITTER_BUTTON_USERNAME: 1,
    MONEY_BAD_DECIMAL: 1,
    MONEY_LOCALE_SYMBOLS: 1,
    MONEY_DOUBLE_ROUNDING: 1,
    MOD_ZERO: 1,
    NTH_MODULO_ZERO: 1,
    TRUNCATE_NEGATIVE: 1,
    HUMANIZE_DATE_TZ: 1,
    WEEK_MONDAY_ANCHOR: 1,
    SUBPATH_PARENT_SCOPE: 2,
    HTMLATTR_QUOTE: 2,
    SOCIAL_BUTTON_ATTRIBUTES: 2,
    TWITTER_LINKS_RAW_HTML: 2,
    JSON_LINE_SEPARATORS: 2,
    ENCODE_SPACE_WHITESPACE: 2,
    MONEY_BLANK_PARSE: 2,
    MONEY_UNKNOWN_CURRENCY: 2,
    LEGACY_MONEY_BAD_CURRENCY: 2,
    SPLIT_DIMENSIONS_NONNUMERIC: 2,
    DATETIME_MISSING_EPOCH: 2,
    MESSAGE_ARG_URL_SPLIT: 2,
    CURRENT_TYPE_ARITY: 2,
    JSON_START_KEYWORD: 2,
    COLOR_WEIGHT_LENGTH: 2,
    FORMAT_STATE_DIGITS: 2,
    ENCODE_URI_SURROGATE: 2,
    ENCODE_URI_QUOTE: 2,
    CART_QUANTITY_MISSING: 2,
    VARIED_PRICES_NON_ARRAY: 2,
    TIMEZONE_NULL_LITERAL: 3,
    SUMMARY_FIELD_TITLE_ESCAPES: 3,
    PRODUCT_PRICE_TRUE_SLOT: 3,
    DATETIME_INTERVAL_RAW: 3,
    EVAL_INTEGRAL_LONG: 3,
    SCARCITY_MISSING_FIELD: 3,
  };
  const names = Object.keys(expected);
  expect(names.length).toBe(37);
  expect(Patch.values().map(p => p.name)).toEqual(names);

  for (const patch of Patch.values()) {
    expect(patch.threshold).toBe(expected[patch.name]);
    expect(patch.threshold).toBeGreaterThanOrEqual(1);
    expect(patch.threshold).toBeLessThanOrEqual(3);
  }

  const counts = [0, 0, 0, 0];
  for (const patch of Patch.values()) {
    counts[patch.threshold]++;
  }
  expect(counts.slice(1)).toEqual([11, 20, 6]);
});
