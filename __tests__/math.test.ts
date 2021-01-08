import { Context } from '../src/context';
import { Node } from '../src/node';
import {
  tokenDebug,
  ADD,
  ArgsToken,
  bool,
  BooleanToken,
  COMMA,
  DIV,
  EQ,
  Expr,
  ExprTokenType,
  LPRN,
  MINUS,
  MUL,
  NullToken,
  num,
  RPRN,
  SUB,
  ASN,
  SEMI,
  SEQ,
  VarToken,
  ExprOptions,
} from '../src/math';
import { splitVariable } from '../src/util';
import { Variable } from '../src/variable';

const context = (o?: any, opts?: ExprOptions) =>
  new Context(o || {}, { enableExpr: true, exprOpts: opts });

const reduce = (s: string, ctx: Context) => {
  const e = new Expr(s);
  e.build();
  return e.reduce(ctx);
};

const build = (s: string) => {
  const e = new Expr(s);
  e.build();
  return e.expr;
};

const parse = (s: string) => new Expr(s).tokens.elems;

const debug = (s: string) =>
  '[' + build(s).map(e => '[' + e.map(tokenDebug).join(' ') + ']').join(', ') + ']';

const call = (value: string) => ({ type: ExprTokenType.CALL, value });
const varn = (value: string): VarToken => ({
  type: ExprTokenType.VARIABLE,
  value: splitVariable(value),
});
const str = (value: string) => ({ type: ExprTokenType.STRING, value });

const TRUE: BooleanToken = bool(true);
const FALSE: BooleanToken = bool(false);
const NULL: NullToken = { type: ExprTokenType.NULL, value: null };
const ARGS: ArgsToken = { type: ExprTokenType.ARGS };

test('basics', () => {
  let e: string;
  let c: Context;

  c = context();

  e = '';
  expect(parse(e)).toEqual([]);
  expect(build(e)).toEqual([]);
  expect(reduce(e, c)).toEqual(undefined);

  // if no operators are applied, the result is the top of the RPN stack
  e = '1 2 3 4 5'
  expect(parse(e)).toEqual([num(1), num(2), num(3), num(4), num(5)]);
  expect(build(e)).toEqual([[num(1), num(2), num(3), num(4), num(5)]]);
  expect(reduce(e, c)).toEqual(new Node(5));

  e = '1+2';
  expect(parse(e)).toEqual([num(1), ADD, num(2)]);
  expect(build(e)).toEqual([[num(1), num(2), ADD]]);
  expect(reduce(e, c)).toEqual(new Node(3));

  e = '1-2';
  expect(parse(e)).toEqual([num(1), SUB, num(2)]);
  expect(build(e)).toEqual([[num(1), num(2), SUB]]);
  expect(reduce(e, c)).toEqual(new Node(-1));

  e = '1 + 2';
  expect(parse(e)).toEqual([num(1), ADD, num(2)]);
  expect(build(e)).toEqual([[num(1), num(2), ADD]]);
  expect(reduce(e, c)).toEqual(new Node(3));

  e = '1 + -3';
  expect(parse(e)).toEqual([num(1), ADD, MINUS, num(3)]);
  expect(build(e)).toEqual([[num(1), num(3), MINUS, ADD]]);
  expect(reduce(e, c)).toEqual(new Node(-2));

  e = 'a.b.c * -1';
  expect(parse(e)).toEqual([varn('a.b.c'), MUL, MINUS, num(1)]);
  expect(build(e)).toEqual([[varn('a.b.c'), num(1), MINUS, MUL]]);
  c = context({ a: { b: { c: 5 } } });
  expect(reduce(e, c)).toEqual(new Node(-5));

  e = `"foo" == '\u2018bar\u2019'`;
  expect(parse(e)).toEqual([str('foo'), EQ, str('\u2018bar\u2019')]);
  expect(build(e)).toEqual([[str('foo'), str('\u2018bar\u2019'), EQ]]);
  expect(reduce(e, c)).toEqual(new Node(false));

  e = ' max ( 1 , 2 ) ';
  expect(parse(e)).toEqual([call('max'), LPRN, num(1), COMMA, num(2), RPRN]);
  expect(build(e)).toEqual([[ARGS, num(1), num(2), call('max')]]);
  expect(reduce(e, c)).toEqual(new Node(2));

  e = '1 === 1';
  expect(parse(e)).toEqual([num(1), SEQ, num(1)]);
  expect(build(e)).toEqual([[num(1), num(1), SEQ]]);

  e = '(1 + (2 * (7 - (3 / 4))))';
  expect(parse(e)).toEqual([
    LPRN,
    num(1),
    ADD,
    LPRN,
    num(2),
    MUL,
    LPRN,
    num(7),
    SUB,
    LPRN,
    num(3),
    DIV,
    num(4),
    RPRN,
    RPRN,
    RPRN,
    RPRN,
  ]);
  expect(build(e)).toEqual([
    [num(1), num(2), num(7), num(3), num(4), DIV, SUB, MUL, ADD],
  ]);
  expect(reduce(e, c)).toEqual(new Node(13.5));

  e = '7+8;4';
  expect(parse(e)).toEqual([num(7), ADD, num(8), SEMI, num(4)]);
  expect(build(e)).toEqual([[num(7), num(8), ADD], [num(4)]]);
  expect(reduce(e, c)).toEqual(new Node(4));

  e = '@a = 8; @b = 4 / @a; @c = 3 * @b; @c';
  expect(parse(e)).toEqual([
    varn('@a'),
    ASN,
    num(8),
    SEMI,
    varn('@b'),
    ASN,
    num(4),
    DIV,
    varn('@a'),
    SEMI,
    varn('@c'),
    ASN,
    num(3),
    MUL,
    varn('@b'),
    SEMI,
    varn('@c'),
  ]);
  expect(build(e)).toEqual([
    [varn('@a'), num(8), ASN],
    [varn('@b'), num(4), varn('@a'), DIV, ASN],
    [varn('@c'), num(3), varn('@b'), MUL, ASN],
    [varn('@c')],
  ]);
  c = context({});
  expect(reduce(e, c)).toEqual(new Node(1.5));
});

