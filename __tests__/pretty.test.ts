import { join } from 'path';
import { parseTemplate, TestLoader } from './loader';
import { prettyJson } from '../src/pretty';
import { Code } from '../src/instructions';
import { Opcode as O } from '../src/opcodes';

const loader = new TestLoader(join(__dirname, 'resources'), {
  TEMPLATE: (s: string) => parseTemplate(s.trim()),
  JSON: (s: string) => s.trim(),
});

test('basic', () => {
  const spec = loader.load('pretty-1.txt');
  const actual = prettyJson(spec.TEMPLATE);
  expect(actual).toEqual(spec.JSON);

  // Ensure re-parse of pretty-fied JSON equals the original.
  expect(JSON.parse(actual)).toEqual(spec.TEMPLATE);
});

test('indent', () => {
  const spec = loader.load('pretty-2.txt');
  const actual = prettyJson(spec.TEMPLATE, '      ');
  expect(actual).toEqual(spec.JSON);
});

test('malformed', () => {
  let template: Code;
  let actual: string;

  template = [O.ROOT, 1, undefined, O.EOF] as unknown as Code;
  actual = prettyJson(template);
  expect(actual).toEqual('[17, 1, [], 18]');

  template = O.END;
  actual = prettyJson(template);
  expect(actual).toEqual('3');

  template = undefined as unknown as Code;
  actual = prettyJson(template);
  expect(actual).toEqual('');
});

loader.paths('ast-%N.html').forEach((path) => {
  test(path, () => {
    const spec = loader.load(path);
    const actual = prettyJson(spec.TEMPLATE);
    expect(JSON.parse(actual)).toEqual(JSON.parse(spec.JSON));
  });
});
