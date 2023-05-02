import { Context } from './context';
import { Node } from './node';
import { Variable } from './variable';
import { splitVariable } from './util';
import { Type } from './types';
import { MatcherProps, hasStickyRegexp, StickyMatcherMixin, GlobalMatcherMixin } from './matchers';
import { variableReference } from './patterns';
import { expressionReduce } from './errors';

/**
 *  Expression evaluation using an extended version of Dijkstra's "shunting
 *  yard" algorithm with JavaScript semantics. This algorithm was chosen as
 *  it is simple, sufficient, and can be implemented compactly, minimizing
 *  the size of the code and making it easier to verify correct.
 *
 *  Features:
 *
 *   - Number, Boolean, Null, and String types
 *   - String parsing of backslash char, hex, and unicode escapes
 *     - unicode escapes can contain up to 6 hex characters with a
 *       value of <= 0x10FFFF
 *     - "\n", "\x20", "\u2018", "\u01f600" are all valid strings
 *   - Decimal and hex numbers
 *   - Assignment statements
 *   - Variable references
 *   - Operator precedence
 *   - Common math, binary and logical operators
 *   - Both strict and non-strict equality
 *   - Nesting of sub-expressions with parenthesis
 *   - Single pass evaluation of multiple semicolon-delimited expressions
 *   - String equality and concatenation
 *   - Function calls with a variable number of arguments
 *     - example: max(1, 2, 3, ..., N) is accepted
 *   - Type conversion functions
 *   - Common constants (pi, e, etc)
 *   - Configurable parse and reduce limits
 *     - maximum tokens an expression can contain
 *     - maximum length of a concatenated string
 *
 *  The algorithm assumes the expression is well-formed and performs minimal
 *  validation.  A malformed expression should either terminate evaluation
 *  early or produce no value.
 */

/**
 * Matches patterns as part of the expression tokenizer. This reuses the same matcher
 * mixin as the main syntax parser.
 */
class ExprMatcher implements MatcherProps {
  matchEnd: number = 0;
  start: number = 0;
  end: number;

  private variableReference: RegExp;

  constructor(public str: string) {
    this.end = str.length;
    this.variableReference = this.compile(variableReference);
  }

  init(str: string) {
    this.str = str;
  }

  /**
   * Set the range to match over.
   */
  set(start: number, end: number): void {
    this.start = start;
    this.end = end;
  }

  /**
   * Match a single variable reference.
   */
  matchVariable(): (string | number)[] | null {
    const raw = this.match(this.variableReference, this.start);
    return raw === null ? null : splitVariable(raw);
  }

  // We use a mixin to plug in one of two regexp matcher implementations for the
  // methods below, one that is IE 9 compatible that uses substring/global flag,
  // and the other that uses the more sticky flag.

  /**
   * Overridden in mixin.
   */
  /* istanbul ignore next */
  compile(s: string): RegExp {
    return null as unknown as RegExp;
  }
  /**
   * Overridden in mixin.
   */
  /* istanbul ignore next */
  match(pattern: RegExp, i: number): string | null {
    return null;
  }
  /**
   * Overridden in mixin.
   */
  /* istanbul ignore next */
  test(pattern: RegExp, i: number): boolean {
    return false;
  }
}

/**
 * Flags for parsing decimal numbers.
 */
const enum NF {
  DOT = 1, // decimal point, can only occur once
  E = 2, // exponent, can only occur once
  EDIG = 4, // digit immediately after E
  ESGN = 8, // sign immediately after E
}

export class StickyExprMatcher extends StickyMatcherMixin(ExprMatcher) {}
export class GlobalExprMatcher extends GlobalMatcherMixin(ExprMatcher) {}

/* istanbul ignore next */
export const ExprMatcherImpl = hasStickyRegexp ? StickyExprMatcher : GlobalExprMatcher;

const E_INVALID_HEX = `Invalid 2-char hex escape found`;
const E_INVALID_UNICODE = `Invalid unicode escape found`;
// const E_INVALID_HEX_NUM = 'Invalid hex number sequence';
// const E_INVALID_DEC_NUM = 'Invalid decimal number sequence';
const E_MISMATCHED_OP = `Mismatched operator found:`;
const E_UNEXPECTED_OPERATOR = `Unexpected operator found during evaluation:`;

// Operator associativity
export const enum Assoc {
  LEFT,
  RIGHT,
}

// Operator definition
export interface Operator {
  type: OperatorType;
  prec: number;
  assoc: Assoc;
  desc: string;
}

// Token types
export const enum ExprTokenType {
  OPERATOR,
  NULL,
  NUMBER,
  BOOLEAN,
  STRING,
  CALL,
  ARGS,
  VARIABLE,
}

// Function argument marker token
export interface ArgsToken {
  type: ExprTokenType.ARGS;
}

export interface NullToken {
  type: ExprTokenType.NULL;
  value: null;
}

export interface NumberToken {
  type: ExprTokenType.NUMBER;
  value: number;
}

export interface BooleanToken {
  type: ExprTokenType.BOOLEAN;
  value: boolean;
}

export interface StringToken {
  type: ExprTokenType.STRING;
  value: string;
}

export interface CallToken {
  type: ExprTokenType.CALL;
  value: string;
}

