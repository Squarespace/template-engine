export interface EnumValue<T> {
  readonly kind: T;
  readonly code: number;
  readonly name: string;
}

export type EnumMethods<T> = {
  values(): EnumValue<T>[];
  is(value: any): boolean;
  fromName(name: string): EnumValue<T> | undefined;
  fromCode(code: number): EnumValue<T> | undefined;
};

export type Enum<T, R> = {
  [P in keyof R]: EnumValue<T>;
};

export type EnumMap = {
  [id: string]: [number, string];
};

export type EnumDecl<T> = Enum<T, EnumMap> & EnumMethods<T>;

/**
 * Generate a typed enum having the given kind and values, along
 * with some helper methods.
 */
// tslint:disable-next-line:variable-name
export const enum_ = <T extends string, R extends EnumMap>(kind: T, map: R): EnumDecl<T> => {
  const _values: EnumValue<T>[] = [];
  const names: { [x: string]: EnumValue<T> } = {};
  const codes: { [x: number]: EnumValue<T> } = {};
  const seen = new Set<number>();
  const res = Object.keys(map).reduce((prev: Enum<T, R>, curr: keyof R) => {
    const [code, name] = map[curr];
    const val = { kind, code, name };
    prev[curr] = val;
    _values.push(val);
    names[name] = val;
    codes[code] = val;
    if (seen.has(code)) {
      throw new Error(`Found non-unique enum code ${code} already mapped to ${codes[code]}`);
    }
    seen.add(code);
    return prev;
  }, {} as Enum<T, R>);

  // Sort returns -1 or 1 since codes cannot be equal
  _values.sort((a, b) => a.code < b.code ? -1 : 1);
  const values = () => _values;
  const is = (value: EnumValue<any>) => value && value.kind === kind;
  const fromName = (name: string) => names[name];
  const fromCode = (c: number) => codes[c];
  return { ...res, values, is, fromCode, fromName };
};
