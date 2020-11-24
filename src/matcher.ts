import { Opcode } from './opcodes';

import * as patterns from './patterns';
import { Arguments, FormatterCall, Operator } from './instructions';
import { splitVariable } from './util';
import {
  hasStickyRegexp,
  MatcherProps,
  GlobalMatcherMixin,
  StickyMatcherMixin,
} from './matchers';

// Table for fast mapping of instructions to their opcodes.
const INSTRUCTIONS: { [x: string]: (string | Opcode)[] } = {
  'a': ['lternates with', Opcode.ALTERNATES_WITH],
  'c': ['tx', Opcode.CTXVAR],
  'e': ['nd', Opcode.END, 'of', Opcode.EOF, 'val', Opcode.EVAL],
  'i': ['f', Opcode.IF, 'nject', Opcode.INJECT],
  'm': ['acro', Opcode.MACRO, 'eta-left', Opcode.META_LEFT, 'eta-right', Opcode.META_RIGHT],
  'n': ['ewline', Opcode.NEWLINE],
  'o': ['r', Opcode.OR_PREDICATE],
  'r': ['epeated section', Opcode.REPEATED],
  's': ['ection', Opcode.SECTION, 'pace', Opcode.SPACE],
  't': ['ab', Opcode.TAB],
  'v': ['ar', Opcode.BINDVAR]
};

export type RegExpCompiler = (s: string) => RegExp;

/**
 * Compile a regular expression with the sticky 'y' flag, which only
 * matches from the position indicated by RegExp.lastIndex.
 */
const compileSticky = (s: string) => new RegExp(s, 'y');

/**
 * Helper for low-level pattern matching over a range of characters.
 */
export class Matcher implements MatcherProps {
  start: number = 0;
  end: number = 0;
  matchEnd: number = 0;

  private filePath: RegExp;
  private formatterArgs: RegExp;
  private instructionArgs: RegExp;
  private operator: RegExp;
  private predicate: RegExp;
  private variableDefinition: RegExp;
  private variableReference: RegExp;
  private variableSeparator: RegExp;
  private whitespace: RegExp;
  private word: RegExp;

  constructor(public str: string, compile: RegExpCompiler = compileSticky) {
    // Private copies of patterns, since we set RegExp.lastIndex to match
    // at string offsets.
    this.filePath = compile(patterns.filePath);
    this.formatterArgs = compile(patterns.formatterArgs);
    this.instructionArgs = compile(patterns.instructionArgs);
    this.operator = compile(patterns.operator);
    this.predicate = compile(patterns.predicate);
    this.variableDefinition = compile(patterns.variableDefinition);
    this.variableReference = compile(patterns.variableReference);
    this.variableSeparator = compile(patterns.variableSeparator);
    this.whitespace = compile(patterns.whitespace);
    this.word = compile(patterns.word);
  }

  /**
   * Override by mixin.
   */
  compile(s: string): RegExp {
    return (null as unknown) as RegExp;
  }
  /**
   * Overridden by mixin.
   */
  match(pattern: RegExp, start: number): string | null {
    return null;
  }
  /**
   * Overridden by mixin.
   */
  test(pattern: RegExp, start: number): boolean {
    return false;
  }

  init(str: string): void {
    this.str = str;
  }

  /**
   * Position of the match pointer.
   */
  pos(): number {
    return this.start;
  }

  /**
   * Set the range to match over.
   */
  set(start: number, end: number): void {
    this.start = start;
    this.end = end;
  }

  /**
   * Seek forward until we find the matched character.
   */
  seekTo(ch: string): string | null {
    let i = this.start;
    let j = this.end;
    while (i <= j) {
      if (this.str[i] === ch) {
        this.end = i;
        return this.str.substr(this.start, i - this.start);
      }
      i++;
    }
    return null;
  }

  /**
   * Consume / skip over the last match.
   */
  consume(): void {
    this.start = this.matchEnd;
  }

  /**
   * Return true if entire input has been matched.
   */
  complete(): boolean {
    return this.start === this.end;
  }

  /**
   * This instruction matching scheme lets us do a few things simultaneously
   * with speed versus a regular expression:
   *
   *  1. check if a sequence of characters at a certain offset is an instruction
   *  2. identify the end position of the instruction
   *  3. mapping the instruction characters to its opcode, e.g. '.end' -> END
   *
   * A regular expression can do 1 and 2 using lastIndex, but for 3 it must copy
   * the substring and do a further lookup to get the opcode.
   *
   * A hand-written switch() is even faster than this method, but far less
   * maintainable. Code generation could help with maintainability, but the
   * performance improvement is not enough to be worth it right now.
   */
  matchInstruction(): Opcode {
    let start = this.start;
    const str = this.str;
    const m = INSTRUCTIONS[str[start++]];
    if (typeof m !== 'undefined') {
      const len = m.length;
      for (let i = 0; i < len; i += 2) {
        const val = m[i] as string;
        if (str.startsWith(val, start)) {
          this.matchEnd = start + val.length;
          return m[i + 1] as Opcode;
        }
      }
    }
    return Opcode.NOOP;
  }

