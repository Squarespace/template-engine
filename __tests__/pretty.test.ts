import { join } from 'path';
import { pathseq } from './helpers';
import { prettyJson } from '../src/pretty';
import { parseTemplate, TestLoader } from './loader';

const loader = new TestLoader(join(__dirname, 'resources'), {
  TEMPLATE: (s: string) => parseTemplate(s.trim()),
  JSON: (s: string) => s.trim()
});

test('basic', () => {
  const spec = loader.load('pretty-1.txt');
  const actual = prettyJson(spec.TEMPLATE);
  expect(actual).toEqual(spec.JSON);

  // Ensure re-parse of pretty-fied JSON equals the original.
  expect(JSON.parse(actual)).toEqual(spec.TEMPLATE);
});

pathseq('ast-%N.html', 17).forEach(path => {
  test(path, () => {
    const spec = loader.load(path);
    const actual = prettyJson(spec.TEMPLATE);
    expect(JSON.parse(actual)).toEqual(JSON.parse(spec.JSON));
  });
});
