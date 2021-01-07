export type RegExpCompiler = (s: string) => RegExp;

/* Check if the current JS runtime supports sticky RegExp flag. */
export const hasStickyRegexp = (() => {
  try {
    const r = new RegExp('.', 'y');
    return r && true;
  } catch (e) {
    /* istanbul ignore next */
    return false;
  }
})();

/**
 * Generic constructor for mixins.
 */
type Constructor<T = {}> = new (...args: any[]) => T;

/**
 * Interface ensures relevant properties / methods are visible to matcher mixins.
 */
export interface MatcherProps {
  str: string;
  matchEnd: number;
  start: number;
  end: number;
  compile(str: string): RegExp;
}

/**
 * Matcher code that uses substring / global RegExp flag.
 */
export const GlobalMatcherMixin = <T extends Constructor<MatcherProps>>(
  Base: T
) =>
  class GlobalMatcherMixin extends Base {
    constructor(...args: any[]) {
      super(...args);
    }
    /**
     * Compile a regular expression using the global flag.
     */
    compile(s: string): RegExp {
      return new RegExp('^' + s, 'g');
    }
    /**
     * Attempt to match a pattern. If the pattern matches, set the matchEnd
     * pointer and return the matched string. Otherwise return null.
     */
    match(pattern: RegExp, i: number): string | null {
      if (this.test(pattern, i)) {
        this.matchEnd = i + pattern.lastIndex;
        return this.str.substring(i, this.matchEnd);
      }
      return null;
    }
    /**
     * Test the pattern at the given index and return true if it matched.
     */
    test(pattern: RegExp, start: number): boolean {
      const tmp = this.str.substring(start, this.end);
      pattern.lastIndex = 0;
      if (pattern.test(tmp)) {
        this.matchEnd = start + pattern.lastIndex;
        return true;
      }
      return false;
    }
  };

/**
 * Matcher code that uses sticky RegExp flag.
 */
export const StickyMatcherMixin = <T extends Constructor<MatcherProps>>(
  Base: T
) =>
  class StickyMatcherMixin extends Base {
    constructor(...args: any[]) {
      super(...args);
    }
    /**
     * Compile a regular expression using the sticky flag.
     */
    compile(s: string): RegExp {
      return new RegExp(s, 'y');
    }
    /**
     * Attempt to match a pattern. If the pattern matches, set the matchEnd
     * pointer and return the matched string. Otherwise return null.
     */
    match(pattern: RegExp, i: number): string | null {
      pattern.lastIndex = i;
      const raw = pattern.exec(this.str);
      if (raw !== null) {
        this.matchEnd = pattern.lastIndex;
        return raw[0];
      }
      return null;
    }
    /**
     * Test the pattern at the given index and return true if it matched.
     */
    test(pattern: RegExp, i: number): boolean {
      pattern.lastIndex = i;
      if (pattern.test(this.str)) {
        this.matchEnd = pattern.lastIndex;
        return true;
      }
      return false;
    }
  };
