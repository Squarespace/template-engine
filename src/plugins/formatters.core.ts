import { Context } from '../context';
import { Patch } from '../compat/patch';
import { partialMissing } from '../errors';
import { isTruthy } from '../node';
import { Formatter, FormatterTable } from '../plugin';
import { MacroCode, RootCode } from '../instructions';
import { MISSING_NODE, Node } from '../node';
import { Variable } from '../variable';
import { Type } from '../types';
import { executeTemplate } from '../exec';
import { splitVariable } from '../util';
import { findNthValidEntry, getLookupAndPath } from './util.find';
import { atLeast, between, exactly, parseInt32 } from './args';
import { format } from './util.format';
import { escapeHtmlAttributes, escapeScriptTags, slugify, truncate } from './util.string';
import utf8 from 'utf8';

export class ApplyFormatter extends Formatter {
  constructor() {
    super(true);
  }

  validateArgs(args: string[]): void {
    atLeast(args.length, 1);
  }

  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];

    // Bail if we have no arguments or no engine defined.
    if (args.length === 0 || !ctx.engine) {
      first.set('');
      return;
    }

    // Get the name of the partial / macro.
    const name = args[0];

    let argvar: Variable | undefined;

    // Set whether the partial / macro's execution context should be private.
    // This will block variable resolution from proceeding past the current
    // stack frame.
    let privateContext = false;
    if (args.length > 1) {
      const argmap: any = {};
      for (let i = 1; i < args.length; i++) {
        const arg = args[i];

        // Mark the context as private
        if (arg === 'private') {
          privateContext = true;
          continue;
        }

        // Parse the colon-delimited arguments into key-values
        const j = arg.indexOf('=');
        if (j !== -1) {
          const k = arg.slice(0, j);
          const v = arg.slice(j + 1);
          argmap[k] = v;
        }
      }

      // Pass formatter's argument to the macro / template
      argvar = ctx.newVariable('@args', new Node(argmap));
    }

    // Retrieve the partial / macro by name, If none defined, bail.
    const inst = ctx.getPartial(name);
    if (!Array.isArray(inst)) {
      ctx.error(partialMissing(name));
      first.set('');
      return;
    }

    if (ctx.compatEnabled(Patch.PARTIAL_DEPTH_LEAK)) {
      // Legacy, the depth is released even on a breach and is not released
      // when the partial throws.
      if (ctx.enterPartial(name)) {
        first.set(executeTemplate(ctx, inst as RootCode | MacroCode, first.node, privateContext, argvar));
      } else {
        first.set('');
      }
      ctx.exitPartial(name);
    } else if (ctx.enterPartial(name)) {
      // Fixed, the depth is released when the partial throws and only when
      // the entry succeeded.
      try {
        const text = executeTemplate(ctx, inst as RootCode | MacroCode, first.node, privateContext, argvar);
        first.set(text);
      } finally {
        ctx.exitPartial(name);
      }
    } else {
      // Executing the partial failed, so set empty.
      first.set('');
    }
  }
}

export class CountFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const node = first.node;
    if (node.type === Type.OBJECT) {
      first.set(Object.keys(node.value).length);
    } else if (node.type === Type.ARRAY || node.type === Type.STRING) {
      first.set(node.value.length);
    } else {
      first.set(0);
    }
  }
}

export class CycleFormatter extends Formatter {
  constructor() {
    super(true);
  }

  validateArgs(args: string[]): void {
    atLeast(args.length, 1);
  }

  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const value = first.node.asNumber();
    const count = args.length;
    let index = (value - 1) % count;
    if (index < 0) {
      index += count;
    }
    first.set(args[index]);
  }
}

export class EncodeSpaceFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const value = first.node.asString();
    if (ctx.compatEnabled(Patch.ENCODE_SPACE_WHITESPACE)) {
      // Legacy, tabs and newlines are replaced along with spaces. Java \s
      // matches more Unicode whitespace than JS \s; no fixture pins those.
      first.set(value.replace(/\s/g, '&nbsp;'));
    } else {
      // Fixed, only the space character is replaced per the doc.
      first.set(value.replace(/ /g, '&nbsp;'));
    }
  }
}

export class EncodeUriFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const value = first.node.asString();
    first.set(encodeURI(value));
  }
}

export class EncodeUriComponentFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const value = first.node.asString();
    first.set(encodeURIComponent(value));
  }
}

export class FormatFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const values = args.map((arg) => {
      const names = splitVariable(arg);
      const parent = ctx.frame().parent;
      const node = ctx.resolveFrom(names, parent ? parent : ctx.frame());
      return node.type === Type.NULL || node.type === Type.MISSING ? '' : node.value;
    });
    const fmt = first.node.asString();
    const result = format(fmt, values, ctx.compatEnabled(Patch.FORMAT_STATE_DIGITS));
    first.set(result);
  }
}