test('debug', () => {
  expect(debug('@a = 2 * 3 / max(c, d)'))
    .toEqual('[[@a 2 3 <multiply> <args> c d max() <divide> <assign>]]');
  expect(debug(`"foo" !== "bar"`))
    .toEqual('[["foo" "bar" <strict inequality>]]');
  expect(debug('null == false || null != true'))
    .toEqual('[[null false <equality> null true <inequality> <logical or>]]');
  expect(tokenDebug({ type: 100 }))
    .toEqual('<unk>');
  expect(tokenDebug(undefined)).toEqual('undefined');
});

test('limits', () => {
  let e: Expr;
  let r: Node | undefined;
  let c: Context;
  const o = {foo: "123456789"};

  const opts: ExprOptions = {
    maxStringLen: 10,
    maxTokens: 10,
  };

  // reduce phase string concatenation limit
  c = context(o);
  e = new Expr('foo + "a"', opts);
  e.build();
  r = e.reduce(c);
  expect(r).toEqual(new Node('123456789a'));

  c = context(o);
  e = new Expr('foo + "ab"', opts);
  e.build();
  r = e.reduce(c);
  expect(r).toEqual(undefined);
  expect(c.errors[0].message).toContain('maximum string');

  // parse phase token limit
  c = context(o);
  e = new Expr('1 + 3 + 5 + 7 + 9', opts);
  e.build();
  r = e.reduce(c);
  expect(r).toEqual(new Node(25));

  c = context(o);
  e = new Expr('1 + 3 + 5 + 7 + 9 + 11', opts);
  e.build();
  r = e.reduce(c);
  expect(r).toEqual(undefined);
  expect(e.errors[0]).toContain('maximum number of allowed tokens');
});

test('bare newline / cr', () => {
  let e: Expr;

  e = new Expr('"foo \n bar"');
  expect(e.tokens.elems).toEqual([]);
  expect(e.errors[0]).toContain('bare line feed char');

  e = new Expr('"foo \r bar"');
  expect(e.tokens.elems).toEqual([]);
  expect(e.errors[0]).toContain('bare carriage return char');
});

test('parse errors', () => {
  let e: Expr;

  e = new Expr('6 + #');
  expect(e.errors[0]).toContain('Unexpected char');
  e.build();
  expect(e.expr).toEqual([]);

  e = new Expr('m#n(1, 2)');
  expect(e.errors[0]).toContain('Unexpected char');
  e.build();
  expect(e.expr).toEqual([]);

  e = new Expr('foo \x00');
  expect(e.errors[0]).toContain('Unexpected control');

  e = new Expr('foo \x18');
  expect(e.errors[0]).toContain('Unexpected control');
});

test('reduce errors', () => {
  const c = context({});

  reduce('1 - max(max(abs())) - 1', c);
  expect(c.errors[0].message).toContain('calling function abs');
  expect(c.errors[1].message).toContain('unexpected token on stack');
});

