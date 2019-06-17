const toInt = (s: string) => parseInt(s, 10);

const calendarFormat = (key: string) => {
  switch (key) {
    case 'short':
    case 'medium':
    case 'long':
    case 'full':
      return key;
    default:
      return undefined;
  }
};

export const setCalendarFormatOptions = (args: string[]) => {
  const opts: any = {};
  // let format = undefined;
  for (const arg of args) {
    const i = arg.indexOf(':');
    if (i === -1) {
      switch (arg) {
      case 'date':
      case 'time':
        opts[arg] = 'short';
        break;

      default:
        // format = calendarFormat(arg);
        // if (format !== undefined) {
        //   opts.date = format;
        //   opts.time = format;
        // } else {

        // }
        break;
        // TODO: Skeletons
      }
      continue;
    }

    const key = arg.substring(0, i);
    const val = arg.substring(i + 1);
    switch (key) {
    case 'date':
    case 'time':
    case 'datetime':
      opts[key] = val;
      break;

    case 'wrap':
    case 'wrapper':
    case 'wrapped':
      opts.wrap = val;
      break;
    }
  }
  return opts;
};

/*eslint complexity: ["error", 24]*/
export const setNumberFormatOption = (opts: any, arg: string, val: any) => {
  switch (arg) {
  case 'group':
  case 'grouping':
    opts.group = true;
    break;

  case 'round':
  case 'rounding':
    switch (val) {
    case 'ceil':
    case 'truncate':
    case 'floor':
    case 'round':
    case 'half-even':
    case 'default':
      opts.round = val;
      break;
    }
    break;

  case 'minint':
  case 'minInt':
    opts.minimumIntegerDigits = toInt(val);
    break;

  case 'maxfrac':
  case 'maxFrac':
    opts.maximumFractionDigits = toInt(val);
    break;

  case 'minfrac':
  case 'minFrac':
    opts.minimumFractionDigits = toInt(val);
    break;

  case 'minsig':
  case 'minSig':
    opts.minimumSignificantDigits = toInt(val);
    break;

  case 'maxsig':
  case 'maxSix':
    opts.maximumSignificantDigits = toInt(val);
    break;
  }
};

export const setDecimalFormatOptions = (args: string[]) => {
  const opts: any = {};
  for (let arg of args) {
    let val;
    const i = arg.indexOf(':');
    if (i !== -1) {
      val = arg.substring(i + 1);
      arg = arg.substring(0, i);
    }
    if (arg === 'style') {
      opts.style = val;
      continue;
    }
    setNumberFormatOption(opts, arg, val);
  }
  return opts;
};
