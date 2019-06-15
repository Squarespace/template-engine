import { join } from 'path';
import { prettyJson } from '../src/pretty';
import { TestLoader, parseTemplate } from './loader';


const loader = new TestLoader(join(__dirname, 'resources'), {
  TEMPLATE: parseTemplate,
  PRETTY: (s: string) => s.trim()
});


test('basic', () => {
  const spec = loader.load('pretty-1.txt');
  const actual = prettyJson(spec.TEMPLATE);
  expect(actual).toEqual(spec.PRETTY);

  // Ensure re-parse of pretty-fied JSON equals the original.
  expect(JSON.parse(actual)).toEqual(spec.TEMPLATE);
});
