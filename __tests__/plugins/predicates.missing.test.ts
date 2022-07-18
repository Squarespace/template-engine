import { Context } from '../../src/context';
import { MISSING_PREDICATES as Missing } from '../../src/plugins/predicates.missing';

test('missing predicate units-metric?', () => {
  const impl = Missing['units-metric?'];

  let ctx = new Context({});
  expect(impl.apply([], ctx)).toEqual(false);

  expect(ctx.errors.length).toBeGreaterThan(0);
});
