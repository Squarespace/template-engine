class EnumValue {
  constructor(typeName, string, code) {
    this.typeName = `${typeName}Value`;
    this.string = string;
    this.code = code;
  }

  type() {
    return this.typeName;
  }
}
class Enum {

  constructor(typeName, mapping) {
    this.typeName = typeName;
    this._members = new Set();
    this._codeMap = {};
    this._stringMap = {};
    this._values = [];

    Object.keys(mapping).forEach(k => {
      const entry = mapping[k];

      // Ensure every entry has a numeric code.
      const code = entry.code;
      if (typeof code !== 'number') {
        throw new Error('Enum values must have numeric "code" property defined');
      }

      // Ensure codes are unique.
      if (this._codeMap[code]) {
        throw new Error(`Enum codes must be unique! ${code} is already defined.`);
      }

      const string = entry.string ? entry.string : k;
      const value = new EnumValue(typeName, string, code);
      // const value = makeEnumValue({ valueTypeName, symbol: k, string, code });
      this[k] = value;
      this._members.add(value);
      this._stringMap[string] = value;
      this._codeMap[code] = value;
      this._values.push(value);
    });

    this._values.sort((a, b) => a.code < b.code ? -1 : 1);
  }

  is(v) {
    return this._members.has(v);
  }

  type() {
    return this.typeName;
  }

  fromString(s) {
    return this._stringMap[s];
  }

  fromCode(code) {
    return this._codeMap[code];
  }

  values() {
    return this._values;
  }
}

const makeEnum = (typeName, mapping) => new Enum(typeName, mapping);

export default makeEnum;
