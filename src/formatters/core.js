import dateutil from './dateutil';
import { format } from './formatutil';
import { Formatter } from '../plugin';
import types from '../types';
import { isTruthy, splitVariable, executeTemplate } from '../util';
import utf8 from 'utf8';

import moment from 'moment-timezone';


class Apply extends Formatter {
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

class Count extends Formatter {
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

class Cycle extends Formatter {
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

class EncodeSpace extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const value = first.node.asString();
    first.set(value.replace(/\s/g, '&nbsp;'));
  }
}

class EncodeUri extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const value = first.node.asString();
    first.set(encodeURI(value));
  }
}

class EncodeUriComponent extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const value = first.node.asString();
    first.set(encodeURIComponent(value));
  }
}

class Format extends Formatter {
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

class Html extends Formatter {
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

class HtmlAttr extends Formatter {
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

class Iter extends Formatter {
  apply(args, vars, ctx) {
    const value = ctx.lookupStack('@index');
    vars[0].set(value.asString());
  }
}

class Json extends Formatter {
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

class Lookup extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const key = first.node.asString();
    const ref = ctx.resolve(splitVariable(key));
    const value = ctx.resolve(splitVariable(ref.asString()));
    first.set(value);
  }
}

class Output extends Formatter {
  apply(args, vars, ctx) {
    const value = args.join(' ');
    vars[0].set(value);
  }
}

class Pluralize extends Formatter {
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

class Raw extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    first.set(first.node.asString());
  }
}

class Round extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const value = first.node.asNumber();
    first.set(Math.round(value));
  }
}

const RE_SAFE = /<[^>]*?>/g;

class Safe extends Formatter {
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

class Slugify extends Formatter {
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

class SmartyPants extends Formatter {
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

class Str extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    first.set(first.node.asString());
  }
}

class Truncate extends Formatter {
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

class UrlEncode extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const value = first.node.asString();
    const utf = utf8.encode(value);
    first.set(escape(utf));
  }
}

export default {
  apply: new Apply(),
  count: new Count(),
  cycle: new Cycle(),
  date: new DateFormatter(),
  'encode-space': new EncodeSpace(),
  'encode-uri': new EncodeUri(),
  'encode-uri-component': new EncodeUriComponent(),
  format: new Format(),
  html: new Html(),
  htmlattr: new HtmlAttr(),
  htmltag: new HtmlAttr(), // same as "htmlattr"
  iter: new Iter(),
  json: new Json(),
  'json-pretty': new JsonPretty(),
  lookup: new Lookup(),
  output: new Output(),
  pluralize: new Pluralize(),
  raw: new Raw(),
  round: new Round(),
  safe: new Safe(),
  slugify: new Slugify(),
  smartypants: new SmartyPants(),
  str: new Str(),
  truncate: new Truncate(),
  'url-encode': new UrlEncode(),
};