test('unsupported values', () => {
  // objects and array types are not supported for operations
  const c = context({
    obj: {
      a: 1,
      b: 'foo',
    },
    arr: [1, 2, 3],
  });

  expect(reduce('1 + obj', c)).toEqual(undefined);
  expect(reduce('1 + arr', c)).toEqual(undefined);

  expect(reduce('num(obj)', c)).toEqual(undefined);
  expect(reduce('str(obj)', c)).toEqual(undefined);
  expect(reduce('bool(obj)', c)).toEqual(undefined);

  expect(reduce('num(arr)', c)).toEqual(undefined);
  expect(reduce('str(arr)', c)).toEqual(undefined);
  expect(reduce('bool(arr)', c)).toEqual(undefined);
});

test('unsupported operators', () => {
  let c: Context = new Context(new Node({}));
  let e: Expr;

  // Reduce invalid expressions to ensure that unexpected operators are caught
  // during evaluation.

  e = new Expr('');
  e.reduceExpr(c, [num(1), num(2), SEMI]);
  expect(e.errors[0]).toContain('Unexpected operator');

  e = new Expr('');
  e.reduceExpr(c, [num(1), num(2), LPRN]);
  expect(e.errors[0]).toContain('Unexpected operator');

  e = new Expr('');
  e.reduceExpr(c, [varn('@foo'), num(1), num(2), ADD, LPRN, ASN]);
  expect(e.errors[0]).toContain('Unexpected operator');
});

test('strings', () => {
  const c = context({});

  expect(reduce("'bar'", c)).toEqual(new Node('bar'));
  expect(reduce('"\\\"bar\\\""', c)).toEqual(new Node('"bar"'));

  // unterminated
  expect(reduce('"\u000000', c)).toEqual(undefined);

  // single-character escapes
  expect(reduce('"\\a\\b\\c\\n\\t\\r\\f"', c)).toEqual(new Node('abc\n\t\r\f'));

  // hex escapes
  expect(reduce('"\\x20\\x7d\\x22\\x27"', c)).toEqual(new Node(' }"\''));

  // ascii control code replacement
  expect(reduce('"\\x00\\x01\\x02\\x19\\x18"', c)).toEqual(new Node('     '));

  // unicode escapes
  expect(reduce('"\\u2019"', c)).toEqual(new Node('\u2019'));
  expect(reduce('"\\u1f600"', c)).toEqual(new Node('\uD83D\uDE00'));
  expect(reduce('"\\u01f600\\U01f600"', c)).toEqual(
    new Node('\uD83D\uDE00\uD83D\uDE00')
  );

  // unicode escape out-of-range replacement
  expect(reduce('"\\u222222"', c)).toEqual(new Node(' '));

  // ascii control code replacement
  expect(reduce('"\\u0000\\u0001\\u0018\\u0019"', c)).toEqual(new Node('    '));
});

test('numbers', () => {
  const c = context({});
  let e: Expr;

  // decimal number must have a leading zero
  expect(parse('0.1')).toEqual([num(0.1)]);

  // trailing digit is unnecessary
  expect(parse('1.')).toEqual([num(1)]);

  expect(reduce('0x01', c)).toEqual(new Node(0x01));
  expect(reduce('0x012345678', c)).toEqual(new Node(0x012345678));
  expect(reduce('0x111111111111111111111', c)).toEqual(
    new Node(0x111111111111111111111)
  );

  expect(reduce('1e20', c)).toEqual(new Node(1e20));
  expect(reduce('1e22', c)).toEqual(new Node(1e22));

  // ensure exponent / sign state is correctly managed
  expect(reduce('1e20+1e20', c)).toEqual(new Node(2e20));
  expect(reduce('1e+20+1e+20', c)).toEqual(new Node(2e20));
  expect(reduce('1e-20+1e+20', c)).toEqual(new Node(1e20));
  expect(reduce('1e-20+1e20', c)).toEqual(new Node(1e20));

  // invalid number sequences

  e = new Expr('.1');
  expect(e.errors[0]).toContain('Unexpected char');

  e = new Expr('0x');
  expect(e.errors[0]).toContain('hex number');

  e = new Expr('1..2');
  expect(e.errors[0]).toContain('Duplicate decimal point');

  e = new Expr('0.0.0.');
  expect(e.errors[0]).toContain('Duplicate decimal point');

  // decimal must not appear in the exponent.
  e = new Expr('12e10.1');
  expect(e.errors[0]).toContain('decimal point in exponent');

  e = new Expr('1e');
  expect(e.errors[0]).toContain('exponent');

  e = new Expr('1ee');
  expect(e.errors[0]).toContain('exponent');

  e = new Expr('1e-');
  expect(e.errors[0]).toContain('exponent');

  e = new Expr('1e--1');
  expect(e.errors[0]).toContain('exponent');
});

