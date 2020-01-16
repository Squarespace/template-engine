import { Context } from '../context';
import { partialMissing } from '../errors';
import { isTruthy } from '../node';
import { Formatter, FormatterTable } from '../plugin';
import { MacroCode, RootCode } from '../instructions';
import { MISSING_NODE, Node } from '../node';
import { Variable } from '../variable';
import { Type } from '../types';
import { executeTemplate } from '../exec';
import { splitVariable } from '../util';
import { format } from './util.format';
import { escapeHtmlAttributes, escapeScriptTags, slugify, truncate } from './util.string';
import utf8 from 'utf8';

export class ApplyFormatter extends Formatter {
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

    if (ctx.enterPartial(name)) {
      // Execute the template and set the variable to the result.
      const text = executeTemplate(ctx, inst as RootCode | MacroCode, first.node, privateContext, argvar);
      first.set(text);
      ctx.exitPartial(name);
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
    } else if (node.type === Type.ARRAY) {
      first.set(node.value.length);
    } else {
      first.set(0);
    }
  }
}

export class CycleFormatter extends Formatter {
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
    first.set(value.replace(/\s/g, '&nbsp;'));
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
    const values = args.map(arg => {
      const names = splitVariable(arg);
      const node = ctx.resolve(names, first.node);
      return node.type === Type.NULL || node.type === Type.MISSING ? '' : node.value;
    });
    const fmt = first.node.asString();
    const result = format(fmt, values);
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
          node.type === Type.ARRAY ? (node.value as (number | string)[]) :
          node.type === Type.NUMBER ? [node.asNumber()] : [node.asString()];

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
      '>': '&gt;'
    });
    first.set(value);
  }
}

export class HtmlAttrFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    first.set(escapeHtmlAttributes(first.node.asString()));
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
      first.set(escapeScriptTags(value));
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
      first.set(escapeScriptTags(value));
    }
  }
}

export class LookupFormatter extends Formatter {
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

export class ModFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const n = first.node.asNumber();
    const divisor = parseInt(args[0], 10) || 2;
    first.set(n % (divisor && isFinite(divisor) ? divisor : 2));
  }
}

export class OutputFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const value = args.join(' ');
    vars[0].set(value);
  }
}

export class PluralizeFormatter extends Formatter {
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
    first.set(first.node.asString());
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
    first.set(first.node.asString());
  }
}

export class TruncateFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    let limit = 100;
    let ellipsis = '...';
    if (args.length) {
      limit = parseInt(args[0], 10);
    }
    if (args.length > 1) {
      ellipsis = args[1];
    }

    if (isFinite(limit) && limit > 0) {
      const first = vars[0];
      let value = first.node.asString();
      value = truncate(value, limit, ellipsis);
      first.set(value);
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
  'apply': new ApplyFormatter(),
  'count': new CountFormatter(),
  'cycle': new CycleFormatter(),
  'encode-space': new EncodeSpaceFormatter(),
  'encode-uri': new EncodeUriFormatter(),
  'encode-uri-component': new EncodeUriComponentFormatter(),
  'format': new FormatFormatter(),
  'get': new GetFormatter(),
  'html': new HtmlFormatter(),
  'htmlattr': new HtmlAttrFormatter(),
  'htmltag': new HtmlAttrFormatter(), // same as "htmlattr"
  'iter': new IterFormatter(),
  'json': new JsonFormatter(),
  'json-pretty': new JsonPretty(),
  'lookup': new LookupFormatter(),
  'mod': new ModFormatter(),
  'output': new OutputFormatter(),
  'pluralize': new PluralizeFormatter(),
  'prop': new PropFormatter(),
  'raw': new RawFormatter(),
  'round': new RoundFormatter(),
  'safe': new SafeFormatter(),
  'slugify': new SlugifyFormatter(),
  'smartypants': new SmartyPantsFormatter(),
  'str': new StrFormatter(),
  'truncate': new TruncateFormatter(),
  'url-encode': new UrlEncodeFormatter(),
};
