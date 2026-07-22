import { Compiler } from '../src/compiler';
import { CompatLevel } from '../src/compat/compat-level';
import { Patch } from '../src/compat/patch';

/**
 * Parse-time argument validation (todo 023): predicates and formatters run
 * a validateArgs step during parsing, mirroring the Java Tokenizer at
 * Tokenizer.java:597 (predicates) and :847 (formatters). The validation is
 * not compat-gated; only the JSON keyword-start rule inside it is (todo
 * 024), so every level reports the same errors.
 *
 * Predicate-only templates run inside a block so the assembler has an .end
 * to close, keeping the assertions to the validation error alone.
 */

const compiler = new Compiler();

const errors = (source: string, compat?: CompatLevel): string[] =>
  compiler.parse(source, compat).errors.map((e) => e.message);

const expectErrors = (source: string, expected: string[], compat?: CompatLevel) => {
  expect(errors(source, compat)).toEqual(expected);
};

const expectClean = (source: string, compat?: CompatLevel) => {
  expect(errors(source, compat)).toEqual([]);
};

test('headline: mangled first argument is a predicate args-invalid error at every level', () => {
  // The whitespace delimiter in `.equal?foo "yes"` is 'f', so the argument
  // list splits to a single "oo \"yes\"" which is neither JSON nor a
  // variable reference. Java fails exactly this shape with
  // PREDICATE_ARGS_INVALID, and the argument count (1) is otherwise valid.
  const expected = [
    `SyntaxError: Predicate equal? arguments invalid: 'Argument oo "yes" must be a valid JSON value or variable reference.'`,
  ];
  expectErrors('{.equal?foo "yes"}yes{.end}', expected, CompatLevel.defaultLevel());
  expectErrors('{.equal?foo "yes"}yes{.end}', expected, CompatLevel.at(1));
  expectErrors('{.equal?foo "yes"}yes{.end}', expected, CompatLevel.fixed());
  expectErrors('{.if a}A{.or equal?foo "yes"}B{.end}', expected);
  expectErrors('{.if equal?foo "yes"}yes{.end}', expected);
});

test('headline: execute surfaces the parse error and rendering continues', () => {
  const template = '{.equal?foo "yes"}yes{.or}no{.end}';
  for (const compat of [undefined, CompatLevel.at(1), CompatLevel.fixed()]) {
    const { errors: execErrors } = compiler.execute({ code: template, json: {}, compat });
    expect(execErrors.length).toEqual(1);
    expect(execErrors[0].message).toEqual(
      `SyntaxError: Predicate equal? arguments invalid: 'Argument oo "yes" must be a valid JSON value or variable reference.'`
    );
  }
});

test('predicate needs-args: zero-argument required predicates fail before validation', () => {
  expectErrors('{.equal?}x{.end}', [`SyntaxError: Predicate '.equal?' requires arguments but none were provided.`]);
  expectErrors('{.if a}A{.or equal?}B{.end}', [
    `SyntaxError: Predicate '.equal?' requires arguments but none were provided.`,
  ]);
  expectErrors('{.collectionTypeNameEquals?}x{.end}', [
    `SyntaxError: Predicate '.collectionTypeNameEquals?' requires arguments but none were provided.`,
  ]);
});

test('predicate arity: too many arguments', () => {
  expectErrors('{.equal? a b c}x{.end}', [
    `SyntaxError: Predicate equal? arguments invalid: 'Too many args. Takes between 1 and 2'`,
  ]);
  // The Java TokenizerCoreTest pins this shape through `.or`, which this
  // port exercises as an if-alternate.
  expectErrors('{.if a}A{.or equal? a b c}B{.end}', [
    `SyntaxError: Predicate equal? arguments invalid: 'Too many args. Takes between 1 and 2'`,
  ]);
  expectErrors('{.if equal? a b c}x{.end}', [
    `SyntaxError: Predicate equal? arguments invalid: 'Too many args. Takes between 1 and 2'`,
  ]);
});

test('an all-delimiter argument string still runs validateArgs', () => {
  // `{.equal? }` splits to zero arguments but the argument string is
  // present, so Java reaches validateArgs and between(1,2) rejects it
  // rather than reporting the needs-args error.
  expectErrors('{.equal? }x{.end}', [
    `SyntaxError: Predicate equal? arguments invalid: 'Not enough args. At least 1 expected'`,
  ]);
});

test('predicate arity: nth? needs at least one argument but never requires args', () => {
  // Java registers nth? with requiresArgs=false, so a zero-argument call
  // reaches validateArgs, whose between(1,2) rejects it.
  expectErrors('{.nth?}x{.end}', [
    `SyntaxError: Predicate nth? arguments invalid: 'Not enough args. At least 1 expected'`,
  ]);
});

