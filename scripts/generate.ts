import fs from 'fs';
import { join, normalize } from 'path';
import { Compiler } from '../src';
import { prettyJson } from '../src/pretty';

const extension = '.html';
const root = normalize(join(__dirname, '..'));
const dirs = [
  join(root, 'src/plugins/templates')
];

const mtime = (f: string) => fs.statSync(f).mtimeMs;
const newerThan = (a: string, b: string) => mtime(a) > mtime(b);

const compiler = new Compiler();

// Reduce the template directories to the list of templates.
const files = dirs.reduce((list: string[], d) => {
  const names = fs.readdirSync(d)
    .filter(n => n.endsWith(extension))
    .map(n => join(d, n));
  return list.concat(names);
}, []);

// Generate if the source file is newer than the destination.
files.forEach((src: string) => {
  const dst = src.slice(0, -extension.length) + '.json';

  // Check if we need a rebuild.
  const rebuild = !fs.existsSync(dst) || newerThan(src, dst) || newerThan(__filename, dst);
  if (!rebuild) {
    return;
  }

  // Rebuild the destination.
  const source = fs.readFileSync(src, { encoding: 'utf-8' });
  const { code, errors } = compiler.parse(source);
  if (errors.length > 0) {
    throw new Error('Error(s) parsing template\n:' +
      errors.map(e => `[${e.type}] ${e.message}`).join('\n'));
  }
  const output = prettyJson(code);
  console.log('[generating]', dst);
  fs.writeFileSync(dst, output);
});
