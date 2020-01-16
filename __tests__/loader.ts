import * as fs from 'fs';
import { join, sep } from 'path';
import { framework } from './cldr';

import { Assembler } from '../src/assembler';
import { Compiler } from '../src/compiler';
import { matcherImpl, Parser } from '../src/parser';
import { Code } from '../src/instructions';
import { Formatters, Predicates } from '../src/plugins';

const SECTION = /^:([a-zA-Z\d_-]+)\s*$/;

interface DecoderMap {
  TEMPLATE: (s: string) => Code;
  PARAMS: (s: string) => any;
  JSON: (s: string) => any;
  PARTIALS: (s: string) => any;
  INJECT: (s: string) => any;
  OUTPUT: (s: string) => string;
  PRETTY: (s: string) => string;
  '*'?: (s: any) => any;
}

/**
 * Loads test case files relative to the __tests__ directory.
 */
export class TestLoader {

  constructor(private directory: string, private decoders: Partial<DecoderMap>) {
  }

  load(path: string): any {
    if (path.startsWith(sep)) {
      throw new Error(`Path must be relative. Got ${path}`);
    }
    const fullPath = join(this.directory, path);
    const data = fs.readFileSync(fullPath, { encoding: 'utf-8' });
    return this.parse(data);
  }

  parse(raw: string): any {
    const lines = raw.split('\n');
    const sections: any = {};
    let key: keyof Partial<DecoderMap> | null = null;
    let curr = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(SECTION);
      if (match === null) {
        curr.push(line);
        continue;
      }

      if (key !== null) {
        const decoder = this.decoders[key] || this.decoders['*'];
        const data = curr.join('\n');
        sections[key] = decoder ? decoder(data) : data;
        curr = [];
      }
      key = match[1] as keyof Partial<DecoderMap>;
    }

    if (key !== null && !sections[key]) {
      const decoder = this.decoders[key] || this.decoders['*'];
      const data = curr.join('\n');
      sections[key] = decoder ? decoder(data) : data;
    }
    return sections;
  }
}

/**
 * Parse a string into an executable instruction tree.
 */
export const parseTemplate = (str: string) => {
  const assembler = new Assembler();
  const matcher = new matcherImpl('');
  const parser = new Parser(str, assembler, matcher, Formatters, Predicates);
  parser.parse();
  const errors = assembler.errors;
  if (errors.length > 0) {
    throw new Error('Error(s) parsing template\n:' +
      errors.map(e => `[${e.type}] ${e.message}`).join('\n'));
  }
  return assembler.code();
};

/**
 * Parses JSON into a map and applies func() to each value.
 */
export const parseMap = (str: string, func: (v: any) => any): any => {
  const obj = JSON.parse(str);
  Object.keys(obj).forEach(k => {
    const v = obj[k];
    obj[k] = func(v);
  });
  return obj;
};

const compiler = new Compiler();

/**
 * Helper to load template compilation test cases.
 */
export class TemplateTestLoader extends TestLoader {

  constructor(directory: string) {
    super(directory, {
      JSON: JSON.parse,
      PARAMS: JSON.parse,
      INJECT: (s: string) => parseMap(s, JSON.parse),
      PARTIALS: (s: string) => parseMap(s, parseTemplate),
      TEMPLATE: parseTemplate,
      OUTPUT: (s: string) => s.trim(),
      PRETTY: (s: string) => s.trim()
    });
  }

  execute(path: string): void {
    const spec = this.load(path);
    const params = spec.PARAMS;

    // i18n-enable the execution context
    const locale = (params || {}).locale || 'en';
    const cldr = framework.get(locale);

    // execute the test case
    const { ctx } = compiler.execute({
      cldr,
      code: spec.TEMPLATE,
      json: spec.JSON,
      partials: spec.PARTIALS,
      injects: spec.INJECT
    });
    const output = ctx.render();
    expect(output.trim()).toEqual(spec.OUTPUT);
  }
}
