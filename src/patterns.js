
const alt = (...segments) => segments.join('|');
const join = (...segments) => segments.join('');

const digits = '\\d+';
const wordPrefix = '[a-zA-Z]';
const wordSuffix = '[a-zA-Z0-9_-]*';
const word = wordPrefix + wordSuffix;

const whitespace = '[ \\f\\n\\r\\t\u000b]+';

const instructionArgs = '[^|}]+';

const operator = '&&|\\|\\|';

/**
 * Segment in a dotted variable reference.
 */
const segment = alt(
  digits,
  '(?:@|\\$)?' + word,
  '@'
);

/**
 * Path used for INJECT and MACRO instructions. Examples:
 *
 *   ./file.json
 *   ./messages-en_US.yaml
 */
const filePath = '[./a-zA-Z0-9_-]+';

/**
 * Predicate (minus the initial '.'). Examples:
 *
 *   equal?
 *   greaterThanOrEqual?
 */
const predicate = word + '\\?';

/**
 * Variable references. Examples:
 *
 *    @
 *    123
 *    foo
 *    foo.bar
 *    foo.123.bar
 *    @foo.bar
 *    $foo.bar
 */
const variableReference = join(
  '(?:' + segment + ')',
  '(?:\\.(?:' + segment + '))*'
);

/**
 * Variable definition. Examples:
 *
 *   @foo
 */
const variableDefinition = '@' + word;

/**
 * Variable separator. Examples:
 *
 *   foo,bar
 *   a , b , c
 */
const variableSeparator = ' *, *';

export {
  filePath,
  instructionArgs,
  operator,
  predicate,
  variableDefinition,
  variableReference,
  variableSeparator,
  word,
  whitespace
};