test('string errors', () => {
  const c = context({});
  let e: Expr;

  e = new Expr("'");
  expect(e.errors[0]).toContain('Unterminated string');

  e = new Expr('"');
  expect(e.errors[0]).toContain('Unterminated string');

  // incomplete escapes
  e = new Expr('"\\x"');
  expect(e.errors[0]).toContain('hex escape');

  e = new Expr('"\\x1"');
  expect(e.errors[0]).toContain('hex escape');

  e = new Expr('"\\x1q"');
  expect(e.errors[0]).toContain('hex escape');

  e = new Expr('"\\u"');
  expect(e.errors[0]).toContain('unicode escape');

  e = new Expr('"\\uq"');
  expect(e.errors[0]).toContain('unicode escape');

  e = new Expr('"\\u123"');
  expect(e.errors[0]).toContain('unicode escape');
});

test('sequences', () => {
  const c = context({});

  expect(reduce('1; 2; 3', c)).toEqual(new Node(3));
  expect(reduce('1, 2, 3', c)).toEqual(new Node(3));
});

test('assignment', () => {
  let e: Expr;

  const c = context({});
  c.setVar('@c', new Variable('@c', new Node(3)));

  e = new Expr('@a = 6; @b = 2 * @a; @b / @c');
  e.build();
  expect(e.errors).toEqual([]);
  expect(e.reduce(c)).toEqual(new Node(4));
  expect(c.resolve(['@a'])).toEqual(new Node(6));
  expect(c.resolve(['@b'])).toEqual(new Node(12));

  // invalid assignments
  e = new Expr('a = 1');
  expect(e.tokens.elems).toEqual([varn('a'), ASN, num(1)]);
  e.build();
  expect(e.reduce(c)).toEqual(undefined);

  e = new Expr('a.b.c = 1');
  expect(e.tokens.elems).toEqual([varn('a.b.c'), ASN, num(1)]);
  e.build();
  expect(e.reduce(c)).toEqual(undefined);

  e = new Expr('* = /');
  expect(e.tokens.elems).toEqual([MUL, ASN, DIV]);
  e.build();
  expect(e.reduce(c)).toEqual(undefined);

  e = new Expr('1 = 1');
  expect(e.tokens.elems).toEqual([num(1), ASN, num(1)]);
  e.build();
  expect(e.reduce(c)).toEqual(undefined);
});

test('unary plus / minus', () => {
  const c = context({
    a: 5,
    b: -5,
    c: '12',
  });
  expect(reduce('1 + -a', c)).toEqual(new Node(-4));
  expect(reduce('1 + -b', c)).toEqual(new Node(6));
  expect(reduce('1 + +a', c)).toEqual(new Node(6));
  expect(reduce('1 + +b', c)).toEqual(new Node(-4));

  expect(reduce('+a - -a + -a + +a', c)).toEqual(new Node(10));
  expect(reduce('-c + -c', c)).toEqual(new Node(-24));

  // errors
  expect(reduce('+ -', c)).toEqual(undefined);
  expect(reduce('! ~', c)).toEqual(undefined);
});

test('unary (binary / logical) not', () => {
  const c = context({
    a: 5,
    b: false,
    c: 'foo',
  });
  expect(reduce('~2', c)).toEqual(new Node(-3));
  expect(reduce('a + ~2', c)).toEqual(new Node(2));
  expect(reduce('!a', c)).toEqual(new Node(false));
  expect(reduce('!!a', c)).toEqual(new Node(true));
});

test('equality', () => {
  const c = context({});

  expect(reduce('1 == 1', c)).toEqual(new Node(true));
  expect(reduce('1 == 2', c)).toEqual(new Node(false));
  expect(reduce('1 == NaN', c)).toEqual(new Node(false));
  expect(reduce('NaN == NaN', c)).toEqual(new Node(false));

  expect(reduce('true == 1', c)).toEqual(new Node(true));
  expect(reduce('false == 1', c)).toEqual(new Node(false));
  expect(reduce('"1" == 1', c)).toEqual(new Node(true));

  expect(reduce('1 != 1', c)).toEqual(new Node(false));
  expect(reduce('1 != 2', c)).toEqual(new Node(true));
  expect(reduce('"1" != 1', c)).toEqual(new Node(false));
});

