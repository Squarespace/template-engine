import Matcher from './matcher';

const compile = s => new RegExp('^' + s, 'g');

/**
 * Version of Matcher for browsers lacking the RegExp sticky flag,
 * e.g. Safari 9. We convert the patterns to anchor to the start and
 * set the global flag, and make extensive use of substring. This will
 * reduce parsing performance but implement the spirit of sticky
 * regexps.
 */
class SlowMatcher extends Matcher {

  constructor(str) {
    super(str, compile);
  }

  match(pattern, start) {
    if (this.test(pattern, start)) {
      this.matchEnd = start + pattern.lastIndex;
      return this.str.substring(start, this.matchEnd);
    }
    return null;
  }

  test(pattern, start) {
    const tmp = this.str.substring(start, this.end);
    pattern.lastIndex = 0;
    if (pattern.test(tmp)) {
      this.matchEnd = start + pattern.lastIndex;
      return true;
    }
    return false;
  }
}

export default SlowMatcher;
