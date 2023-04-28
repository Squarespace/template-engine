import { join } from 'path';
import { TemplateTestLoader } from './loader';

const loader = new TemplateTestLoader(join(__dirname, 'resources'));

loader.paths('break-%N.html').forEach((path) => {
  test(path, () => loader.execute(path));
});
