
const alt = (...segments: string[]) => segments.join('|');
const join = (...segments: string[]) => segments.join('');

const digits = '\\d+';
const wordPrefix = '[a-zA-Z]';
const wordSuffix = '[a-zA-Z0-9_-]*';
export const word = wordPrefix + wordSuffix;

export const whitespace = '[ \\f\\n\\r\\t\u000b]+';

export const instructionArgs = '[^|}]+';

export const operator = '&&|\\|\\|';

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
export const filePath = '[./a-zA-Z0-9_-]+';

/**
 * Predicate (minus the initial '.'). Examples:
 *
 *   equal?
 *   greaterThanOrEqual?
 */
export const predicate = word + '\\?';

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
export const variableReference = join(
  '(?:' + segment + ')',
  '(?:\\.(?:' + segment + '))*'
);

/**
 * Variable definition. Examples:
 *
 *   @foo
 */
export const variableDefinition = '@' + word;

/**
 * Variable separator. Examples:
 *
 *   foo,bar
 *   a , b , c
 */
export const variableSeparator = ' *, *';
