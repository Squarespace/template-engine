import {
  BindvarCode,
  Code,
  CtxvarCode,
  MacroCode,
  PredicateCode,
  Reference,
  RepeatedCode,
  RootCode,
  SectionCode,
  TextCode,
  VariableCode,
} from './instructions';
import { nameOfOpcode, Opcode } from './opcodes';

class Data {
  readonly variables: any[] = [{}];
  readonly instructions: Map<string, number> = new Map();
  readonly formatters: Map<string, number> = new Map();
  readonly predicates: Map<string, number> = new Map();

  currentNode: any = this.variables[0];
  textBytes: number = 0;
}

export interface References {
  instructions: { [name: string]: number };
  formatters: { [name: string]: number };
  predicates: { [name: string]: number };
  textBytes: number;
  variables: any;
}

const ref = (r: Reference) => r.join('.');

const increment = (map: Map<string, number>, key: string) => map.set(key, (map.get(key) || 0) + 1);

const convert = (map: Map<string, number>): any => {
  const r: any = {};
  map.forEach((v: number, k: string) => (r[k] = v));
  return r;
};

export class ReferenceScanner {
  private refs: Data = new Data();

  collect(): References {
    return {
      instructions: convert(this.refs.instructions),
      formatters: convert(this.refs.formatters),
      predicates: convert(this.refs.predicates),
      textBytes: this.refs.textBytes,
      variables: this.refs.variables,
    };
  }

  extract(inst?: Code): void {
    if (inst === undefined) {
      return;
    }

    const opcode: Opcode = typeof inst === 'number' ? inst : inst[0];
    this.instruction(opcode);
    switch (opcode) {
      case Opcode.BINDVAR: {
        const i = inst as BindvarCode;
        for (const name of i[2]) {
          this.variable(name.join('.'));
        }
        break;
      }

      case Opcode.CTXVAR: {
        const i = inst as CtxvarCode;
        for (const binding of i[2]) {
          this.variable(binding[1].join('.'));
        }
        break;
      }

      case Opcode.MACRO: {
        const i = inst as MacroCode;
        this.block(i[2]);
        break;
      }

      case Opcode.PREDICATE:
      case Opcode.OR_PREDICATE: {
        const i = inst as PredicateCode;
        if (typeof i[1] === 'string') {
          this.predicate(i[1]);
        }
        this.block(i[3]);
        this.extract(i[4]);
        break;
      }

      case Opcode.REPEATED: {
        const i = inst as RepeatedCode;
        this.push(ref(i[1]));
        this.block(i[2]);
        this.extract(i[3]);
        this.block(i[4]);
        this.pop();
        break;
      }

      case Opcode.ROOT:
        this.block((inst as RootCode)[2]);
        break;

      case Opcode.SECTION: {
        const i = inst as SectionCode;
        this.push(ref(i[1]));
        this.block(i[2]);
        this.extract(i[3]);
        this.pop();
        break;
      }

      case Opcode.TEXT:
        this.refs.textBytes += (inst as TextCode)[1].length;
        break;

      case Opcode.VARIABLE: {
        const i = inst as VariableCode;
        for (const r of i[1]) {
          this.variable(r.join('.'));
        }
        for (const call of i[2] || []) {
          this.formatter(call[0]);
        }
      }
    }
  }

  block(code: Code[]): void {
    if (code) {
      for (const c of code) {
        this.extract(c);
      }
    }
  }

  instruction(opcode: Opcode): void {
    increment(this.refs.instructions, nameOfOpcode(opcode));
  }

  formatter(name: string): void {
    increment(this.refs.formatters, name);
  }

  predicate(name: string): void {
    increment(this.refs.predicates, name);
  }

  variable(name: string): void {
    const n = this.refs.currentNode[name];
    if (n === undefined) {
      this.refs.currentNode[name] = null;
    }
  }

  push(name: string): void {
    const c = this.refs.currentNode;
    const n = c[name];
    let obj: any;
    if (n) {
      obj = n;
    } else {
      obj = c[name] = {};
    }
    this.refs.currentNode = obj;
    this.refs.variables.push(obj);
  }

  pop(): void {
    this.refs.variables.pop();
    this.refs.currentNode = this.refs.variables[this.refs.variables.length - 1];
  }
}