  /**
   * Match arguments to a predicate.
   */
  matchArguments(): Arguments | null {
    const rawArgs = this.match(this.instructionArgs, this.start);
    if (rawArgs !== null) {
      // Parse and append formatter with arguments.
      const delim = rawArgs[0];
      return [rawArgs.slice(1).split(delim), delim];
    }
    return null;
  }

  /**
   * Match one or more variable bindings.
   */
  matchBindings(): any {
    const bindings = [];
    let start = this.start;
    for (;;) {
      const key = this.match(this.word, start);
      if (key === null) {
        break;
      }
      start = this.matchEnd;
      if (this.str[start++] !== '=') {
        break;
      }
      const ref = this.match(this.variableReference, start);
      if (ref === null) {
        break;
      }

      bindings.push([key, splitVariable(ref)]);
      start = this.matchEnd;
      this.test(this.whitespace, start);
      start = this.matchEnd;
    }
    return bindings.length ? bindings : null;
  }

  /**
   * Match a variable definition.
   */
  matchDefinition(): string | null {
    return this.match(this.variableDefinition, this.start);
  }

  /**
   * Match a path for an INJECT or MACRO instruction.
   */
  matchFilePath(): string | null {
    return this.match(this.filePath, this.start);
  }

  /**
   * Match an IF expression, variables separated by && and ||.
   */
  matchIfExpression(): [Operator[], (string | number)[][]] | null {
    const variables: (string | number)[][] = [];
    const operators: Operator[] = [];
    let haveOp = false;
    let start = this.start;
    for (;;) {
      const variable = this.match(this.variableReference, start);
      if (variable === null) {
        if (haveOp) {
          return null;
        }
        break;
      }

      variables.push(splitVariable(variable));

      // Skip any optional whitespace.
      start = this.matchEnd;

      this.test(this.whitespace, start);
      start = this.matchEnd;

      const op = this.match(this.operator, start);
      if (op === null) {
        break;
      }

      operators.push(op === '&&' ? 1 : 0);
      haveOp = true;

      // Skip any optional whitespace.
      start = this.matchEnd;
      this.test(this.whitespace, start);
      start = this.matchEnd;
    }
    return [operators, variables];
  }

  /**
   * Match a predicate.
   */
  matchPredicate(): string | null {
    return this.match(this.predicate, this.start);
  }

  /**
   * Match a chain of pipe-separated formatters and optional arguments.
   */
  matchFormatters(): FormatterCall[] | null {
    let start = this.start;
    if (this.str[start++] !== '|') {
      return null;
    }

    // Bail if we see a 2nd pipe. This is a sniff for inline minified
    // JavaScript which can create false positives. For example: {a||b?1:0};
    if (this.str[start] === '|') {
      return null;
    }

    let haveSep = false;
    let result: FormatterCall[] | null = null;
    for (;;) {
      const formatter = this.match(this.word, start);
      if (formatter === null) {
        // Fail if we matched a pipe but did not find another formatter.
        if (haveSep) {
          return null;
        }
        break;
      }

      // Initialize the list on demand.
      if (result === null) {
        result = [];
      }

      // Check if this formatter has arguments.
      start = this.matchEnd;
      const rawArgs = this.match(this.formatterArgs, start);
      if (rawArgs !== null) {
        // Parse and append formatter with arguments.
        const delim = rawArgs[0];
        const args: Arguments = [rawArgs.slice(1).split(delim), delim];
        result.push([formatter, args]);
        start = this.matchEnd;
      } else {
        // Append formatter with no arguments.
        result.push([formatter]);
      }

      // Check if there are more formatters in the chain.
      if (this.str[start++] !== '|') {
        break;
      }
      haveSep = true;
    }
    return result;
  }

  /**
   * Match a single variable reference.
   */
  matchVariable(): (string | number)[] | null {
    const raw = this.match(this.variableReference, this.start);
    return raw === null ? null : splitVariable(raw);
  }

  /**
   * Match a list of variable references.
   */
  matchVariables(): (string | number)[][] | null {
    let start = this.start;
    let result: (string | number)[][] | null = null;
    for (;;) {
      // Attempt to match a single variable reference.
      const raw = this.match(this.variableReference, start);
      if (raw === null) {
        // If we've seen a separator but failed to match another variable
        // reference, return an error.
        if (start !== this.start) {
          return null;
        }
        break;
      }

      // Initialize the list on demand.
      if (result === null) {
        result = [];
      }
      result.push(splitVariable(raw));

      // See if there are any remaining separators.
      start = this.matchEnd;
      if (!this.test(this.variableSeparator, start)) {
        break;
      }

      start = this.matchEnd;
    }

    return result;
  }

  /**
   * Match a single space.
   */
  matchSpace(): boolean {
    if (this.str[this.start] === ' ') {
      this.matchEnd = this.start + 1;
      return true;
    }
    return false;
  }

  /**
   * Match one or more whitespace characters.
   */
  matchWhitespace(): boolean {
    return this.test(this.whitespace, this.start);
  }
}

export class GlobalMatcher extends GlobalMatcherMixin(Matcher) {}
export class StickyMatcher extends StickyMatcherMixin(Matcher) {}

export const MatcherImpl = hasStickyRegexp ? StickyMatcher : GlobalMatcher;
