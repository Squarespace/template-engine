import {
  Compiler,
  Context,
  Formatter,
  Formatters,
  FormatterTable,
  Opcode as O,
  Predicate,
  Predicates,
  PredicateTable,
  Variable
} from '../src';

class DummyFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    vars[0].set('dummy:' + vars[0].node.asString());
  }
}

class DummyPredicate extends Predicate {
  apply(args: string[], ctx: Context): boolean {
    return args[0] === 'dummy';
  }
}

class BuggyFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    if (args.indexOf('blowup') !== -1) {
      throw new Error('oops!');
    }
  }
}

const formatters: FormatterTable = {
  ...Formatters,
  dummy: new DummyFormatter(),
  buggy: new BuggyFormatter()
};

const predicates: PredicateTable = {
  ...Predicates,
  'dummy?': new DummyPredicate()
};

test('compiler api parse', () => {
  const c = new Compiler({ formatters, predicates });
  const { code, errors } = c.parse('{@|dummy} {.dummy? dummy}A{.or}B{.end}');
  expect(code).toEqual([O.ROOT, 1, [
    [O.VARIABLE, [['@']], [['dummy']]],
    [O.TEXT, ' '],
    [O.PREDICATE, 'dummy?', [['dummy'], ' '], [
      [O.TEXT, 'A']
    ], [O.OR_PREDICATE, 0, 0, [
      [O.TEXT, 'B']
    ], O.END]],
  ], O.EOF]);
  expect(errors).toEqual([]);
});

test('compiler api execute', () => {
  const c = new Compiler({ formatters, predicates });
  let { ctx, errors } = c.execute({
    code: '{@|dummy} {.dummy? dummy}A{.or}B{.end}',
    json: 'foo'
  });
  expect(ctx.render()).toEqual('dummy:foo A');
  expect(errors).toEqual([]);

  ({ ctx, errors } = c.execute({
    code: '{@|missing}',
    json: 'foo'
  }));
  expect(ctx.render()).toEqual('foo');
  expect(errors.length).toEqual(1);
  expect(errors[0].message).toContain(`'missing' is unknown`);

  ({ ctx, errors} = c.execute({
    code: '{.missing?}A{.end}',
    json: 'foo'
  }));
  expect(ctx.render()).toEqual('');
  expect(errors.length).toEqual(1);
  expect(errors[0].message).toContain(`'missing?' is unknown`);
});

test('compiler buggy formatter', () => {
  const c = new Compiler({ formatters, predicates });
  const { ctx, errors } = c.execute({
    code: '{@|buggy} A {@|buggy blowup} B',
    json: 'foo'
  });
  expect(ctx.render()).toEqual('foo A  B');
  expect(errors.length).toEqual(1);
  expect(errors[0].message).toContain('oops!');
});
