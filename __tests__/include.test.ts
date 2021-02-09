import { join } from 'path';
import { pathseq } from './helpers';
import { TemplateTestLoader } from './loader';

const loader = new TemplateTestLoader(join(__dirname, 'resources'));

pathseq('include-%N.html', 2).forEach(path => {
    test(path, () => loader.execute(path));
});
