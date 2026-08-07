import * as fs from 'fs';
import { join, sep } from 'path';
import { framework } from './cldr';

import { Assembler } from '../src/assembler';
import { Compiler } from '../src/compiler';
import { Parser } from '../src/parser';
import { MatcherImpl } from '../src/matcher';
import { Code } from '../src/instructions';
import { Formatters, Predicates } from '../src/plugins';
import { CompatLevel } from '../src/compat/compat-level';

const SECTION = /^:([a-zA-Z\d_-]+)\s*$/;

interface DecoderMap {
  TEMPLATE: (s: string) => string | Code;
  PARAMS: (s: string) => any;
  JSON: (s: string) => any;
  PARTIALS: (s: string) => any;
  INJECT: (s: string) => any;
  PROPERTIES: (s: string) => any;
  OUTPUT: (s: string) => string;
  PRETTY: (s: string) => string;
  '*'?: (s: any) => any;
}

/**
 * Loads test case files relative to the __tests__ directory.
 */
export class TestLoader {
  constructor(private directory: string, private decoders: Partial<DecoderMap>) {}

  /**
   * Return all paths in directory that match the numbered pattern.
   */
  paths(pattern: string): string[] {
    const rx = new RegExp('^' + pattern.replace('%N', '\\d+') + '$');
    const names = fs.readdirSync(this.directory);
    const res: string[] = [];
    for (const name of names) {
      if (rx.test(name)) {
        res.push(name);
      }
    }
    return res.sort();
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
 * Parse a string into an executable instruction tree. The optional compat
 * level pins the parse, mirroring Java TestCaseParser which compiles at
 * the level from the :PROPERTIES section.
 */
export const parseTemplate = (str: string, compat?: CompatLevel) => {
  const assembler = new Assembler();
  const matcher = new MatcherImpl('');
  const parser = new Parser(str, assembler, matcher, Formatters, Predicates, compat);
  parser.parse();
  const errors = assembler.errors;
  if (errors.length > 0) {
    throw new Error('Error(s) parsing template\n:' + errors.map((e) => `[${e.type}] ${e.message}`).join('\n'));
  }
  return assembler.code();
};

/**
 * Parses JSON into a map and applies func() to each value.
 */
export const parseMap = (str: string, func: (v: any) => any): any => {
  const obj = JSON.parse(str);
  Object.keys(obj).forEach((k) => {
    const v = obj[k];
    obj[k] = func(v);
  });
  return obj;
};

/**
 * Parse a :PROPERTIES section in Java Properties file style: one key=value
 * pair per line. Leading whitespace is ignored and blank lines or lines
 * starting with # or ! are skipped. The fixtures only use plain pairs, so
 * line continuations and escape sequences are not handled.
 */
export const parseProperties = (str: string): any => {
  const props: any = {};
  for (const line of str.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#') || trimmed.startsWith('!')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      throw new Error(`Invalid property line: ${line}`);
    }
    props[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return props;
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
      PROPERTIES: parseProperties,
      // The template stays raw so execute can parse it once at the level
      // the fixture pins, matching Java TestCaseParser which compiles at
      // that level.
      TEMPLATE: (s: string) => s,
      OUTPUT: (s: string) => s.trim(),
      PRETTY: (s: string) => s.trim(),
    });
  }

  execute(path: string): void {
    const spec = this.load(path);
    const params = spec.PARAMS;
    const props = spec.PROPERTIES || {};

    // An optional :PROPERTIES section pins the level and the runtime
    // switches for the case, mirroring Java TestCaseParser which reads the
    // same keys from java.util.Properties. The properties win over PARAMS
    // when both set a key. `preprocess` is accepted for fixture parity but
    // the parser has no preprocessor, so it is a no-op here.
    let compat = CompatLevel.defaultLevel();
    const level = props.level;
    if (level !== undefined) {
      compat = CompatLevel.at(Number(level));
    }

    // Parse at the pinned level, default when the fixture pins none.
    const code = parseTemplate(spec.TEMPLATE, compat);

    // i18n-enable the execution context
    const locale = props.locale || (params || {}).locale || 'en';
    const now: number | undefined = props.now !== undefined ? Number(props.now) : (params || {}).now;
    const cldr = locale === 'none' ? undefined : framework.get(locale);

    // execute the test case at the same level the template was parsed
    const { ctx } = compiler.execute({
      cldr,
      now,
      code,
      json: spec.JSON,
      partials: spec.PARTIALS,
      injects: spec.INJECT,
      enableExpr: props.enableExpr === undefined ? true : props.enableExpr === 'true',
      enableInclude: props.enableInclude === undefined ? true : props.enableInclude === 'true',
      maxPartialDepth: props.maxPartialDepth === undefined ? undefined : Number(props.maxPartialDepth),
      compat,
    });
    const output = ctx.render();
    if (ctx.errors) {
      for (const err of ctx.errors) {
        console.error(err);
      }
    }
    expect(output.trim()).toEqual(spec.OUTPUT);
  }
}
