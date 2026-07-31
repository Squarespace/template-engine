import { join } from 'path';
import { Compiler } from '../../src/compiler';
import { TemplateTestLoader } from '../loader';

const loader = new TemplateTestLoader(join(__dirname, 'resources'));

loader.paths('f-missing-%N.html').forEach((path) => {
  test(`missing - ${path}`, () => loader.execute(path));
});

const compiler = new Compiler();

const run = (code: string, json: any) => {
  const { ctx } = compiler.execute({ json, code, enableExpr: true, enableInclude: true });
  return { out: ctx.render(), errors: ctx.errors.length };
};

test('datetimefield and unit render missing without errors', () => {
  for (const f of ['datetimefield', 'unit']) {
    const r = run(`{@|${f}}`, 'VAL');
    expect(r.out).toEqual('');
    expect(r.errors).toEqual(0);
  }
});
