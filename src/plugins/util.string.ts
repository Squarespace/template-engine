import { replaceMappedChars } from '../util';

/**
 * Capitalize first letter of a string and lowercase the rest.
 */
export const capitalizeFirst = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

/**
 * Strip text between '<' and '>' from string.
 */
export const removeTags = (str: string) => {
  let res = '';
  let intag = false;
  const len = str.length;
  for (let i = 0; i < len; i++) {
    const ch = str[i];
    switch (ch) {
      case '<':
        intag = true;
        break;
      case '>':
        intag = false;
        res += ' ';
        break;
      default:
        if (!intag) {
          res += ch;
        }
    }
  }
  return res;
};

const HTML_ATTRIBUTE_CHARS = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

// Fixed, the single quote is escaped for single-quoted attribute values.
const HTML_ATTRIBUTE_CHARS_QUOTE = {
  ...HTML_ATTRIBUTE_CHARS,
  "'": '&#39;',
};

/**
 * Escape a string for an HTML attribute context. The default matches the
 * release: the single quote passes through raw. Pass false to escape it
 * as &#39;, for callers whose output lands in single-quoted attributes.
 * Only the htmlattr and htmltag formatters pick the flag from the compat
 * level; every other caller keeps the released form at all levels.
 */
export const escapeHtmlAttributes = (str: string, legacySingleQuote = true) => {
  return replaceMappedChars(str, legacySingleQuote ? HTML_ATTRIBUTE_CHARS : HTML_ATTRIBUTE_CHARS_QUOTE);
};

const SLUG_KILLCHARS = /[^a-zA-Z0-9\s-]+/g;
const WHITESPACE_RE = /\s+/g;

export const slugify = (str: string) => {
  str = str.replace(SLUG_KILLCHARS, '');
  str = str.replace(WHITESPACE_RE, '-');
  return str.toLowerCase();
};

const SCRIPT_TAG = /<\//g;

export const escapeScriptTags = (str: string) => {
  return str.replace(SCRIPT_TAG, '<\\/');
};

const ELLIPSIS = '...';

export const truncate = (str: string, maxLen: number, ellipsis: string = ELLIPSIS) => {
  if (str.length <= maxLen) {
    return str;
  }

  let end = maxLen;
  for (let i = maxLen - 1; i >= 0; i--) {
    const ch = str[i];
    if (ch === ' ' || ch === '\n' || ch === '\t' || ch === '\u000b' || ch === '\r' || ch === '\f') {
      end = i + 1;
      break;
    }
  }
  return str.substring(0, end) + ellipsis;
};

export const defaultIfEmpty = (str: string, fallback: string) => (str === null || !str ? fallback : str);
