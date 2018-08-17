
import { TABLE as Formatters } from '../../src/plugins/formatters.date';
import Context from '../../src/context';
import Variable from '../../src/variable';

const variables = (...n) => n.map((v, i) => new Variable('var' + i, v));

test('date', () => {
  const tz = (s) => { return { website: { timeZone: s } }; };
  const losAngeles = tz('America/Los_Angeles');
  const paris = tz('Europe/Paris');
  const may2013 = 1368406800000;

  let ctx = new Context({});
  let vars = variables(may2013);
  Formatters.date.apply(['%c'], vars, ctx);
  expect(vars[0].get()).toEqual('Sun, May 12, 2013 9:00:00 PM EDT');

  vars = variables(may2013);
  Formatters.date.apply(['%Y %q %'], vars, ctx);
  expect(vars[0].get()).toEqual('2013  %');

  ctx = new Context(losAngeles);
  vars = variables(may2013);
  Formatters.date.apply(['%c'], vars, ctx);
  expect(vars[0].get()).toEqual('Sun, May 12, 2013 6:00:00 PM PDT');

  vars = variables(may2013);
  Formatters.date.apply(['%Y-%m-%d %H:%M:%S %Z'], vars, ctx);
  expect(vars[0].get()).toEqual('2013-05-12 18:00:00 PDT');

  vars = variables(may2013);
  Formatters.date.apply(['%C'], vars, ctx);
  expect(vars[0].get()).toEqual('20');

  vars = variables(may2013);
  Formatters.date.apply(['%s'], vars, ctx);
  expect(vars[0].get()).toEqual('1368406800');

  vars = variables(may2013);
  Formatters.date.apply([], vars, ctx);
  expect(vars[0].get()).toEqual('');

  ctx = new Context(paris);
  vars = variables(may2013);
  Formatters.date.apply(['%c'], vars, ctx);
  expect(vars[0].get()).toEqual('Mon, May 13, 2013 3:00:00 AM CEST');
});