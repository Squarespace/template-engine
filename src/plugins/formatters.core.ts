import { Context } from '../context';
import { partialMissing } from '../errors';
import { isTruthy } from '../node';
import { Formatter, FormatterTable } from '../plugin';
import { MacroCode, RootCode } from '../instructions';
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

    // Set whether the partial / macro's execution context should be private.
    // This will block variable resolution from proceeding past the current
    // stack frame.
    let privateContext = false;
    if (args.length >= 2) {
      privateContext = args[1] === 'private';
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
      const text = executeTemplate(ctx, inst as RootCode | MacroCode, first.node, privateContext);
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
      const node = ctx.resolve(names);
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
      const resolved: (number | string)[] =
        node.type === Type.ARRAY ? (node.value as (number | string)[]) :
        node.type === Type.NUMBER ? [node.asNumber()] : [node.asString()];
      tmp = tmp.path(resolved);
      if (tmp.type !== Type.ARRAY && tmp.type !== Type.OBJECT) {
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
    const value = JSON.stringify(first.node.value);
    first.set(escapeScriptTags(value));
  }
}

export class JsonPretty extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const value = JSON.stringify(first.node.value, undefined, '  ');
    first.set(escapeScriptTags(value));
  }
}

export class LookupFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const key = first.node.asString();
    const ref = ctx.resolve(splitVariable(key));
    const value = ctx.resolve(splitVariable(ref.asString()));
    first.set(value);
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

const RE_SMARTY_1 = /(^|[-\u2014\\s(\["])'/g;
const RE_SMARTY_2 = /(^|[-\u2014/\[(\u2018\s])"/g;

export class SmartyPantsFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    let value = first.node.asString();
    value = value.replace(RE_SMARTY_1, '$1\u2018');
    value = value.replace("'", '\u2019');
    value = value.replace(RE_SMARTY_2, '$1\u201c');
    value = value.replace('"', '\u201d');
    value = value.replace('--', '\u2014');
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
    const limit = args.length === 0 ? 0 : parseInt(args[0], 10);
    if (isFinite(limit) && limit > 0) {
      const first = vars[0];
      let value = first.node.asString();
      value = truncate(value, limit);
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

export const TABLE: FormatterTable = {
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
  'output': new OutputFormatter(),
  'pluralize': new PluralizeFormatter(),
  'raw': new RawFormatter(),
  'round': new RoundFormatter(),
  'safe': new SafeFormatter(),
  'slugify': new SlugifyFormatter(),
  'smartypants': new SmartyPantsFormatter(),
  'str': new StrFormatter(),
  'truncate': new TruncateFormatter(),
  'url-encode': new UrlEncodeFormatter(),
};
