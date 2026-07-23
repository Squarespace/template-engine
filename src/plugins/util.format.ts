const BASE = '0'.charCodeAt(0);

/**
 * Performs positional substitution of arguments in a pattern in a single
 * pass.
 *
 * The legacy flag has the same polarity as Context.compatEnabled: true keeps
 * the released state machine (no brace escape, and a '{' during a bad tag
 * starts a new tag), false applies the FORMAT_STATE_DIGITS fix where "{{"
 * and "}}" render literal braces and a bad tag is ignored until its closing
 * brace.
 *
 * Two released quirks stay in the legacy path and both diverge from Java
 * legacy. Java counts digits while a bad tag is ignored, so "{x 2}" leaks
 * slot 0; the released output never leaks. And Java holds ignore until the
 * closing brace while the released output lets a '{' start a new tag, so
 * "{x {0}" renders its argument. The fixed path matches Java on both.
 */
/*eslint complexity: ["error", 20]*/
export const format = (pattern: string, args: any[], legacy = true) => {
  let buf = '';
  let i = 0;
  let index = -1;
  const limit = args.length;
  const length = pattern.length;
  while (i < length) {
    const ch = pattern[i];

    // Special case where to ignore bad tags.
    if (index === -2 && ch === '}') {
      // done ignoring, back outside a tag
      index = -1;
    } else if (index >= 0) {
      switch (ch) {
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          // support > 9 arguments
          if (index > 0) {
            index *= 10;
          }
          index += ch.charCodeAt(0) - BASE;
          break;

        case '}':
          if (index < limit) {
            buf += args[index];
          }
          index = -1;
          break;

        default:
          // not a digit or a close brace, so the tag is bad: ignore to
          // the closing brace
          index = -2;
          break;
      }
    } else if (ch === '{') {
      if (legacy) {
        // Legacy, a '{' starts a new tag even while a bad tag is being
        // ignored.
        index = 0;
      } else if (index === -1 && i + 1 < length && pattern[i + 1] === '{') {
        // Fixed, outside a tag "{{" is a literal "{".
        buf += '{';
        i++;
      } else if (index === -1) {
        // start of a substitution tag
        index = 0;
      }
      // Fixed inside a bad tag: stay in ignore, the '{' is swallowed.
    } else if (!legacy && ch === '}' && i + 1 < length && pattern[i + 1] === '}') {
      // Fixed, outside a tag "}}" is a literal "}".
      buf += '}';
      i++;
    } else if (index !== -2) {
      buf += ch;
    }

    i++;
  }
  return buf;
};