test('strict equality', () => {
  const c = context({});

  expect(reduce('1 === 1', c)).toEqual(new Node(true));
  expect(reduce('1 === 2', c)).toEqual(new Node(false));
  expect(reduce('1 === NaN', c)).toEqual(new Node(false));
  expect(reduce('NaN === NaN', c)).toEqual(new Node(false));

  expect(reduce('true === 1', c)).toEqual(new Node(false));
  expect(reduce('false === 1', c)).toEqual(new Node(false));
  expect(reduce('"1" === 1', c)).toEqual(new Node(false));

  expect(reduce('1 !== 1', c)).toEqual(new Node(false));
  expect(reduce('1 !== 2', c)).toEqual(new Node(true));
  expect(reduce('"1" !== 1', c)).toEqual(new Node(true));
});

test('add', () => {
  const c = context({});

  expect(reduce('1 + true', c)).toEqual(new Node(2));
  expect(reduce('1 + false', c)).toEqual(new Node(1));
  expect(reduce('1 + null', c)).toEqual(new Node(1));

  expect(reduce('true + 2', c)).toEqual(new Node(3));
  expect(reduce('false + 2', c)).toEqual(new Node(2));
  expect(reduce('null + 2', c)).toEqual(new Node(2));
});

test('subtract', () => {
  const c = context({
    a: 5,
  });

  expect(reduce('a - 1', c)).toEqual(new Node(4));
  expect(reduce('"foo" - 1', c)).toEqual(new Node(NaN));
});

test('concatenate', () => {
  const c = context({});

  expect(reduce('"foo" + 1', c)).toEqual(new Node('foo1'));
  expect(reduce('"foo" + null', c)).toEqual(new Node('foonull'));
  expect(reduce('"foo" + true', c)).toEqual(new Node('footrue'));
  expect(reduce('"foo" + false', c)).toEqual(new Node('foofalse'));
  expect(reduce('"" + false', c)).toEqual(new Node('false'));

  expect(reduce('1 + "foo"', c)).toEqual(new Node('1foo'));
  expect(reduce('null + "bar"', c)).toEqual(new Node('nullbar'));
  expect(reduce('true + "bar"', c)).toEqual(new Node('truebar'));
  expect(reduce('false + "bar"', c)).toEqual(new Node('falsebar'));
  expect(reduce('false + ""', c)).toEqual(new Node('false'));
});

test('multiply', () => {
  const c = context({});

  expect(reduce('5 * 0.5', c)).toEqual(new Node(2.5));
  expect(reduce('5 * true', c)).toEqual(new Node(5));
  expect(reduce('5 * false', c)).toEqual(new Node(0));
  expect(reduce('5 * null', c)).toEqual(new Node(0));
  expect(reduce('5 * "2"', c)).toEqual(new Node(10));
  expect(reduce('5 * ""', c)).toEqual(new Node(0));

  expect(reduce('0.5 * 5', c)).toEqual(new Node(2.5));
  expect(reduce('true * 5', c)).toEqual(new Node(5));
  expect(reduce('false * 5', c)).toEqual(new Node(0));
  expect(reduce('null * 5', c)).toEqual(new Node(0));
  expect(reduce('"2" * 5', c)).toEqual(new Node(10));
  expect(reduce('"" * 5', c)).toEqual(new Node(0));
});

test('divide', () => {
  const c = context({});

  expect(reduce('5 / 2', c)).toEqual(new Node(2.5));
  expect(reduce('"foo" / 2', c)).toEqual(new Node(NaN));
});

test('modulus', () => {
  const c = context({});

  expect(reduce('5 % -5', c)).toEqual(new Node(0));
  expect(reduce('5 % -4', c)).toEqual(new Node(1));
  expect(reduce('5 % -3', c)).toEqual(new Node(2));
  expect(reduce('5 % -2', c)).toEqual(new Node(1));
  expect(reduce('5 % -1', c)).toEqual(new Node(0));
  expect(reduce('5 % 0', c)).toEqual(new Node(NaN));
  expect(reduce('5 % 1', c)).toEqual(new Node(0));
  expect(reduce('5 % 2', c)).toEqual(new Node(1));
  expect(reduce('5 % 3', c)).toEqual(new Node(2));
  expect(reduce('5 % 4', c)).toEqual(new Node(1));
  expect(reduce('5 % 5', c)).toEqual(new Node(0));
});