export interface VarToken {
  type: ExprTokenType.VARIABLE;
  value: (string | number)[];
}

export interface OperatorToken {
  type: ExprTokenType.OPERATOR;
  value: Operator;
}

export type LiteralToken = NullToken | NumberToken | BooleanToken | StringToken;

export type Token = NullToken | NumberToken | BooleanToken | StringToken | CallToken | VarToken | OperatorToken | ArgsToken;

const ch = (s: string, i: number) => (i < s.length ? s[i] : '');

const enum OperatorType {
  PLUS,
  MINUS,
  LNOT,
  BNOT,
  POW,
  MUL,
  DIV,
  MOD,
  ADD,
  SUB,
  SHL,
  SHR,
  LT,
  GT,
  EQ,
  NEQ,
  SEQ,
  SNEQ,
  LTEQ,
  GTEQ,
  BAND,
  BXOR,
  BOR,
  LAND,
  LOR,
  ASN,
  SEMI,
  COMMA,
  LPRN,
  RPRN,
}

type FunctionDef = (...args: LiteralToken[]) => LiteralToken | undefined;

/**
 * Operator precedence rules equivalent to JavaScript:
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence
 */
const OPERATORS: { [typ: number]: Operator } = {};

/**
 * Register an operator and construct and return its token.
 */
const _op = (type: OperatorType, prec: number, assoc: Assoc, desc: string): OperatorToken => {
  const o: Operator = { type, prec, assoc, desc };
  OPERATORS[type] = o;
  return { type: ExprTokenType.OPERATOR, value: o };
};

// Note: operators are exported for testing purposes.

/*
 * Operator definitions.
 */

// unary
export const PLUS = _op(OperatorType.PLUS, 17, Assoc.RIGHT, 'unary plus');
export const MINUS = _op(OperatorType.MINUS, 17, Assoc.RIGHT, 'unary minus');

// logical not
export const LNOT = _op(OperatorType.LNOT, 17, Assoc.RIGHT, 'logical not');

// bitwise not
export const BNOT = _op(OperatorType.BNOT, 17, Assoc.RIGHT, 'bitwise not');

// math
export const POW = _op(OperatorType.POW, 16, Assoc.RIGHT, 'exponent');
export const MUL = _op(OperatorType.MUL, 15, Assoc.LEFT, 'multiply');
export const DIV = _op(OperatorType.DIV, 15, Assoc.LEFT, 'divide');
export const MOD = _op(OperatorType.MOD, 15, Assoc.LEFT, 'modulus');
export const ADD = _op(OperatorType.ADD, 14, Assoc.LEFT, 'add');
export const SUB = _op(OperatorType.SUB, 14, Assoc.LEFT, 'subtract');

// arithmetic shift
export const SHL = _op(OperatorType.SHL, 13, Assoc.LEFT, 'left shift');
export const SHR = _op(OperatorType.SHR, 13, Assoc.LEFT, 'right shift');
// TODO: support unsigned right shift ">>>"?

// compare
export const LT = _op(OperatorType.LT, 12, Assoc.LEFT, 'less than');
export const GT = _op(OperatorType.GT, 12, Assoc.LEFT, 'greater than');
export const LTEQ = _op(OperatorType.LTEQ, 12, Assoc.LEFT, 'less than or equal');
export const GTEQ = _op(OperatorType.GTEQ, 12, Assoc.LEFT, 'greater than or equal');

// equality, strict and loose
export const EQ = _op(OperatorType.EQ, 11, Assoc.LEFT, 'equality');
export const NEQ = _op(OperatorType.NEQ, 11, Assoc.LEFT, 'inequality');
export const SEQ = _op(OperatorType.SEQ, 11, Assoc.LEFT, 'strict equality');
export const SNEQ = _op(OperatorType.SNEQ, 11, Assoc.LEFT, 'strict inequality');

// bitwise operators
export const BAND = _op(OperatorType.BAND, 10, Assoc.LEFT, 'bitwise and');
export const BXOR = _op(OperatorType.BXOR, 9, Assoc.LEFT, 'bitwise xor');
export const BOR = _op(OperatorType.BOR, 8, Assoc.LEFT, 'bitwise or');

// logical operators
export const LAND = _op(OperatorType.LAND, 7, Assoc.LEFT, 'logical and');
export const LOR = _op(OperatorType.LOR, 6, Assoc.LEFT, 'logical or');

// assignment
export const ASN = _op(OperatorType.ASN, 3, Assoc.RIGHT, 'assign');

// fake operators
export const SEMI = _op(OperatorType.SEMI, 1, Assoc.LEFT, 'semicolon');
export const COMMA = _op(OperatorType.COMMA, 1, Assoc.RIGHT, 'comma');
export const LPRN = _op(OperatorType.LPRN, 1, Assoc.LEFT, 'left paren');
export const RPRN = _op(OperatorType.RPRN, 1, Assoc.LEFT, 'right paren');

/**
 * Stack.
 */
class Stack<T extends Token> {
  // We accept the value undefined as there are times when we want to push
  // undefined onto the stack to indicate the expression has terminated
  // without producing a value, possibly early due to reaching an assignment
  // statement.
  private _elems: (T | undefined)[] = [];

