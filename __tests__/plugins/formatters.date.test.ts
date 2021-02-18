import { join } from 'path';
import { DATE_FORMATTERS as TABLE } from '../../src/plugins/formatters.date';
import { Context } from '../../src/context';
import { Variable } from '../../src/variable';
import { framework } from '../cldr';
import { pathseq } from '../helpers';
import { TemplateTestLoader } from '../loader';

const loader = new TemplateTestLoader(join(__dirname, 'resources'));

const variables = (...n: any[]) => n.map((v, i) => new Variable('var' + i, v));

pathseq('f-date-%N.html', 2).forEach(path => {
  test(`date - ${path}`, () => loader.execute(path));
});

test('date', () => {
  const en = framework.get('en');

  const tz = (s: string) => { return { website: { timeZone: s } }; };
  const losAngeles = tz('America/Los_Angeles');
  const paris = tz('Europe/Paris');
  const may2013 = 1368406800000;

  let ctx = new Context({}, { cldr: en });
  let vars = variables(may2013);
  TABLE.date.apply(['%c'], vars, ctx);
  expect(vars[0].get()).toEqual('Sun, May 12, 2013 9:00:00 PM EDT');

  vars = variables(may2013);
  TABLE.date.apply(['%Y %q %'], vars, ctx);
  expect(vars[0].get()).toEqual('2013 2 %');

  ctx = new Context(losAngeles, { cldr: en });
  vars = variables(may2013);
  TABLE.date.apply(['%c'], vars, ctx);
  expect(vars[0].get()).toEqual('Sun, May 12, 2013 6:00:00 PM PDT');

  ctx = new Context(losAngeles, { cldr: en });
  vars = variables(may2013 - (86400000 * 5));
  TABLE.date.apply(['%c'], vars, ctx);
  expect(vars[0].get()).toEqual('Tue, May 7, 2013 6:00:00 PM PDT');

  vars = variables(may2013);
  TABLE.date.apply(['%Y-%m-%d %H:%M:%S %Z'], vars, ctx);
  expect(vars[0].get()).toEqual('2013-05-12 18:00:00 PDT');

  vars = variables(may2013);
  TABLE.date.apply(['%C'], vars, ctx);
  expect(vars[0].get()).toEqual('20');

  vars = variables(may2013);
  TABLE.date.apply(['%s'], vars, ctx);
  expect(vars[0].get()).toEqual('1368406800');

  vars = variables(may2013);
  TABLE.date.apply([], vars, ctx);
  expect(vars[0].get()).toEqual('');

  ctx = new Context(paris, { cldr: en });
  vars = variables(may2013);
  TABLE.date.apply(['%c'], vars, ctx);
  expect(vars[0].get()).toEqual('Mon, May 13, 2013 3:00:00 AM CEST');

  const fr = framework.get('fr');
  ctx = new Context(paris, { cldr: fr });
  vars = variables(may2013);
  TABLE.date.apply(['%c'], vars, ctx);
  expect(vars[0].get()).toEqual('Mon, May 13, 2013 3:00:00 AM CEST');
  // TABLE.date.apply(['%c'], vars, ctx);
  // expect(vars[0].get()).toEqual('lun., mai 13, 2013 3:00:00 AM CEST');
});

