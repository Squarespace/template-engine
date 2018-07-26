
import {
  ALTERNATES_WITH,
  BINDVAR,
  END,
  EOF,
  IF,
  INJECT,
  MACRO,
  META_LEFT,
  META_RIGHT,
  NEWLINE,
  NOOP,
  REPEATED,
  SECTION,
  SPACE,
  TAB,
  OR_PREDICATE,
} from './opcodes';

import * as patterns from './patterns';
import { splitVariable } from './util';


// Table for fast mapping of instructions to their opcodes.
const INSTRUCTIONS = {
  'a': ['lternates with', ALTERNATES_WITH],
  'e': ['nd', END, 'of', EOF],
  'i': ['f', IF, 'nject', INJECT],
  'm': ['acro', MACRO, 'eta-left', META_LEFT, 'eta-right', META_RIGHT],
  'n': ['ewline', NEWLINE],
  'o': ['r', OR_PREDICATE],
  'r': ['epeated section', REPEATED],
  's': ['ection', SECTION, 'pace', SPACE],
  't': ['ab', TAB],
  'v': ['ar', BINDVAR]
};


/**
 * Compile a regular expression with the sticky 'y' flag, which only
 * matches from the position indicated by RegExp.lastIndex.
 */
const compileSticky = s => new RegExp(s, 'y');


/**
 * Helper for low-level pattern matching over a range of characters.
 */
class Matcher {

  constructor(str, compile = compileSticky) {
    this.str = str;
    this.start = 0;
    this.end = 0;
    this.matchEnd = 0;

    // Private copies of patterns, since we set RegExp.lastIndex to match
    // at string offsets.
    this.filePath = compile(patterns.filePath);
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
   * Set the range to match over.
   */
  set(start, end) {
    this.start = start;
    this.end = end;
  }

  /**
   * Consume / skip over the last match.
   */
  consume() {
    this.start = this.matchEnd;
  }

  /**
   * Return true if entire input has been matched.
   */
  complete() {
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
  matchInstruction() {
    let start = this.start;
    const str = this.str;
    const m = INSTRUCTIONS[str[start++]];
    if (typeof m !== 'undefined') {
      const len = m.length;
      for (let i = 0; i < len; i += 2) {
        const val = m[i];
        if (str.startsWith(val, start)) {
          this.matchEnd = start + val.length;
          return m[i + 1];
        }
      }
    }
    return NOOP;
  }

  /**
   * Match arguments to a predicate.
   */
  matchArguments() {
    const rawArgs = this.match(this.instructionArgs, this.start);
    if (rawArgs !== null) {
      // Parse and append formatter with arguments.
      const delim = rawArgs[0];
      return rawArgs.slice(1).split(delim);
    }
    return null;
  }

  /**
   * Match a variable definition.
   */
  matchDefinition() {
    return this.match(this.variableDefinition, this.start);
  }

  /**
   * Match a path for an INJECT or MACRO instruction.
   */
  matchFilePath() {
    return this.match(this.filePath, this.start);
  }

  /**
   * Match an IF expression, variables separated by && and ||.
   */
  matchIfExpression() {
    const variables = [];
    const operators = [];
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
  matchPredicate() {
    return this.match(this.predicate, this.start);
  }

  /**
   * Match a chain of pipe-separated formatters and optional arguments.
   */
  matchFormatters() {
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
    let result = null;
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
      const rawArgs = this.match(this.instructionArgs, start);
      if (rawArgs !== null) {
        // Parse and append formatter with arguments.
        const delim = rawArgs[0];
        const args = rawArgs.slice(1).split(delim);
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
  matchVariable() {
    const raw = this.match(this.variableReference, this.start);
    return raw === null ? null : splitVariable(raw);
  }

  /**
   * Match a list of variable references.
   */
  matchVariables() {
    let start = this.start;
    let result = null;
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
  matchSpace() {
    if (this.str[this.start] === ' ') {
      this.matchEnd = this.start + 1;
      return true;
    }
    return false;
  }

  /**
   * Match one or more whitespace characters.
   */
  matchWhitespace() {
    return this.test(this.whitespace, this.start);
  }

  /**
   * Attempt to match a pattern. If the pattern matches, set the matchEnd
   * pointer and return the matched string. Otherwise return null.
   */
  match(pattern, start) {
    pattern.lastIndex = start;
    const raw = pattern.exec(this.str);
    if (raw !== null) {
      this.matchEnd = pattern.lastIndex;
      return raw[0];
    }
    return null;
  }

  test(pattern, start) {
    pattern.lastIndex = start;
    if (pattern.test(this.str)) {
      this.matchEnd = pattern.lastIndex;
      return true;
    }
    return false;
  }
}

export default Matcher;
