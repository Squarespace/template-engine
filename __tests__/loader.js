import fs from 'fs';
import { join, sep } from 'path';

import Assembler from '../src/assembler';
import Parser from '../src/parser';


const SECTION = /^:([A-Z]+)\s*$/;

/**
 * Loads test case files relative to the __tests__ directory.
 */
export class TestLoader {

  constructor(directory, decoders) {
    this.directory = directory;
    this.decoders = decoders;
  }

  load(path) {
    if (path.startsWith(sep)) {
      throw new Error(`Path must be relative. Got ${path}`);
    }
    const fullPath = join(this.directory, path);
    const data = fs.readFileSync(fullPath).toString('utf-8');
    return this.parse(data);
  }

  parse(raw) {
    const lines = raw.split('\n');
    const sections = {};
    let key = null;
    let curr = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(SECTION);
      if (match === null) {
        curr.push(line);
        continue;
      }

      if (key !== null) {
        const decoder = this.decoders[key];
        const data = curr.join('\n');
        sections[key] = decoder ? decoder(data) : data;
        curr = [];
      }
      key = match[1];
    }
    if (!sections[key]) {
      const decoder = this.decoders[key];
      const data = curr.join('\n');
      sections[key] = decoder ? decoder(data) : data;
    }
    return sections;
  }
}

/**
 * Parse a string into an executable instruction tree.
 */
export const parseTemplate = (str) => {
  const assembler = new Assembler();
  const parser = new Parser(str, assembler);
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
export const parseMap = (str, func) => {
  const obj = JSON.parse(str);
  Object.keys(obj).forEach(k => {
    const v = obj[k];
    obj[k] = func(v);
  });
  return obj;
};

/**
 * Helper to load template compilation test cases.
 */
export class TemplateTestLoader extends TestLoader {

  constructor(directory) {
    super(directory, {
      JSON: JSON.parse,
      INJECT: JSON.parse,
      PARTIALS: s => parseMap(s, parseTemplate),
      TEMPLATE: parseTemplate,
      OUTPUT: s => s.trim()
    });
  }

}