test('all fields', () => {
  const en = framework.get('en');
  const nov2019 = 1573241320123;

  const ctx = new Context({}, { cldr: en });
  let vars = variables(nov2019);

  vars = variables(nov2019);
  TABLE.date.apply(['%a'], vars, ctx);
  expect(vars[0].get()).toEqual('Fri');

  vars = variables(nov2019);
  TABLE.date.apply(['%A'], vars, ctx);
  expect(vars[0].get()).toEqual('Friday');

  vars = variables(nov2019);
  TABLE.date.apply(['%b'], vars, ctx);
  expect(vars[0].get()).toEqual('Nov');

  vars = variables(nov2019);
  TABLE.date.apply(['%B'], vars, ctx);
  expect(vars[0].get()).toEqual('November');

  vars = variables(nov2019);
  TABLE.date.apply(['%c'], vars, ctx);
  expect(vars[0].get()).toEqual('Fri, Nov 8, 2019 2:28:40 PM EST');

  vars = variables(nov2019);
  TABLE.date.apply(['%D'], vars, ctx);
  expect(vars[0].get()).toEqual('11/08/19');

  vars = variables(nov2019);
  TABLE.date.apply(['%d'], vars, ctx);
  expect(vars[0].get()).toEqual('08');

  vars = variables(nov2019);
  TABLE.date.apply(['%d'], vars, ctx);
  expect(vars[0].get()).toEqual('08');

  vars = variables(nov2019);
  TABLE.date.apply(['%e'], vars, ctx);
  expect(vars[0].get()).toEqual(' 8');

  vars = variables(nov2019);
  TABLE.date.apply(['%F'], vars, ctx);
  expect(vars[0].get()).toEqual('2019-11-08');

  vars = variables(nov2019);
  TABLE.date.apply(['%g'], vars, ctx);
  expect(vars[0].get()).toEqual('19');

  vars = variables(nov2019);
  TABLE.date.apply(['%G'], vars, ctx);
  expect(vars[0].get()).toEqual('2019');

  vars = variables(nov2019);
  TABLE.date.apply(['%H'], vars, ctx);
  expect(vars[0].get()).toEqual('14');

  vars = variables(nov2019);
  TABLE.date.apply(['%h'], vars, ctx);
  expect(vars[0].get()).toEqual('Nov');

  vars = variables(nov2019);
  TABLE.date.apply(['%I'], vars, ctx);
  expect(vars[0].get()).toEqual('02');

  vars = variables(nov2019);
  TABLE.date.apply(['%j'], vars, ctx);
  expect(vars[0].get()).toEqual('312');

  vars = variables(nov2019);
  TABLE.date.apply(['%j'], vars, ctx);
  expect(vars[0].get()).toEqual('312');

  vars = variables(nov2019);
  TABLE.date.apply(['%k'], vars, ctx);
  expect(vars[0].get()).toEqual('14');

  vars = variables(nov2019);
  TABLE.date.apply(['%l'], vars, ctx);
  expect(vars[0].get()).toEqual(' 2');

  vars = variables(nov2019);
  TABLE.date.apply(['%m'], vars, ctx);
  expect(vars[0].get()).toEqual('11');

  vars = variables(nov2019);
  TABLE.date.apply(['%M'], vars, ctx);
  expect(vars[0].get()).toEqual('28');

  vars = variables(nov2019);
  TABLE.date.apply(['%n'], vars, ctx);
  expect(vars[0].get()).toEqual('\n');

  vars = variables(nov2019);
  TABLE.date.apply(['%N'], vars, ctx);
  expect(vars[0].get()).toEqual('123000000');

  vars = variables(nov2019);
  TABLE.date.apply(['%p'], vars, ctx);
  expect(vars[0].get()).toEqual('PM');

  vars = variables(nov2019);
  TABLE.date.apply(['%p'], vars, ctx);
  expect(vars[0].get()).toEqual('PM');

  vars = variables(nov2019);
  TABLE.date.apply(['%q'], vars, ctx);
  expect(vars[0].get()).toEqual('4');

  vars = variables(nov2019);
  TABLE.date.apply(['%r'], vars, ctx);
  expect(vars[0].get()).toEqual('2:28:40 PM');

  vars = variables(nov2019);
  TABLE.date.apply(['%s'], vars, ctx);
  expect(vars[0].get()).toEqual('1573241320');

  vars = variables(nov2019);
  TABLE.date.apply(['%S'], vars, ctx);
  expect(vars[0].get()).toEqual('40');

  vars = variables(nov2019);
  TABLE.date.apply(['%t'], vars, ctx);
  expect(vars[0].get()).toEqual('\t');

  vars = variables(nov2019);
  TABLE.date.apply(['%T'], vars, ctx);
  expect(vars[0].get()).toEqual('14:28:40');

  vars = variables(nov2019);
  TABLE.date.apply(['%u'], vars, ctx);
  expect(vars[0].get()).toEqual('5');

  vars = variables(nov2019);
  TABLE.date.apply(['%w'], vars, ctx);
  expect(vars[0].get()).toEqual('5');

  vars = variables(nov2019);
  TABLE.date.apply(['%W'], vars, ctx);
  expect(vars[0].get()).toEqual('45');

  vars = variables(nov2019);
  TABLE.date.apply(['%x'], vars, ctx);
  expect(vars[0].get()).toEqual('11/08/2019');

  vars = variables(nov2019);
  TABLE.date.apply(['%X'], vars, ctx);
  expect(vars[0].get()).toEqual('02:28:40 PM');

  vars = variables(nov2019);
  TABLE.date.apply(['%y'], vars, ctx);
  expect(vars[0].get()).toEqual('19');

  vars = variables(nov2019);
  TABLE.date.apply(['%Y'], vars, ctx);
  expect(vars[0].get()).toEqual('2019');

  vars = variables(nov2019);
  TABLE.date.apply(['%z'], vars, ctx);
  expect(vars[0].get()).toEqual('-05:00');

  vars = variables(nov2019);
  TABLE.date.apply(['%Z'], vars, ctx);
  expect(vars[0].get()).toEqual('EST');
});