  get length() {
    return this._elems.length;
  }
  get top(): T | undefined {
    return this.length ? this._elems[this.length - 1]! : undefined;
  }
  set top(t: T | undefined) {
    if (this.length) {
      this._elems[this.length - 1] = t;
    }
  }
  get elems(): (T | undefined)[] {
    return this._elems;
  }
  push(t: T) {
    this._elems.push(t);
  }
  pop(): T | undefined {
    return this._elems.pop();
  }
}

const CHARS: any = {
  '\b': 'backspace',
  '\f': 'form feed',
  '\n': 'line feed',
  '\r': 'carriage return',
  '\t': 'tab',
};

const charName = (c: string): string => {
  const r = CHARS[c];
  return r ? r : c <= '\u001f' ? 'control character' : 'character';
};

const char = String.fromCharCode;

/**
 * Convert token to number.
 */
const asnum = (t: Token): number => {
  switch (t.type) {
    case ExprTokenType.NUMBER:
      return t.value;
    case ExprTokenType.STRING:
      // Handles parsing a complete hex or decimal number. Returns
      // NaN when any part of the input fails.
      if (!t.value) {
        return 0;
      }
      const len = t.value.length;
      let j: number;

      let i = 0;
      const c = t.value[i];

      // Check for a single sign character. We skip over it and let the
      // parse handle it.
      if (c === '-' || c === '+') {
        i++;
      }

      if (i === len) {
        return NaN;
      }

      switch (t.value[i]) {
        case '0':
          // check for a hexadecimal sequence
          const c = ch(t.value, i + 1);
          if (c === 'x' || c === 'X') {
            // test for a valid hex sequence and find the bound, then
            // call parseInt to parse the full number including the sign
            j = hex(t.value, i + 2, len);
            return j === len ? parseInt(t.value, 16) : NaN;
          }

        // fall through

        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          // find bound of decimal number
          j = decimal(t.value, i, len);
          break;
        default:
          return NaN;
      }
      // If the entire string is a valid decimal number, parse it, including the
      // sign. Otherwise return a NaN.
      return j === len ? parseFloat(t.value) : NaN;
    case ExprTokenType.BOOLEAN:
      return t.value ? 1 : 0;
    case ExprTokenType.NULL:
      return 0;

    // objects and arrays will fall through and return NaN

    /* istanbul ignore next */
    default:
      return NaN;
  }
};

/**
 * Convert token to boolean.
 */
const asbool = (t: Token): boolean => {
  switch (t.type) {
    case ExprTokenType.BOOLEAN:
      return t.value;
    case ExprTokenType.NUMBER:
    case ExprTokenType.STRING:
      return !!t.value;
    default:
      return false;
  }
};

/**
 * Convert token to string.
 */
const asstr = (t: Token): string => {
  switch (t.type) {
    case ExprTokenType.BOOLEAN:
      return t.value ? 'true' : 'false';
    case ExprTokenType.NUMBER:
      return String(t.value);
    case ExprTokenType.STRING:
      return t.value;
    case ExprTokenType.NULL:
      return 'null';

    // objects and arrays will fall through

    /* istanbul ignore next */
    default:
      return '';
  }
};

/**
 * Ensure a token is a literal. Resolves variable references against the
 * provided context and casts result to a token.
 */
const asliteral = (ctx: Context, t: Token | undefined): LiteralToken | undefined => {
  if (t) {
    switch (t.type) {
      // Resolve a variable against the stack and convert the result to a token
      case ExprTokenType.VARIABLE: {
        const r = ctx.resolve(t.value);
        switch (r.type) {
          case Type.BOOLEAN:
            return bool(r.value);
          case Type.NUMBER:
            return num(r.value);
          case Type.STRING:
            return str(r.value);
          case Type.NULL:
          case Type.MISSING:
            return NULL;

          // Objects, arrays not currently supported. Fall through..
        }
        break;
      }

      // Literal values go straight through
      case ExprTokenType.BOOLEAN:
      case ExprTokenType.NUMBER:
      case ExprTokenType.STRING:
      case ExprTokenType.NULL:
        return t;
    }
  }
  return undefined;
};

/**
 * Build a number token.
 */
export const num = (value: number): NumberToken => ({
  type: ExprTokenType.NUMBER,
  value,
});

/**
 * Build a boolean token.
 */
export const bool = (value: boolean): BooleanToken => ({
  type: ExprTokenType.BOOLEAN,
  value,
});

/**
 * Build a string token.
 */
export const str = (value: string): StringToken => ({
  type: ExprTokenType.STRING,
  value,
});

// Constant tokens we may reference more than once
const MINUS_ONE: NumberToken = num(-1);
const PI: NumberToken = num(3.141592653589793);
const E: NumberToken = num(2.718281828459045);
const INFINITY: NumberToken = num(Infinity);
const NAN: NumberToken = num(NaN);
const TRUE: BooleanToken = bool(true);
const FALSE: BooleanToken = bool(false);
const NULL: NullToken = { type: ExprTokenType.NULL, value: null };
const ARGS: ArgsToken = { type: ExprTokenType.ARGS };

