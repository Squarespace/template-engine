import dateutil from './util.date';
import { format } from './util.format';
import { Formatter } from '../plugin';
import types from '../types';
import { isTruthy, splitVariable, executeTemplate } from '../util';
import utf8 from 'utf8';

import moment from 'moment-timezone';


class ApplyFormatter extends Formatter {
  apply(args, vars, ctx) {
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
    if (inst === null) {
      first.set('');
      return;
    }

    // Execute the template and set the variable to the result.
    const text = executeTemplate(ctx, inst, first.node, privateContext);
    first.set(text);
  }
}

class CountFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const node = first.node;
    if (node.type === types.OBJECT) {
      first.set(Object.keys(node.value).length);
    } else if (node.type === types.ARRAY) {
      first.set(node.value.length);
    } else {
      first.set(0);
    }
  }
}

class CycleFormatter extends Formatter {
  apply(args, vars, ctx) {
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

/**
 * Retrieves the Website's timeZone from the context, falling
 * back to the default NY.
 */
const getTimeZone = (ctx) => {
  const node = ctx.resolve(['website', 'timeZone']);
  return node.isMissing() ? 'America/New_York' : node.asString();
};

/**
 * Some YUI format characters can't be translated into MomentJS fields.
 * We need to calculate the field's value on the fly and replace it
 * into the pattern.
 */
const getMomentFormat = (m, raw) => {
  const parts = dateutil.translate(raw);
  const len = parts.length;
  for (let i = 0; i < len; i++) {
    const part = parts[i];
    if (part.calc) {
      switch (part.calc) {
      case 'century':
        parts[i] = '[' + parseInt(m.year() / 100, 10) + ']';
        break;

      case 'epoch-seconds':
        parts[i] = '[' + parseInt(m.valueOf() / 1000, 10) + ']';
        break;
      }
    }
  }
  return parts.join('');
};

class DateFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];

    // No args, just return no output. On the server-side this would raise an
    // error, but just bail out here.
    if (args.length === 0) {
      first.set('');
      return;
    }

    // TODO: support locale

    // Compute the moment object
    const instant = vars[0].node.asNumber();
    const timezone = getTimeZone(ctx);
    const m = moment.tz(instant, 'UTC').tz(timezone);

    // Build format and apply
    const fmt = getMomentFormat(m, args[0]);
    const value = m.format(fmt);
    first.set(value);
  }
}

class EncodeSpaceFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const value = first.node.asString();
    first.set(value.replace(/\s/g, '&nbsp;'));
  }
}

class EncodeUriFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const value = first.node.asString();
    first.set(encodeURI(value));
  }
}

class EncodeUriComponentFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const value = first.node.asString();
    first.set(encodeURIComponent(value));
  }
}

class FormatFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const values = args.map(arg => {
      const names = splitVariable(arg);
      const node = ctx.resolve(names);
      return node.type === types.NULL || node.type === types.MISSING ? '' : node.value;
    });
    const fmt = first.node.asString();
    const result = format(fmt, values);
    first.set(result);
  }
}

class HtmlFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const value = first.node.replace({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;'
    });
    first.set(value);
  }
}

class HtmlAttrFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const value = first.node.replace({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;'
    });
    first.set(value);
  }
}

class IterFormatter extends Formatter {
  apply(args, vars, ctx) {
    const value = ctx.lookupStack('@index');
    vars[0].set(value.asString());
  }
}

class JsonFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const value = first.node.value;
    first.set(JSON.stringify(value));
  }
}

class JsonPretty extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const value = first.node.value;
    first.set(JSON.stringify(value, null, '  '));
  }
}

class LookupFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const key = first.node.asString();
    const ref = ctx.resolve(splitVariable(key));
    const value = ctx.resolve(splitVariable(ref.asString()));
    first.set(value);
  }
}

class OutputFormatter extends Formatter {
  apply(args, vars, ctx) {
    const value = args.join(' ');
    vars[0].set(value);
  }
}

class PluralizeFormatter extends Formatter {
  apply(args, vars, ctx) {
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

class RawFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    first.set(first.node.asString());
  }
}

class RoundFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const value = first.node.asNumber();
    first.set(Math.round(value));
  }
}

const RE_SAFE = /<[^>]*?>/g;

class SafeFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    if (isTruthy(first.node)) {
      const value = first.node.asString();
      first.set(value.replace(RE_SAFE, ''));
    }
  }
}

const RE_SLUGIFY_KILL = /[^a-zA-Z0-9\s-]+/g;
const RE_SLUGIFY_WS = /\s+/g;

class SlugifyFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    let value = first.node.asString();
    value = value.replace(RE_SLUGIFY_KILL, '');
    value = value.replace(RE_SLUGIFY_WS, '-');
    first.set(value.toLowerCase());
  }
}

const RE_SMARTY_1 = /(^|[-\u2014\\s(\["])'/g;
const RE_SMARTY_2 = /(^|[-\u2014/\[(\u2018\s])"/g;

class SmartyPantsFormatter extends Formatter {
  apply(args, vars, ctx) {
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

class StrFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    first.set(first.node.asString());
  }
}

class TruncateFormatter extends Formatter {
  apply(args, vars, ctx) {
    const limit = args.length === 0 ? 0 : parseInt(args[0], 10);
    if (isFinite(limit) && limit > 0) {
      const first = vars[0];
      let value = first.node.asString();
      value = value.substring(0, limit);
      first.set(value);
    }
  }
}

class UrlEncodeFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const value = first.node.asString();
    const utf = utf8.encode(value);
    first.set(escape(utf));
  }
}

export default {
  'apply': new ApplyFormatter(),
  'count': new CountFormatter(),
  'cycle': new CycleFormatter(),
  'date': new DateFormatter(),
  'encode-space': new EncodeSpaceFormatter(),
  'encode-uri': new EncodeUriFormatter(),
  'encode-uri-component': new EncodeUriComponentFormatter(),
  'format': new FormatFormatter(),
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
