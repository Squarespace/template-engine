#!/usr/bin/env node

/* eslint-disable import/unambiguous,no-process-exit */

const fs = require('fs');
const { join } = require('path');
const { Compiler, ReferenceScanner } = require('../lib');

const { prettyJson } = require('../lib/pretty');
const { CLDRFramework } = require('@phensley/cldr');

const languageBundle = (tag) => {
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

const framework = new CLDRFramework({
  loader: tag => languageBundle(tag)
});

const RE_1 = /^-(\w)$/;
const RE_2 = /^--([\w-]+)$/;

const match = s => RE_1.exec(s) || RE_2.exec(s);

const split = (raw) => {
  const i = raw.indexOf('--');
  return i === -1 ? [raw, []] : [raw.slice(0, i), raw.slice(i + 1)];
};

// quick-n-dirty argument parser to avoid adding a runtime dependency
const parseArgs = () => {
  const _raw = process.argv;
  const args = {
    _: [],
    _node: _raw[0],
    _script: _raw[1]
  };
  const [raw, rest] = split(_raw.slice(2));
  for (let i = 0; i < raw.length; i++) {
    const arg = raw[i];
    const next = raw[i + 1];
    const m1 = match(arg);
    const m2 = match(next);
    if (m1) {
      const key = m1[1];
      const val = m2 ? true : (i++, next || true);
      args[key] = val;
    } else {
      args._.push(arg);
    }
  }

  args._ = args._.concat(rest);
  return args;
};

const read = p => fs.readFileSync(p, { encoding: 'utf-8' }).toString();

const usage = (args) => {
  console.log('templatec OPTIONS');
  console.log('  -j, --json PATH      - Path to JSON data');
  console.log('  -p, --partials PATH  - Path to JSON partials');
  console.log('  -t, --template PATH  - Path to HTML or JSON template');
  console.log('  -l, --locale ID      - Language tag for a locale');
  console.log('  -d, --dump           - Dump parsed template');
  console.log('  -P, --pretty         - Pretty-format the dumped template');
  console.log('  -R, --references     - Dump template references');
  process.exit(1);
};

const main = () => {
  const args = parseArgs();
  const codepath = args.template || args.t;
  const jsonpath = args.json || args.j;
  const partpath = args.partials || args.p;
  const locale = args.locale || args.l || 'en';
  if (!codepath) {
    usage();
  }

  const cldr = framework.get(locale);

  const compiler = new Compiler();

  const coderaw = read(codepath);
  const code = codepath.endsWith('.json') ? JSON.parse(coderaw) : compiler.parse(coderaw).code;
  if (args.dump || args.d) {
    if (args.pretty || args.P) {
      process.stdout.write(prettyJson(code, '  '));
    } else {
      process.stdout.write(JSON.stringify(code));
    }
    return;

  } else if (args.references || args.R) {
    const scanner = new ReferenceScanner();
    scanner.extract(code);
    process.stdout.write(JSON.stringify(scanner.collect(), undefined, args.pretty || args.P ? 2 : 0));
    return;
  }

  const json = jsonpath ? JSON.parse(read(jsonpath)) : {};
  const partials = partpath ? JSON.parse(read(partpath)) : {};

  const { ctx } = compiler.execute({ cldr, code, json, partials, enableExpr: true, enableInclude: true });
  process.stdout.write(ctx.render());
  if (ctx.errors) {
    for (const err of ctx.errors) {
      process.stderr.write(err.message + '\n');
    }
  }
};

parseArgs();
main();
