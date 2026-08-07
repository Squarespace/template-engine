import { Compiler } from '../../src/compiler';
import { Context } from '../../src/context';
import { MISSING_PREDICATES as Missing } from '../../src/plugins/predicates.missing';

test('missing predicate units-metric?', () => {
  const impl = Missing['units-metric?'];

  const ctx = new Context({});
  expect(impl.apply([], ctx)).toEqual(true);

  expect(ctx.errors.length).toEqual(0);
});

test('units-metric? block renders the truthy branch without errors', () => {
  const compiler = new Compiler();
  const { ctx } = compiler.execute({
    json: {},
    code: '{.units-metric?}a{.or}b{.end}',
    enableExpr: true,
    enableInclude: true,
  });
  expect(ctx.render()).toEqual('a');
  expect(ctx.errors.length).toEqual(0);
});
