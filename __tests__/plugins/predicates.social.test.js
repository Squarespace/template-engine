import { join } from 'path';
import { TemplateTestLoader } from '../loader';


const loader = new TemplateTestLoader(join(__dirname, 'resources'));


test('comments', () => {
  loader.execute('p-comments.html');
});


test('disqus', () => {
  loader.execute('p-disqus.html');
});
