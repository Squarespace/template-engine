#!/usr/bin/env node

/* eslint-disable import/unambiguous,no-process-exit */

const fs = require('fs');
const { join } = require('path');
const { Compiler, CompatLevel, Patch, ReferenceScanner } = require('../lib');

const { prettyJson } = require('../lib/pretty');
const { CLDRFramework } = require('@phensley/cldr');

const cldrpath = '@phensley/cldr/packs';

// try to locate the peer @phensley/cldr package
const roots = [
  join(__dirname, '../node_modules', cldrpath),
  join(__dirname, '../..', cldrpath),
  join(__dirname, '../../..', cldrpath),
  join(__dirname, '../../../..', cldrpath)
];

const languageBundle = (tag) => {
  let root = ''
  for (let i = 0; i < roots.length; i++) {
    const tmp = roots[i];
    if (fs.existsSync(tmp)) {
      root = tmp;
      break;
    }
  }
  if (!root) {
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
      if (key === 'compat-patch') {
        // Repeatable flag: collect each name so the run applies them in
        // order. The other flags keep their last value as before.
        if (!Array.isArray(args[key])) {
          args[key] = [];
        }
        args[key].push(val);
      } else {
        args[key] = val;
      }
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
  console.log('  --compat-level N    - Compatibility level; 0 keeps released behavior');
  console.log('  --compat-patch NAME  - Force a legacy patch by name; repeatable');
  process.exit(1);
};

// Prints a flag error, then the option list, and exits nonzero.
const usageError = (message) => {
  process.stderr.write('error: ' + message + '\n');
  usage();
};

const parseLevel = (raw) => {
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) {
    throw new Error('compat level must be a non-negative integer, got ' + raw);
  }
  return parseInt(raw, 10);
};

const resolvePatch = (raw) => {
  const name = String(raw).trim().toUpperCase();
  const patch = Patch.values().find(p => p.name === name);
  if (!patch) {
    throw new Error('unknown compat-patch ' + name);
  }
  return patch;
};

// Mirrors Java TemplateC.compatLevel(Namespace): start at the default
// level, then the numeric level, then each patch override in order.
const buildCompat = (args) => {
  let compat = CompatLevel.defaultLevel();
  const rawLevel = args['compat-level'];
  if (rawLevel !== undefined) {
    compat = compat.withLevel(parseLevel(rawLevel));
  }
  const names = args['compat-patch'] || [];
  for (const name of names) {
    compat = compat.withPatch(resolvePatch(name));
  }
  return compat;
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

  let compat;
  try {
    compat = buildCompat(args);
  } catch (e) {
    usageError(e.message);
  }

  const cldr = framework.get(locale);

  const compiler = new Compiler();

  const coderaw = read(codepath);
  // Keep the parsed result so compile errors survive into the render path's
  // report. A .json template is pre-parsed code and has no parse errors.
  let parsed;
  let code;
  if (codepath.endsWith('.json')) {
    code = JSON.parse(coderaw);
  } else {
    parsed = compiler.parse(coderaw, compat);
    code = parsed.code;
  }
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

  // The level reaches the execute phase on both paths, so a pre-parsed
  // .json template still runs at the chosen level.
  const { ctx } = compiler.execute({ cldr, code, json, partials, enableExpr: true, enableInclude: true, compat });

  // Always print the rendered output, even when errors occurred; build
  // tooling can use the exit code to tell whether the output is trustworthy.
  process.stdout.write(ctx.render());

  // Compile errors are collected by the parse; render-time errors land on
  // the context. A nonempty merged list means the output is not trustworthy.
  const errors = [...(parsed && parsed.errors ? parsed.errors : []), ...(ctx.errors || [])];
  if (errors.length > 0) {
    process.stderr.write('Caught errors executing template:\n');
    for (const err of errors) {
      process.stderr.write('    ' + err.message + '\n');
    }
    // Let pending stdout writes drain before exiting, or large renders get
    // truncated by the pipe buffer.
    process.exitCode = 1;
  }
};

parseArgs();
main();