test('exponent', () => {
  const c = context({});

  expect(reduce('2 ** 3', c)).toEqual(new Node(8));
  expect(reduce('"foo" ** 3', c)).toEqual(new Node(NaN));
});

test('nesting', () => {
  const c = context({});
  let e: Expr;

  expect(reduce('((1 + 2) * 3) ** 2', c)).toEqual(new Node(81));

  // errant right parens
  expect(reduce('1 )', c)).toEqual(undefined);
  expect(reduce('1 + ) 2', c)).toEqual(undefined);
});

test('balanced parens', () => {
  let c = context({});
  let e: Expr;

  e = new Expr('@foo = (1 + 2');
  e.build();
  expect(e.errors[0]).toContain('Mismatched');

  e = new Expr('(1 + 2');
  e.build();
  expect(e.errors[0]).toContain('Mismatched');

  e = new Expr('1 + 2)');
  e.build();
  expect(e.errors[0]).toContain('Mismatched');

  e = new Expr('((1 + 2)');
  e.build();
  expect(e.errors[0]).toContain('Mismatched');

  e = new Expr('(1 + 2))');
  e.build();
  expect(e.errors[0]).toContain('Mismatched');
});

test('shift', () => {
  const c = context({});

  expect(reduce('14 >> -1', c)).toEqual(new Node(0));
  expect(reduce('14 >> 0', c)).toEqual(new Node(14));
  expect(reduce('14 >> 1', c)).toEqual(new Node(7));
  expect(reduce('14 >> 2', c)).toEqual(new Node(3));
  expect(reduce('14 >> 3', c)).toEqual(new Node(1));
  expect(reduce('14 >> 4', c)).toEqual(new Node(0));

  expect(reduce('14 << -1', c)).toEqual(new Node(0));
  expect(reduce('14 << 0', c)).toEqual(new Node(14));
  expect(reduce('14 << 1', c)).toEqual(new Node(28));
  expect(reduce('14 << 2', c)).toEqual(new Node(56));
  expect(reduce('14 << 3', c)).toEqual(new Node(112));
  expect(reduce('14 << 4', c)).toEqual(new Node(224));

  // non-numbers
  expect(reduce('"foo" >> 4', c)).toEqual(new Node(0));
  expect(reduce('"foo" << 4', c)).toEqual(new Node(0));
  expect(reduce('true << 4', c)).toEqual(new Node(16));
  expect(reduce('null << 4', c)).toEqual(new Node(0));
});

test('bitwise', () => {
  const c = context({});

  // or
  expect(reduce('0x02 | 0x01', c)).toEqual(new Node(3));

  // and
  expect(reduce('0x02 & 0x01', c)).toEqual(new Node(0));
  expect(reduce('0x02 & 0x02', c)).toEqual(new Node(2));
  expect(reduce('0x02 & 0x07', c)).toEqual(new Node(2));
  expect(reduce('0x03 & 0x07', c)).toEqual(new Node(3));

  // xor
  expect(reduce('0x02 ^ 0x01', c)).toEqual(new Node(3));
  expect(reduce('0x02 ^ 0x02', c)).toEqual(new Node(0));
  expect(reduce('0x02 ^ 0x03', c)).toEqual(new Node(1));
});

test('logical', () => {
  const c = context({});

  // or
  expect(reduce('true || true', c)).toEqual(new Node(true));
  expect(reduce('true || false', c)).toEqual(new Node(true));
  expect(reduce('false || false', c)).toEqual(new Node(false));
  expect(reduce('"foo" || "bar"', c)).toEqual(new Node(true));
  expect(reduce('0 || "bar"', c)).toEqual(new Node(true));
  expect(reduce('0 || ""', c)).toEqual(new Node(false));

  // and
  expect(reduce('true && true', c)).toEqual(new Node(true));
  expect(reduce('true && false', c)).toEqual(new Node(false));
  expect(reduce('1 && 1', c)).toEqual(new Node(true));
  expect(reduce('1 && 2', c)).toEqual(new Node(true));
  expect(reduce('1 && 0', c)).toEqual(new Node(false));
  expect(reduce('true && "foo"', c)).toEqual(new Node(true));
  expect(reduce('true && ""', c)).toEqual(new Node(false));
});

