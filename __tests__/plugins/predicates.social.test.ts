import { join } from 'path';
import { TemplateTestLoader } from '../loader';

const loader = new TemplateTestLoader(join(__dirname, 'resources'));

loader.paths('p-comments-%N.html').forEach((path) => {
  test(`comments - ${path}`, () => loader.execute(path));
});

loader.paths('p-disqus-%N.html').forEach((path) => {
  test(`disqus - ${path}`, () => loader.execute(path));
});
