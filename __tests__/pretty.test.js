import prettyJson from '../src/pretty';
import { TestLoader, parseTemplate } from './loader';


const loader = new TestLoader(__dirname, {
  TEMPLATE: parseTemplate,
  PRETTY: s => s.trim()
});


test('basic', () => {
  const spec = loader.load('./data/pretty.1.txt');
  const actual = prettyJson(spec.TEMPLATE);
  expect(actual).toEqual(spec.PRETTY);

  // Ensure re-parse of pretty-fied JSON equals the original.
  expect(JSON.parse(actual)).toEqual(spec.TEMPLATE);
});