test('comparisons', () => {
  const c = context({});

  expect(reduce('1 < 2', c)).toEqual(new Node(true));
  expect(reduce('2 < 2', c)).toEqual(new Node(false));
  expect(reduce('3 < 2', c)).toEqual(new Node(false));

  expect(reduce('1 <= 0', c)).toEqual(new Node(false));
  expect(reduce('1 <= 1', c)).toEqual(new Node(true));
  expect(reduce('1 <= 2', c)).toEqual(new Node(true));

  expect(reduce('1 > 2', c)).toEqual(new Node(false));
  expect(reduce('2 > 2', c)).toEqual(new Node(false));
  expect(reduce('3 > 2', c)).toEqual(new Node(true));

  expect(reduce('1 >= 0', c)).toEqual(new Node(true));
  expect(reduce('1 >= 1', c)).toEqual(new Node(true));
  expect(reduce('1 >= 2', c)).toEqual(new Node(false));

  expect(reduce('0 < "1"', c)).toEqual(new Node(true));
  expect(reduce('0 < "0x01"', c)).toEqual(new Node(true));
  expect(reduce('5 < "1"', c)).toEqual(new Node(false));
  expect(reduce('5 < "0x01"', c)).toEqual(new Node(false));

  // booleans convert to numbers
  expect(reduce('0 < true', c)).toEqual(new Node(true));
  expect(reduce('0 < false', c)).toEqual(new Node(false));
  expect(reduce('0 <= true', c)).toEqual(new Node(true));
  expect(reduce('0 <= false', c)).toEqual(new Node(true));

  // non-numeric strings are cast to NaN
  expect(reduce('0 < "foo"', c)).toEqual(new Node(false));
  expect(reduce('0 < "foo"', c)).toEqual(new Node(false));

  // any portion of the string that is non-numeric fails
  expect(reduce('0 < "1foo"', c)).toEqual(new Node(false));

  // strings are compared by unicode code points
  expect(reduce('"a" < "b"', c)).toEqual(new Node(true));
  expect(reduce('"a" < "a"', c)).toEqual(new Node(false));
  expect(reduce('"b" < "a"', c)).toEqual(new Node(false));

  expect(reduce('"a" <= "b"', c)).toEqual(new Node(true));
  expect(reduce('"a" <= "a"', c)).toEqual(new Node(true));
  expect(reduce('"b" <= "a"', c)).toEqual(new Node(false));
});

test('constants', () => {
  let c = context({});

  // general math constants
  expect(reduce('PI', c)).toEqual(new Node(Math.PI));
  expect(reduce('E', c)).toEqual(new Node(Math.E));
  expect(reduce('-E', c)).toEqual(new Node(-Math.E));
  expect(reduce('Infinity', c)).toEqual(new Node(Infinity));
  expect(reduce('-Infinity', c)).toEqual(new Node(-Infinity));
  expect(reduce('NaN', c)).toEqual(new Node(NaN));

  expect(reduce('true', c)).toEqual(new Node(true));
  expect(reduce('false', c)).toEqual(new Node(false));
  expect(reduce('null', c)).toEqual(new Node(null));
});

test('function calls', () => {
  let c = context({});
  let e: Expr;

  // min() takes the minimum of all of its numeric arguments
  expect(reduce('min  (  )  ', c)).toEqual(undefined);
  expect(reduce('min("foo")', c)).toEqual(new Node(NaN));
  expect(reduce('min("foo", 5, -5)', c)).toEqual(new Node(-5));
  expect(reduce('min(5, -3, 10, -100, 17, 1000)', c)).toEqual(new Node(-100));

  // max() takes the maximum of all of its numeric arguments
  expect(reduce('max("foo", 5, -5)', c)).toEqual(new Node(5));

  // abs() operates only on the first argument that converts cleanly to a number
  expect(reduce('abs()', c)).toEqual(undefined);
  expect(reduce('abs(-5, -10, -20, -30)', c)).toEqual(new Node(5));
  expect(reduce('abs("foo")', c)).toEqual(new Node(NaN));
  expect(reduce('abs("-12")', c)).toEqual(new Node(12));

  // bad functions
  e = new Expr('1 + a (1, 2)');
  expect(e.errors[0]).toContain('Invalid function');

  // a variable reference next to a parenthesis will stop
  // accepting tokens, terminating the expression early
  c = context({
    a: 123,
  });
  expect(reduce('1 + a (2, 3, 4)', c)).toEqual(undefined);
  expect(reduce('foobar ( 1, 2, 3 )', c)).toEqual(undefined);

  // missing nodes will reduce to null
  expect(reduce('missing', c)).toEqual(new Node(null));
});

