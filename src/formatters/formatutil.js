
const BASE = '0'.charCodeAt(0);

/*eslint complexity: ["error", 30]*/
const format = (pattern, args) => {
  let buf = '';
  let i = 0;
  let index = -1;
  const limit = args.length;
  const length = pattern.length;
  while (i < length) {
    const ch = pattern[i];

    // Special case where to ignore bad tags.
    if (index === -2 && ch === '}') {
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
        // Ignore to end of tag.
        index = -2;
        break;
      }

    } else if (ch === '{') {
      index = 0;

    } else if (index !== -2) {
      buf += ch;
    }

    i++;
  }
  return buf;
};

export {
  format
};