// Constant values
const CONSTANTS: { [name: string]: LiteralToken | undefined } = {
  null: NULL,
  true: TRUE,
  false: FALSE,
  PI: PI,
  E: E,
  Infinity: INFINITY,
  NaN: NAN,
};

/**
 * Convert all tokens to numbers.
 */
const allnum = (tk: Token[]): NumberToken[] => tk.map((t) => (t.type === ExprTokenType.NUMBER ? t : num(asnum(t))));

/**
 * Apply a predicate to pairs of elements and return the one that passes.
 */
const select = <T extends LiteralToken>(p: (a: T, b: T) => boolean, tk: T[]): T | undefined => {
  if (tk.length === 0) {
    return undefined;
  }
  let a = tk[0];
  for (let i = 1; i < tk.length; i++) {
    const b = tk[i];
    a = p(a, b) ? a : b;
  }
  return a;
};

/**
 * Built-in function table.
 */
const FUNCTIONS: { [name: string]: FunctionDef | undefined } = {
  /**
   * Maximum number.
   */
  max: (...tk: LiteralToken[]) => select((a, b) => a.value > b.value, allnum(tk)),
  /**
   * Minimum number.
   */
  min: (...tk: LiteralToken[]) => select((a, b) => a.value < b.value, allnum(tk)),
  /**
   * Absolute value of the first argument.
   */
  abs: (...tk: LiteralToken[]) => {
    return tk.length ? num(Math.abs(asnum(tk[0]))) : undefined;
  },
  /**
   * Convert first argument to a number.
   */
  num: (...tk: LiteralToken[]) => {
    return tk.length ? num(asnum(tk[0])) : undefined;
  },
  /**
   * Convert first argument to a string.
   */
  str: (...tk: LiteralToken[]) => {
    return tk.length ? str(asstr(tk[0])) : undefined;
  },
  /**
   * Convert first argument to a boolean.
   */
  bool: (...tk: LiteralToken[]) => {
    return tk.length ? bool(asbool(tk[0])) : undefined;
  },
};

/**
 * Multiplication (used in multiple places)
 */
const mul = (a: Token, b: Token): Token => num(asnum(a) * asnum(b));

const matcher = new ExprMatcherImpl('');

export const tokenDebug = (t: Token | undefined): string => {
  if (!t) {
    return 'undefined';
  }
  switch (t.type) {
    case ExprTokenType.BOOLEAN:
      return t.value ? 'true' : 'false';
    case ExprTokenType.NULL:
      return `null`;
    case ExprTokenType.NUMBER:
      return String(t.value);
    case ExprTokenType.STRING:
      return JSON.stringify(t.value);
    case ExprTokenType.OPERATOR:
      return `<${t.value.desc}>`;
    case ExprTokenType.VARIABLE:
      return `${t.value.join('.')}`;
    case ExprTokenType.CALL:
      return `${t.value}()`;
    case ExprTokenType.ARGS:
      return `<args>`;
    default:
      return '<unk>';
  }
};

/**
 * Options to configure the expression engine.
 */
export interface ExprOptions {
  /**
   * Maximum number of tokens an expression can contain. If an expression exceeds
   * this limit it raises an error.
   */
  maxTokens?: number;

  /**
   * Maximum length of a string that can be constructed through concatenation.
   * If string result of A + B exceeds the length it raises an error.
   */
  maxStringLen?: number;
}

/**
 * Parse and evaluate an expression.
 */
export class Expr {
  // Expressions ready to evaluate
  expr: Token[][] = [];

  // Errors that occur during tokenization or assembly. Evaluation errors will
  // be appended directly to the context's errors array.
  errors: string[] = [];

  // Temporary storage to build expressions
  tokens: Stack<Token> = new Stack();

  // reasonable limits to bound the computation
  maxTokens: number;
  maxStringLen: number;

  constructor(private raw: string, opts: ExprOptions = {}) {
    this.maxTokens = opts.maxTokens || 0;
    this.maxStringLen = opts.maxStringLen || 0;
    this.tokenize(raw, 0, raw.length);
  }

  /**
   * Reduce each of the expressions to its simplest form, then return the
   * final value of the last expression as output.
   */
  reduce(ctx: Context): Node | undefined {
    const len = this.expr.length;
    let r: Node | undefined = undefined;
    for (let i = 0; i < len; i++) {
      const expr = this.expr[i];
      r = this.reduceExpr(ctx, expr);
    }
    return r;
  }