test('predicate args must be JSON or a variable reference', () => {
  // Port of CorePredicatesTest.testJsonPredicateVariable: `{.equal? 1 .}`
  // fails validation on the bare dot.
  expectErrors('{.equal? 1 .}x{.end}', [
    `SyntaxError: Predicate equal? arguments invalid: 'Argument . must be a valid JSON value or variable reference.'`,
  ]);
  expectErrors('{.greaterThan? foo}x{.end}', []);
  expectErrors('{.equal? [1,2 x}x{.end}', [
    `SyntaxError: Predicate equal? arguments invalid: 'Argument [1,2 must be a valid JSON value or variable reference.'`,
  ]);
});

test('zero-or-more predicates accept a missing argument list', () => {
  // even?, odd?, debug?, plural?, singular? carry no rule and no required
  // flags, so a bare call parses cleanly at the default and fixed levels.
  for (const template of ['{.even?}x{.end}', '{.odd?}x{.end}', '{.debug?}x{.end}', '{.plural?}x{.end}', '{.singular?}x{.end}']) {
    expectClean(template);
    expectClean(template, CompatLevel.fixed());
  }
});

test('formatter needs-args', () => {
  // Port of TokenizerCoreTest.testFormatterErrors `{foo|apply}`.
  expectErrors('{x|apply}', [`SyntaxError: Formatter 'apply' needs arguments but none were provided.`]);
  expectErrors('{x|cycle}', [`SyntaxError: Formatter 'cycle' needs arguments but none were provided.`]);
  expectErrors('{x|key-by}', [`SyntaxError: Formatter 'key-by' needs arguments but none were provided.`]);
  expectErrors('{x|lookup}', [`SyntaxError: Formatter 'lookup' needs arguments but none were provided.`]);
  expectErrors('{x|resizedWidthForHeight}', [
    `SyntaxError: Formatter 'resizedWidthForHeight' needs arguments but none were provided.`,
  ]);
  expectErrors('{x|date}', [`SyntaxError: Formatter 'date' needs arguments but none were provided.`]);
});

test('formatter arity', () => {
  // Port of TokenizerCoreTest.testFormatterErrors `{a|pluralize/a/b/c}`.
  expectErrors('{x|pluralize a b c}', [
    `SyntaxError: Formatter 'pluralize' arguments are invalid: 'Too many args. Takes between 0 and 2'`,
  ]);
  expectErrors('{x|key-by a b}', [
    `SyntaxError: Formatter 'key-by' arguments are invalid: 'Wrong number of args, exactly 1 expected'`,
  ]);
  expectErrors('{x|lookup a b}', [
    `SyntaxError: Formatter 'lookup' arguments are invalid: 'Wrong number of args, exactly 1 expected'`,
  ]);
  // A chain keeps evaluating each formatter and fails the whole expression.
  expectErrors('{x|safe|safe|apply}', [
    `SyntaxError: Formatter 'apply' needs arguments but none were provided.`,
  ]);
});

test('truncate length must be an integer', () => {
  // Port of CoreFormattersTest.testTruncate `{@|truncate xyz}`.
  expectErrors('{x|truncate xyz}', [
    `SyntaxError: Formatter 'truncate' arguments are invalid: 'bad value for length 'xyz''`,
  ]);
  // Java guards on a present argument, so an empty call is clean.
  expectClean('{x|truncate}');
  expectClean('{x|truncate 5}');
});

test('resize family takes one int argument', () => {
  expectErrors('{x|resizedWidthForHeight foo}', [
    `SyntaxError: Formatter 'resizedWidthForHeight' arguments are invalid: 'For input string: "foo"'`,
  ]);
  expectErrors('{x|resizedHeightForWidth 1.5}', [
    `SyntaxError: Formatter 'resizedHeightForWidth' arguments are invalid: 'For input string: "1.5"'`,
  ]);
  expectErrors('{x|squarespaceThumbnailForWidth 12abc}', [
    `SyntaxError: Formatter 'squarespaceThumbnailForWidth' arguments are invalid: 'For input string: "12abc"'`,
  ]);
  expectErrors('{x|squarespaceThumbnailForHeight -x}', [
    `SyntaxError: Formatter 'squarespaceThumbnailForHeight' arguments are invalid: 'For input string: "-x"'`,
  ]);
  expectClean('{x|resizedHeightForWidth 50}');
  expectClean('{x|resizedWidthForHeight -50}');
});