export class GetFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    let tmp = first.node;
    for (const arg of args) {
      const path = splitVariable(arg);
      const node = ctx.resolve(path);

      if (node.type === Type.MISSING) {
        tmp = MISSING_NODE;
      } else {
        const resolved: (number | string)[] =
          node.type === Type.ARRAY
            ? (node.value as (number | string)[])
            : node.type === Type.NUMBER
              ? [node.asNumber()]
              : [node.asString()];

        tmp = tmp.path(resolved);
      }

      // Once we hit a missing node, no point continuing
      if (tmp.type === Type.MISSING) {
        break;
      }
    }
    first.set(tmp);
  }
}

export class HtmlFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const value = first.node.replace({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
    });
    first.set(value);
  }
}

export class HtmlAttrFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    // Legacy, the single quote passes through raw; fixed, it escapes.
    first.set(escapeHtmlAttributes(first.node.asString(), ctx.compatEnabled(Patch.HTMLATTR_QUOTE)));
  }
}

export class IterFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const value = ctx.lookupStack('@index');
    vars[0].set(value.asString());
  }
}

export class JsonFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    if (first.node.isMissing()) {
      first.set('');
    } else {
      const value = JSON.stringify(first.node.value);
      first.set(escapeScriptTags(value, ctx.compatEnabled(Patch.JSON_LINE_SEPARATORS)));
    }
  }
}

export class JsonPretty extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    if (first.node.isMissing()) {
      first.set('');
    } else {
      const value = JSON.stringify(first.node.value, undefined, '  ');
      first.set(escapeScriptTags(value, ctx.compatEnabled(Patch.JSON_LINE_SEPARATORS)));
    }
  }
}

export class KeyByFormatter extends Formatter {
  constructor() {
    super(true);
  }

  validateArgs(args: string[]): void {
    exactly(args.length, 1);
  }

  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const path = args[0];
    const keyByMap: { [key: string]: any } = {};

    if (first.node.type === Type.ARRAY && path) {
      const splitPath = splitVariable(path);

      for (const val of first.get()) {
        const nodeAtPath = new Node(val).path(splitPath);

        if (nodeAtPath.type !== Type.MISSING) {
          keyByMap[nodeAtPath.value] = val;
        }
      }
    }

    first.set(keyByMap);
  }
}

export class FindFirstFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const { lookup, path } = getLookupAndPath(ctx, args);
    first.set(findNthValidEntry(first.get(), path, lookup, 1));
  }
}

export class FindLastFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const { lookup, path } = getLookupAndPath(ctx, args);
    first.set(findNthValidEntry(first.get(), path, lookup, -1));
  }
}

const NEWLINE = /\n/g;

export class LineBreaksFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const value = first.node.asString();
    const replacement = value.replace(NEWLINE, '<br/>');
    first.set(replacement);
  }
}

export class LookupFormatter extends Formatter {
  constructor() {
    super(true);
  }

  validateArgs(args: string[]): void {
    exactly(args.length, 1);
  }

  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const key = args[0];
    if (key) {
      const ref = ctx.resolve(splitVariable(key));
      const value = ctx.resolve(splitVariable(ref.asString()));
      first.set(value);
    } else {
      first.set('');
    }
  }
}

const MOD_INTEGER = /^-?[0-9]+$/;

/**
 * Parse an argument as a signed integer in full, the shape Java's mod
 * formatter accepts for the divisor. It allows no surrounding whitespace
 * and no leading plus, and rejects anything outside the safe integer
 * range. The 2^53 bound is the JS stand-in for Long's overflow throw; the
 * (2^53, 2^63) band keeps the EVAL_INTEGRAL_LONG precision residual.
 */
const parseModInteger = (s: string): number | null => {
  if (!MOD_INTEGER.test(s)) {
    return null;
  }
  const n = Number(s);
  return Math.abs(n) <= Number.MAX_SAFE_INTEGER ? n : null;
};

export class ModFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];

    // A missing or unparsable divisor defaults to 2, like Java.
    let divisor = 2;
    if (args.length > 0) {
      const parsed = parseModInteger(args[0]);
      if (parsed !== null) {
        divisor = parsed;
      }
      if (divisor === 0 && ctx.compatEnabled(Patch.MOD_ZERO)) {
        // Legacy, divisor 0 reaches the modulus and throws by zero.
        throw Object.assign(new Error('/ by zero'), { name: 'ArithmeticException' });
      }
      if (divisor === 0) {
        // Fixed, a zero divisor defaults to 2 like bad input.
        divisor = 2;
      }
    }

    // The value coerces the way Jackson's asLong does: numbers truncate,
    // text must parse as an integer in full, booleans become 1 or 0, and
    // everything else gives 0.
    const node = first.node;
    let value = 0;
    switch (node.type) {
      case Type.NUMBER:
        value = Number.isNaN(node.value) ? 0 : Math.trunc(node.value);
        break;
      case Type.STRING: {
        const parsed = parseModInteger(node.value);
        if (parsed !== null) {
          value = parsed;
        }
        break;
      }
      case Type.BOOLEAN:
        value = node.value ? 1 : 0;
        break;
    }

    // JS % keeps the dividend's sign, matching Java long %.
    first.set(value % divisor);
  }
}