  /**
   * Reduce an expression to its simplest form.
   */
  reduceExpr(ctx: Context, expr: Token[]): Node | undefined {
    const stack: Stack<Token> = new Stack();

    loop: for (const t of expr) {
      switch (t.type) {
        case ExprTokenType.BOOLEAN:
        case ExprTokenType.STRING:
        case ExprTokenType.NUMBER:
        case ExprTokenType.NULL:
        case ExprTokenType.VARIABLE:
        case ExprTokenType.ARGS:
          stack.push(t);
          continue;

        case ExprTokenType.CALL: {
          const args: LiteralToken[] = [];
          while (stack.top && stack.top.type !== ExprTokenType.ARGS) {
            const arg = asliteral(ctx, stack.pop());
            if (arg) {
              args.push(arg);
            }
          }
          // Pop the arg delimiter
          stack.pop();

          // Reverse the args and apply them.
          args.reverse();
          const fimpl = FUNCTIONS[t.value]!;
          const r = fimpl(...args);
          if (!r) {
            ctx.error(expressionReduce(this.raw, `Error calling function ${t.value}`));
            break loop;
          }
          stack.push(r);
          continue;
        }

        case ExprTokenType.OPERATOR: {
          // Unary operators directly manipulate top of stack to avoid a pop-then-push
          switch (t.value.type) {
            case OperatorType.MINUS: {
              const arg = asliteral(ctx, stack.top);
              stack.top = arg ? mul(MINUS_ONE, arg) : undefined;
              continue;
            }
            case OperatorType.PLUS: {
              // unary plus casts the argument to number but doesn't change sign
              const arg = asliteral(ctx, stack.top);
              stack.top = arg ? num(asnum(arg)) : undefined;
              continue;
            }
            case OperatorType.LNOT: {
              const arg = asliteral(ctx, stack.top);
              stack.top = arg ? bool(!asbool(arg)) : undefined;
              continue;
            }
            case OperatorType.BNOT: {
              const arg = asliteral(ctx, stack.top);
              stack.top = arg ? num(~asnum(stack.top!)) : undefined;
              continue;
            }
            case OperatorType.ASN: {
              const b = asliteral(ctx, stack.pop());
              const a = stack.pop();
              // Make sure the arguments to the assignment are valid
              if (a !== undefined && a.type === ExprTokenType.VARIABLE && b !== undefined) {
                const name = a.value;
                // Make sure the variable is a definition
                if (name.length === 1 && typeof name[0] === 'string' && name[0][0] === '@') {
                  // Set the variable in the context.
                  ctx.setVar(name[0], new Variable(name[0], new Node(b.value)));
                }
              }
              // When an assignment operator is encountered, we consider the expression
              // complete. This leaves no result.
              stack.top = undefined;
              break loop;
            }

            default:
            // fall through to handle all binary operators
          }

          // Binary operators, pop 2 args from stack and push result
          const b = asliteral(ctx, stack.pop());
          const a = asliteral(ctx, stack.pop());

          // Validate operator args are present and valid
          if (a === undefined || b === undefined) {
            // Invalid arguments to operator, bail out.
            ctx.error(expressionReduce(this.raw, `Invalid arguments to operator ${t.value.desc}`));
            break loop;
          }

          let r: Token;
          switch (t.value.type) {
            case OperatorType.MUL:
              r = mul(a, b);
              break;
            case OperatorType.DIV:
              r = num(asnum(a) / asnum(b));
              break;
            case OperatorType.ADD:
              // Numeric addition or string concatenation.
              if (a.type === ExprTokenType.STRING || b.type === ExprTokenType.STRING) {
                // Ensure a concatenated string won't exceed the configured limit, if any
                const _a = asstr(a);
                const _b = asstr(b);
                if (this.maxStringLen > 0 && _a.length + _b.length > this.maxStringLen) {
                  ctx.error(expressionReduce(this.raw, `Concatenation would exceed maximum string length ${this.maxStringLen}`));
                  break loop;
                }
                r = str(_a + _b);
              } else {
                r = num(asnum(a) + asnum(b));
              }
              break;
            case OperatorType.SUB:
              r = num(asnum(a) - asnum(b));
              break;
            case OperatorType.POW:
              r = num(Math.pow(asnum(a), asnum(b)));
              break;
            case OperatorType.MOD:
              r = num(asnum(a) % asnum(b));
              break;
            case OperatorType.SHL:
              r = num(asnum(a) << asnum(b));
              break;
            case OperatorType.SHR:
              r = num(asnum(a) >> asnum(b));
              break;
            case OperatorType.LT:
              r = bool(a.value! < b.value!);
              break;
            case OperatorType.LTEQ:
              r = bool(a.value! <= b.value!);
              break;
            case OperatorType.GT:
              r = bool(a.value! > b.value!);
              break;
            case OperatorType.GTEQ:
              r = bool(a.value! >= b.value!);
              break;
            case OperatorType.EQ:
              // intentional == below
              r = bool(a.value == b.value);
              break;
            case OperatorType.NEQ:
              // intentional != below
              r = bool(a.value != b.value);
              break;
            case OperatorType.SEQ:
              r = bool(a.value === b.value);
              break;
            case OperatorType.SNEQ:
              r = bool(a.value !== b.value);
              break;
            case OperatorType.BAND:
              r = num(asnum(a) & asnum(b));
              break;
            case OperatorType.BXOR:
              r = num(asnum(a) ^ asnum(b));
              break;
            case OperatorType.BOR:
              r = num(asnum(a) | asnum(b));
              break;
            case OperatorType.LAND:
              r = bool(asbool(a) && asbool(b));
              break;
            case OperatorType.LOR:
              r = bool(asbool(a) || asbool(b));
              break;
            default:
              this.errors.push(`${E_UNEXPECTED_OPERATOR} ${t.value.desc}`);
              stack.top = undefined;
              break loop;
          }
          stack.push(r!);
        }
      }
    }

    // Return a valid literal from the top of the stack, or undefined
    // if an unexpected token is present.
    const r = stack.top;
    if (r) {
      // Ensure the value is a literal
      const v = asliteral(ctx, r);
      if (v) {
        // We have a supported value
        return new Node(v.value);
      }

      // The token was an unexpected type, which is an error
      ctx.error(expressionReduce(this.raw, `Reduce error: unexpected token on stack`));
    }
    return undefined;
  }

