import { join } from 'path';
import { TemplateTestLoader } from './loader';

const loader = new TemplateTestLoader(join(__dirname, 'resources'));

loader.paths('eval-%N.html').forEach((path) => {
  test(path, () => loader.execute(path));
});
