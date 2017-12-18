import { replaceMappedChars } from '../util';


/**
 * Strip text between '<' and '>' from string.
 */
export const removeTags = str => {
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
  '"': '&quot;'
};

export const escapeHtmlAttributes = str => {
  return replaceMappedChars(str, HTML_ATTRIBUTE_CHARS);
};

const SLUG_KILLCHARS = /[^a-zA-Z0-9\s-]+/g;
const WHITESPACE_RE = /\s+/g;

export const slugify = str => {
  str = str.replace(SLUG_KILLCHARS, '');
  str = str.replace(WHITESPACE_RE, '-');
  return str.toLowerCase();
};