  /**
   * Iterate over tokens and build expressions using the shunting yard algorithm.
   */
  build(): void {
    // If any tokenization errors occurred, refuse to assemble the expression. The
    // token array is likely incomplete and therefore the expression should be
    // considered invalid.
    if (this.errors.length) {
      return;
    }
    let out: Token[] = [];
    const ops: Stack<Token> = new Stack();

    const { elems } = this.tokens;
    const len = elems.length;
    for (let i = 0; i < len; i++) {
      const t = elems[i]!;
      switch (t.type) {
        case ExprTokenType.OPERATOR: {
          const { type } = t.value;

          switch (type) {
            case OperatorType.SEMI:
              // Semicolons separate multiple expressions. Push the expression
              // we've accumulated and reset the state.
              this.pushExpr(out, ops);
              out = [];
              break;

            case OperatorType.LPRN:
              // Opens a nested expression or function call
              ops.push(t);
              break;

            case OperatorType.COMMA: {
              // Argument separator outputs all non-operators until we hit
              // a left parenthesis
              let { top } = ops;
              while (top && (top.type !== ExprTokenType.OPERATOR || top.value.type !== OperatorType.LPRN)) {
                out.push(ops.pop()!);
                ({ top } = ops);
              }
              break;
            }

            case OperatorType.RPRN: {
              // Output all non-operator tokens until we hit the matching
              // left parenthesis.
              let { top } = ops;
              while (top && (top.type !== ExprTokenType.OPERATOR || top.value.type !== OperatorType.LPRN)) {
                out.push(ops.pop()!);
                ({ top } = ops);
              }
              // Ensure parenthesis are balanced.
              if (!top || top.value.type !== OperatorType.LPRN) {
                this.errors.push(`${E_MISMATCHED_OP} ${t.value.desc}`);
                return;
              }

              ops.pop();

              // If a function call token preceeded the left parenthesis, pop it to the output
              ({ top } = ops);
              if (top && top.type === ExprTokenType.CALL) {
                out.push(ops.pop()!);
              }
              break;
            }

            default: {
              // We have an operator. Before we can send it to the output
              // we need to pop all other operators with higher precedence,
              // or the same precedence with left associativity. We also stop
              // at non-operators and left parenthesis.
              let { top } = ops;
              while (
                top &&
                (top.type !== ExprTokenType.OPERATOR ||
                  (top.value.type !== OperatorType.LPRN &&
                    (top.value.prec > t.value.prec || (top.value.prec === t.value.prec && top.value.assoc === Assoc.LEFT))))
              ) {
                out.push(ops.pop()!);
                ({ top } = ops);
              }
              ops.push(t);
              break;
            }
          }
          break;
        }

        case ExprTokenType.CALL:
          // Delimit the end of the argument list for the function call
          out.push(ARGS);
          // Push the call onto the operator stack. Once all arguments have
          // been output we pop the call and output it.
          ops.push(t);
          break;

        default:
          out.push(t);
          break;
      }
    }
    this.pushExpr(out, ops);
  }

  /**
   * Push a token.
   */
  private push(t: Token): void {
    // If an error occurs, we stop accepting tokens.
    if (this.errors.length) {
      return;
    }
    if (t.type === ExprTokenType.OPERATOR) {
      const { type } = t.value;
      switch (type) {
        // convert unary plus / minus
        case OperatorType.SUB:
        case OperatorType.ADD: {
          const { top } = this.tokens;
          if (!top || (top.type === ExprTokenType.OPERATOR && top.value.type !== OperatorType.RPRN)) {
            t = type === OperatorType.SUB ? MINUS : PLUS;
          }
          break;
        }
        case OperatorType.LPRN: {
          const { top } = this.tokens;
          if (top && top.type === ExprTokenType.VARIABLE && top.value && top.value.length === 1) {
            // Check if name corresponds to a valid built-in function.
            const name = top.value[0];
            if (FUNCTIONS[name]) {
              this.tokens.top = {
                type: ExprTokenType.CALL,
                value: name,
              } as Token;
            } else {
              this.errors.push(`Invalid function ${name}`);
              return;
            }
          }
          break;
        }
      }
    }
    this.tokens.push(t);
    if (this.maxTokens > 0 && this.tokens.length > this.maxTokens) {
      this.errors.push(`Expression exceeds the maximum number of allowed tokens: ${this.maxTokens}`);
    }
  }

  /**
   * Push an expression.
   */
  private pushExpr(queue: Token[], ops: Stack<Token>): void {
    while (ops.length) {
      const t = ops.pop()!;
      // We detect unexpected operators here.
      if (t.type === ExprTokenType.OPERATOR) {
        switch (t.value.type) {
          case OperatorType.LPRN:
          case OperatorType.RPRN:
            this.errors.push(`${E_MISMATCHED_OP} ${t.value.desc}`);
            return;
        }
      }
      queue.push(t);
    }
    if (queue.length) {
      this.expr.push(queue);
    }
  }

