import { join } from 'path';
import { TemplateTestLoader } from '../loader';

const loader = new TemplateTestLoader(join(__dirname, 'resources'));

test('current-type?', () => {
  loader.execute('p-current-type.html');
});