export class OutputFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const value = args.join(' ');
    vars[0].set(value);
  }
}

export class PluralizeFormatter extends Formatter {
  validateArgs(args: string[]): void {
    between(args.length, 0, 2);
  }

  apply(args: string[], vars: Variable[], ctx: Context): void {
    let singular = '';
    let plural = 's';
    if (args.length === 1) {
      plural = args[0];
    } else if (args.length >= 2) {
      singular = args[0];
      plural = args[1];
    }

    const first = vars[0];
    const result = first.node.asNumber() === 1 ? singular : plural;
    first.set(result);
  }
}

export class PropFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    let tmp = first.node;
    for (const arg of args) {
      const path = splitVariable(arg);
      tmp = tmp.path(path);
      if (tmp.type === Type.MISSING) {
        break;
      }
    }
    first.set(tmp);
  }
}

export class RawFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    first.set(JSON.stringify(first.node.value));
  }
}

export class RoundFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const value = first.node.asNumber();
    first.set(Math.round(value));
  }
}

const RE_SAFE = /<[^>]*?>/g;

export class SafeFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    if (isTruthy(first.node)) {
      const value = first.node.asString();
      first.set(value.replace(RE_SAFE, ''));
    }
  }
}

export class SlugifyFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const value = first.node.asString();
    first.set(slugify(value));
  }
}

const RE_SMARTY_1 = /(^|[-\u2014\\s(\["])'/gm;
const RE_SMARTY_APOS = /'/gm;
const RE_SMARTY_2 = /(^|[-\u2014/\[(\u2018\s])"/gm;
const RE_SMARTY_QUOTE = /"/gm;
const RE_SMARTY_MDASH = /--/gm;

export class SmartyPantsFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    let value = first.node.asString();
    value = value.replace(RE_SMARTY_1, '$1\u2018');
    value = value.replace(RE_SMARTY_APOS, '\u2019');
    value = value.replace(RE_SMARTY_2, '$1\u201c');
    value = value.replace(RE_SMARTY_QUOTE, '\u201d');
    value = value.replace(RE_SMARTY_MDASH, '\u2014');
    first.set(value);
  }
}

export class StrFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    switch (first.node.type) {
      case Type.OBJECT:
      case Type.ARRAY:
        first.set('');
        break;
      default:
        first.set(first.node.asString());
        break;
    }
  }
}

export class TruncateFormatter extends Formatter {
  validateArgs(args: string[]): void {
    // Java guards on a present argument and then requires a strict int,
    // reporting the NumberFormatException as a bad-length error.
    if (args.length > 0 && parseInt32(args[0]) === null) {
      throw new Error(`bad value for length '${args[0]}'`);
    }
  }

  apply(args: string[], vars: Variable[], ctx: Context): void {
    let limit = 100;
    let ellipsis = '...';
    if (args.length) {
      limit = parseInt(args[0], 10);
    }
    if (args.length > 1) {
      ellipsis = args[1];
    }

    if (isFinite(limit)) {
      const first = vars[0];
      const value = first.node.asString();

      // Legacy, a negative length throws. Fixed, it clamps to 0.
      const legacy = ctx.compatEnabled(Patch.TRUNCATE_NEGATIVE);
      if (legacy && limit < 0) {
        throw Object.assign(new Error(`begin 0, end ${limit}, length ${value.length}`), {
          name: 'StringIndexOutOfBoundsException',
        });
      }
      first.set(truncate(value, legacy ? limit : Math.max(0, limit), ellipsis));
    }
  }
}

export class UrlEncodeFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const value = first.node.asString();
    const utf = utf8.encode(value);
    first.set(escape(utf));
  }
}

export const CORE_FORMATTERS: FormatterTable = {
  apply: new ApplyFormatter(),
  count: new CountFormatter(),
  cycle: new CycleFormatter(),
  'encode-space': new EncodeSpaceFormatter(),
  'encode-uri': new EncodeUriFormatter(),
  'encode-uri-component': new EncodeUriComponentFormatter(),
  'find-first': new FindFirstFormatter(),
  'find-last': new FindLastFormatter(),
  format: new FormatFormatter(),
  get: new GetFormatter(),
  html: new HtmlFormatter(),
  htmlattr: new HtmlAttrFormatter(),
  htmltag: new HtmlAttrFormatter(), // same as "htmlattr"
  iter: new IterFormatter(),
  json: new JsonFormatter(),
  'json-pretty': new JsonPretty(),
  'key-by': new KeyByFormatter(),
  'line-breaks': new LineBreaksFormatter(),
  lookup: new LookupFormatter(),
  mod: new ModFormatter(),
  output: new OutputFormatter(),
  pluralize: new PluralizeFormatter(),
  prop: new PropFormatter(),
  raw: new RawFormatter(),
  round: new RoundFormatter(),
  safe: new SafeFormatter(),
  slugify: new SlugifyFormatter(),
  smartypants: new SmartyPantsFormatter(),
  str: new StrFormatter(),
  truncate: new TruncateFormatter(),
  'url-encode': new UrlEncodeFormatter(),
};