  /**
   * Tokenize the string input.
   */
  private tokenize(str: string, i: number, len: number) {
    matcher.init(str);
    const op = (op: OperatorToken) => this.push(op);

    loop: while (i < len) {
      const c0 = str[i];
      const c1 = ch(str, i + 1);
      switch (c0) {
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9': {
          // check for a hexadecimal number prefix
          const hx = c0 === '0' && (c1 === 'x' || c1 === 'X');
          i = hx ? this.hex(str, i + 2, len) : this.decimal(str, i, len);
          if (i < 0) {
            // the hex / decimal parse methods emit errors, so no need to
            break loop;
          }
          continue;
        }

        case '"':
        case "'":
          i = this.string(str, i + 1, len, c0);
          if (i === -1) {
            break loop;
          }
          continue;

        case '*':
          op(c1 === '*' ? (i++, POW) : MUL);
          break;

        case '/':
          op(DIV);
          break;

        case '%':
          op(MOD);
          break;

        case '+':
          op(ADD);
          break;

        case '-':
          op(SUB);
          break;

        case '=': {
          if (c1 === '=') {
            i++;
            op(ch(str, i + 1) === '=' ? (i++, SEQ) : EQ);
          } else {
            op(ASN);
          }
          break;
        }

        case '!': {
          if (c1 === '=') {
            i++;
            op(ch(str, i + 1) === '=' ? (i++, SNEQ) : NEQ);
          } else {
            op(LNOT);
          }
          break;
        }

        case '<':
          op(c1 === '<' ? (i++, SHL) : c1 === '=' ? (i++, LTEQ) : LT);
          break;

        case '>':
          op(c1 === '>' ? (i++, SHR) : c1 === '=' ? (i++, GTEQ) : GT);
          break;

        case '~':
          op(BNOT);
          break;

        case '&':
          op(c1 === '&' ? (i++, LAND) : BAND);
          break;

        case '|':
          op(c1 === '|' ? (i++, LOR) : BOR);
          break;

        case '^':
          op(BXOR);
          break;

        case ' ':
        case '\n':
        case '\t':
        case '\r':
        case '\u00a0':
          break;

        case ',':
          op(COMMA);
          break;

        case ';':
          op(SEMI);
          break;

        case '(':
          op(LPRN);
          break;

        case ')':
          op(RPRN);
          break;

        default: {
          // Here we handle variable references, and named functions / constants.
          // We use the matchVariable to cover these cases and disambiguate them.
          // Function names are whitelisted and must be immediately followed by an
          // open parenthesis.

          matcher.set(i, len);
          const value = matcher.matchVariable();
          if (value) {
            i = matcher.matchEnd;

            if (value && value.length === 1 && typeof value[0] === 'string') {
              // Names for constants. These names can conflict with references to
              // context variables on the immediate node, e.g. { "PI": "apple" }.
              // To disambiguate, use references of the form "@.PI" or bind
              // local variables before calling the expression.
              const n = CONSTANTS[value[0]];
              if (n) {
                this.push(n);
                continue;
              }

              // Fall through and assume this is a variable reference. If followed
              // immediately by a left parenthesis it may be a function call, but
              // we determine that in the push() method.
            }
            this.push({ type: ExprTokenType.VARIABLE, value });
            continue;
          }

          // input character we can't handle
          this.errors.push(`Unexpected ${charName(c0)} at ${i}: ${JSON.stringify(c0)}`);
          i = -1;
          break;
        }
      }

      if (i === -1) {
        // Error occurred, bail out
        break;
      }
      i++;
    }
  }

  /**
   * Scan a decimal number and push a token, or an error message.
   * We use parseFloat() to convert the chars into the final decimal number.
   */
  decimal(str: string, i: number, len: number): number {
    const j = decimal(str, i, len);
    switch (j) {
      case -2:
        this.errors.push(`Expected a digit after exponent in decimal number`);
        break;
      case -3:
        this.errors.push(`Duplicate decimal point in number`);
        break;
      case -4:
        this.errors.push(`Unexpected decimal point in exponent`);
        break;
    }

    if (j < 0) {
      return -1;
    }
    // no need to consider radix as numbers will always be in decimal
    const text = str.substring(i, j);
    this.push(num(parseFloat(text)));
    return j;
  }

  /**
   * Parse a hexadecimal integer number.
   */
  hex(str: string, i: number, len: number): number {
    const j = hex(str, i, len);
    if (i === j) {
      this.errors.push(`Expected digits after start of hex number`);
      return -1;
    }
    const text = str.substring(i, j);
    this.push(num(parseInt(text, 16)));
    return j;
  }

  /**
   * Parse a string literal.
   */
  string(str: string, i: number, len: number, end: string): number {
    // Accumulate decoded characters
    let s = '';

    let j: number;

    while (i < len) {
      let c = str[i];
      j = i + 1;

      // Handle backslash-escape sequences
      if (c === '\\' && j < len) {
        c = str[j];
        switch (c) {
          // Newline
          case 'n':
            s += '\n';
            break;

          // Tab
          case 't':
            s += '\t';
            break;

          // Form feed
          case 'f':
            s += '\f';
            break;

          // Carriage return
          case 'r':
            s += '\r';
            break;

          // Byte
          case 'x': {
            // Skip over escape
            i += 2;

            // Check if we have enough characters to parse the full escape
            const lim = i + 2;
            if (lim >= len) {
              this.errors.push(E_INVALID_HEX);
              return -1;
            }

            const k = hex(str, i, lim);
            if (k !== lim) {
              this.errors.push(E_INVALID_HEX);
              return -1;
            }

            // Decode range of chars as 2-digit hex number
            const code = parseInt(str.substring(i, k), 16);

            // Eliminate unwanted ascii control bytes here.
            if (code <= 0x08 || (code >= 0x0e && code < 0x20)) {
              // emit replacement char
              s += ' ';
            } else {
              // if k === lim above, hex string is valid
              s += char(code);
            }

            // Skip over escape sequence and continue
            i = k;
            continue;
          }

          // Unicode character escape 4 or 8 digits '\u0000' or '\U00000000'
          case 'u':
          case 'U': {
            // Skip over escape
            i += 2;

            // a unicode escape can contain 4 or 8 characters.
            const lim = i + (c == 'u' ? 4 : 8);

            // find end of hex char sequence
            const k = hex(str, i, lim < len ? lim : len);

            // escape sequence end must match limit
            if (k != lim) {
              this.errors.push(E_INVALID_UNICODE);
              return -1;
            }

            // Decode range of chars as 4- or 8-digit hex number. It is possible
            // for an 8-digit hex value to exceed the range of int, so we parse
            // and constrain with a conditional.
            const repr = str.substring(i, k);
            let code = parseInt(repr, 16);

            // Eliminate unwanted ascii control bytes here. Also eliminate
            // out of range invalid Unicode characters.
            if (code <= 0x08 || (code >= 0x0e && code < 0x20) || code > 0x10ffff) {
              // emit replacement char
              s += ' ';
            } else if (code > 0xffff) {
              // convert to a surrogate pair
              code -= 0x10000;
              s += char(((code / 0x400) | 0) + 0xd800);
              s += char((code % 0x400) + 0xdc00);
            } else {
              // append the char directly
              s += char(code);
            }

            // Skip over escape sequence and continue
            i = k;
            continue;
          }

          // Literal character
          default:
            s += c;
            break;
        }

        // If we're here, the escape was length 2, so skip it
        i += 2;
        continue;
      }

      // If we've found the matching string delimiter, push the string token
      if (c === end) {
        i++;
        this.push({ type: ExprTokenType.STRING, value: s });
        return i;
      }

      // Bare line separators aren't allowed in strings
      switch (c) {
        case '\n':
        case '\r':
          this.errors.push(`Illegal bare ${charName(c)} character in string literal`);
          return -1;
      }

      // append the character to the output and advance
      s += c;
      i++;
    }

    // Matching end delimiter was never found
    this.errors.push(`Unterminated string`);
    return -1;
  }
}

