import { join } from 'path';
import { TemplateTestLoader } from '../loader';

const loader = new TemplateTestLoader(join(__dirname, 'resources'));

loader.paths('f-missing-%N.html').forEach((path) => {
  test(`missing - ${path}`, () => loader.execute(path));
});