test('function args boundary', () => {
  const c = context({});

  expect(build('max(1, 2) 123')).toEqual([[ARGS, num(1), num(2), call('max'), num(123)]]);
  expect(reduce('max(1, 2) 123', c)).toEqual(new Node(123));

  expect(build('max(2) 1')).toEqual([[ARGS, num(2), call('max'), num(1)]]);
  expect(reduce('max(2) 1', c)).toEqual(new Node(1));
});

test('type conversions', () => {
  // type conversions
  const c = context({
    a: { b: 3.75, c: '3.1415', flag: true, nil: null, s: 'foo' },
    n0: '-0x1234',
    n1: '-1.2e21',
    n2: '--1.2',
    n3: '--0x1234'
  });

  expect(reduce('str()', c)).toEqual(undefined);
  expect(reduce('str("")', c)).toEqual(new Node(''));
  expect(reduce('str("foobar")', c)).toEqual(new Node('foobar'));
  expect(reduce('str(zzz)', c)).toEqual(new Node('null'));
  expect(reduce('str(a.b)', c)).toEqual(new Node('3.75'));
  expect(reduce('str(true)', c)).toEqual(new Node('true'));
  expect(reduce('str(false)', c)).toEqual(new Node('false'));
  expect(reduce('str(null)', c)).toEqual(new Node('null'));
  expect(reduce('str(a.flag)', c)).toEqual(new Node('true'));
  expect(reduce('str(a.nil)', c)).toEqual(new Node('null'));
  expect(reduce('str(a.s)', c)).toEqual(new Node('foo'));
  expect(reduce('str(-Infinity)', c)).toEqual(new Node('-Infinity'));
  expect(reduce('str(Infinity)', c)).toEqual(new Node('Infinity'));
  expect(reduce('str(NaN)', c)).toEqual(new Node('NaN'));
  expect(reduce('str(12e20)', c)).toEqual(new Node('1.2e+21'));

  expect(reduce('num()', c)).toEqual(undefined);
  expect(reduce('num(zzz)', c)).toEqual(new Node(0));
  expect(reduce('num(a.c)', c)).toEqual(new Node(3.1415));
  expect(reduce('num("0xcafe")', c)).toEqual(new Node(0xcafe));
  expect(reduce('num("0Xcafe")', c)).toEqual(new Node(0xcafe));
  expect(reduce('num("000123")', c)).toEqual(new Node(123));
  expect(reduce('num("0x")', c)).toEqual(new Node(NaN));
  expect(reduce('num("0xfoo")', c)).toEqual(new Node(NaN));
  expect(reduce('num("123foo")', c)).toEqual(new Node(NaN));
  expect(reduce('num("-")', c)).toEqual(new Node(NaN));
  expect(reduce('num("--123")', c)).toEqual(new Node(NaN));
  expect(reduce('num(n0)', c)).toEqual(new Node(-0x1234));
  expect(reduce('num(n1)', c)).toEqual(new Node(-1.2e21));
  expect(reduce('num(n2)', c)).toEqual(new Node(NaN));
  expect(reduce('num(n3)', c)).toEqual(new Node(NaN));

  expect(reduce('bool()', c)).toEqual(undefined);
  expect(reduce('bool(zzz)', c)).toEqual(new Node(false));
  expect(reduce('bool(a.b)', c)).toEqual(new Node(true));
  expect(reduce('bool("foo")', c)).toEqual(new Node(true));

  expect(reduce('str(num(bool(true)))', c)).toEqual(new Node('1'));
});

test('number formatting', () => {
  const c = context({});

  // large magnitude
  expect(reduce('str(1e20)', c)).toEqual(new Node('100000000000000000000'));
  expect(reduce('str(1e21)', c)).toEqual(new Node('1e+21'));
  expect(reduce('str(1e300)', c)).toEqual(new Node('1e+300'));
  expect(reduce('str(-1e20)', c)).toEqual(new Node('-100000000000000000000'));
  expect(reduce('str(-1e21)', c)).toEqual(new Node('-1e+21'));
  expect(reduce('str(-1e300)', c)).toEqual(new Node('-1e+300'));

  // small magnitude
  expect(reduce('str(1e-20)', c)).toEqual(new Node('0.00000000000000000001'));
  expect(reduce('str(1e-21)', c)).toEqual(new Node('1e-21'));
  expect(reduce('str(1e-300)', c)).toEqual(new Node('1e-300'));
  expect(reduce('str(-1e-20)', c)).toEqual(new Node('-0.00000000000000000001'));
  expect(reduce('str(-1e-21)', c)).toEqual(new Node('-1e-21'));
  expect(reduce('str(-1e-300)', c)).toEqual(new Node('-1e-300'));
});
