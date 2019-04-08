import * as fs from 'fs';
import { join } from 'path';
import * as zlib from 'zlib';

import { CLDRFramework } from '@phensley/cldr';

/**
 * Load a resource bundle for a given language.
 */
const languageBundle = (framework, tag) => {
  const root = join(__dirname, '../node_modules/@phensley/cldr/packs');
  if (!fs.existsSync(root)) {
    throw new Error('Peer dependency @phensley/cldr must be installed!');
  }
  const locale = CLDRFramework.resolveLocale(tag);
  const language = locale.tag.language();
  const path = join(root, `${language}.json.gz`);
  const compressed = fs.readFileSync(path);
  return zlib.gunzipSync(compressed).toString('utf-8');
};

export const framework = new CLDRFramework({
  loader: tag => languageBundle(framework, tag)
});