/**
 * Scan a decimal integer or float number. This is a simple state machine that
 * scans a number according to JavaScript rules for decimals. Once it has accepted
 * a valid sequence of characters it returns the ending position, or a negative
 * number to indicate an error state.
 *
 * Note that we do not support octal numbers, so a leading zero will be skipped.
 */
const decimal = (str: string, i: number, len: number): number => {
  // Entering this method means we've seen at least one starting digit, so
  // our while loop should complete at least one iteration and upon exiting
  // the condition j > i will be satisfied.

  // Note: we do not look for a sign '-' or '+' here, as that is handled as a
  // separate token.

  let j = i;

  // flags tracking state
  let f: NF = 0;

  // we are guaranteed to parse at least one digit here
  loop: while (j < len) {
    const c = str[j];
    switch (c) {
      case '.':
        // decimal point can only occur once and cannot occur within the
        // exponent region
        if (f & NF.DOT) {
          // repeated decimal point
          return -3;
        }
        if (f & NF.E) {
          // error, unexpected decimal point in exponent
          return -4;
        }
        // we've seen a decimal point
        f |= NF.DOT;
        break;

      case 'e':
      case 'E':
        // exponent indicator can only occur once
        if (f & NF.E) {
          break loop;
        }
        // we've seen an exponent indicator, now expect at least one digit
        f |= NF.E | NF.EDIG;
        break;

      case '-':
      case '+':
        // sign can only occur immediately after E, can only occur once. if we
        // see a sign and are expecting a digit
        if (!(f & NF.EDIG) || !(f & NF.E) || f & NF.ESGN) {
          break loop;
        }
        // we've seen a sign
        f |= NF.ESGN;
        break;

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
        // we saw the expected digit, clear the flag
        f &= ~NF.EDIG;
        break;

      default:
        // if we encounter any other character, we're done
        break loop;
    }
    j++;
  }

  // if we're here, then j > i

  // if we were expecting 1 digit and didn't see one, it's an error
  if (f & NF.EDIG) {
    return -2; // indicate expected digit in exponent
  }
  return j;
};

/**
 * Scan a hexadecimal sequence and return the end position.
 */
const hex = (str: string, i: number, len: number): number => {
  let j = i;
  while (j < len) {
    const c = str[j];
    if ((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')) {
      j++;
      continue;
    }
    break;
  }
  return j;
};
