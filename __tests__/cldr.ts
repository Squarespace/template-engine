import * as fs from 'fs';
import { join } from 'path';

import { CLDRFramework } from '@phensley/cldr';

/**
 * Load a resource bundle for a given language.
 */
const languageBundle = (tag: string) => {
  const root = join(__dirname, '../node_modules/@phensley/cldr/packs');
  if (!fs.existsSync(root)) {
    throw new Error('Peer dependency @phensley/cldr must be installed!');
  }
  const locale = CLDRFramework.resolveLocale(tag);
  const language = locale.tag.language();
  const path = join(root, `${language}.json`);
  const raw = fs.readFileSync(path);
  return raw.toString('utf-8');
};

export const framework: CLDRFramework = new CLDRFramework({
  loader: (tag) => languageBundle(tag),
});
