// TODO: parses a string into a stream of instructions

const EOF = '\0';

class Parser {

  constructor(raw, sink) {
    this.raw = raw;
    this.len = raw.length;
    this.index = 0;
    this.sink = sink;
  }

  parse() {

  }

  getc() {
    const i = this.index;
    return i < this.length ? this.raw.charAt(i) : EOF;
  }

  initial() {
    for (;;) {
      const ch = this.getc();
      if (ch === EOF) {
        break;
      }
    }
  }


}

export default Parser;
