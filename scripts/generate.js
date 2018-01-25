
import fs from 'fs';

import { join, normalize } from 'path';
import { Compiler } from '../src';
import prettyJson from '../src/pretty';


const extension = '.html';
const root = normalize(join(__dirname, '..'));
const dirs = [
  join(root, 'src/plugins/templates')
];

const mtime = f => fs.statSync(f).mtimeMs;
const newerThan = (a, b) => mtime(a) > mtime(b);

const compiler = new Compiler();

// Reduce the template directories to the list of templates.
const files = dirs.reduce((list, d) => {
  var names = fs.readdirSync(d)
    .filter(n => n.endsWith(extension))
    .map(n => join(d, n));
  return list.concat(...names);
}, []);

// Generate if the source file is newer than the destination.
files.forEach(src => {
  const dst = src.slice(0, -extension.length) + '.json';

  // Check if we need a rebuild.
  const rebuild = !fs.existsSync(dst) || newerThan(src, dst) || newerThan(__filename, dst);
  if (!rebuild) {
    return;
  }

  // Rebuild the destination.
  const source = fs.readFileSync(src, { encoding: 'utf-8' });
  const { code } = compiler.parse(source.trim());
  const output = prettyJson(code);
  console.log('[generating]', dst);
  fs.writeFileSync(dst, output);
});