test('image and child-image-meta take at most one argument', () => {
  expectErrors('{x|image a b}', [
    `SyntaxError: Formatter 'image' arguments are invalid: 'Too many args. Takes between 0 and 1'`,
  ]);
  expectClean('{x|image}');
  expectClean('{x|image main-image}');

  expectErrors('{x|child-image-meta a b}', [
    `SyntaxError: Formatter 'child-image-meta' arguments are invalid: 'Too many args. Takes between 0 and 1'`,
  ]);
  expectErrors('{x|child-image-meta abc}', [
    `SyntaxError: Formatter 'child-image-meta' arguments are invalid: 'expected an integer index, found 'abc''`,
  ]);
  expectClean('{x|child-image-meta}');
  expectClean('{x|child-image-meta 2}');
});

test('i18n-money-format locale argument', () => {
  // The Java LegacyMoneyFormatter accepts a locale after normalizing
  // hyphens to underscores, and reports an invalid one at parse time.
  expectErrors('{x|i18n-money-format bad-loc}', [
    `SyntaxError: Formatter 'i18n-money-format' arguments are invalid: 'Invalid locale: bad-loc'`,
  ]);
  expectErrors('{x|i18n-money-format 12345}', [
    `SyntaxError: Formatter 'i18n-money-format' arguments are invalid: 'Invalid locale: 12345'`,
  ]);
  expectClean('{x|i18n-money-format}');
  expectClean('{x|i18n-money-format en-US}');
  expectClean('{x|i18n-money-format sv-SE}');
});

test('datetime, datetime-interval, decimal and money accept any option argument', () => {
  // The option parsers reject nothing (Java OptionParsers never throws), so
  // even a malformed option parses; validation just runs the same parsing
  // the runtime applies.
  for (const template of [
    '{d|datetime banana}',
    '{d|datetime date:full time:short}',
    '{a|datetime-interval x y}',
    '{v|decimal style:percent}',
    '{v|decimal not-an-option}',
    '{m|money style:name}',
    '{m|money bogus:value}',
  ]) {
    expectClean(template);
  }
});

test('positive rows: every ported plugin accepts its valid calls', () => {
  const predicates = [
    '{.equal? a 1}',
    '{.equal? 1}',
    '{.notEqual? "x" a}',
    '{.greaterThan? a 1}',
    '{.greaterThanOrEqual? a 1}',
    '{.lessThan? a 1}',
    '{.lessThanOrEqual? a 1}',
    '{.even? 2}',
    '{.odd? 3}',
    '{.nth? 2}',
    '{.nth? n 3}',
    '{.collectionTypeNameEquals? foo}',
  ];
  for (const template of predicates) {
    const complete = template.replace(/\}$/, '}x{.end}');
    expectClean(complete);
    expectClean(complete, CompatLevel.fixed());
  }

  for (const template of [
    '{x|apply foo}',
    '{x|apply foo private}',
    '{x|cycle a b c}',
    '{x|truncate 5 ..}',
    '{x|key-by k}',
    '{x|lookup k}',
    '{x|pluralize}',
    '{x|pluralize es}',
    '{x|pluralize item items}',
  ]) {
    expectClean(template);
    expectClean(template, CompatLevel.fixed());
  }
});

test('a predicate with args still resolves at runtime', () => {
  // The runtime re-derives values from the raw arguments; validation only
  // adds the error set. Output is unchanged for valid calls.
  const { ctx, errors: execErrors } = compiler.execute({
    code: '{.equal? a 1}yes{.or}no{.end}',
    json: { a: 1 },
  });
  expect(execErrors).toEqual([]);
  expect(ctx.render()).toEqual('yes');
});

test('validated argument counts stay identical across the whole ladder', () => {
  // Every template in this list is parseable at every position, echoing the
  // released surface the compat fixture suite pins at level 0.
  const templates = [
    '{.equal? a 1}x{.end}',
    '{.nth? 2}x{.end}',
    '{.even?}x{.end}',
    '{x|truncate 3}',
    '{x|cycle a b}',
    '{x|image main-image}',
    '{x|resizedWidthForHeight 50}',
    '{d|datetime short}',
    '{x|i18n-money-format en-US}',
  ];
  const levels = [...Array(Patch.maxThreshold() + 1)].map((_, n) => CompatLevel.at(n));
  for (const template of templates) {
    // The default level and every rung, plus the fully fixed end.
    for (const compat of [CompatLevel.defaultLevel(), ...levels, CompatLevel.fixed()]) {
      expectClean(template, compat);
    }
  }
});
