
/**
 * Dynamically create an enum value.
 */
const makeEnumValue = (props) => {
  return new (class {
    constructor({ symbol, code, string }) {
      this.symbol = symbol;
      this.code = code;
      this.string = string;
      Object.freeze(this);
    }

    type() {
      return props.valueTypeName;
    }

    static get name() {
      return props.valueTypeName;
    }
  })(props);
};

/**
 * Creates an enumeration with a reverse mapping to a name, to support
 * some of the use cases for Java enums.
 */
const makeEnum = (typeName, mapping) => {
  const valueTypeName = typeName + 'Value';
  const stringMap = {};
  const codeMap = {};
  const values = [];
  return new (class {
    constructor() {
      Object.keys(mapping).forEach(k => {
        const entry = mapping[k];
        const code = entry.code;
        if (typeof code === 'undefined') {
          throw new Error('Enum values must have "code" property defined');
        }
        const string = entry.string ? entry.string : k;
        const value = makeEnumValue({ valueTypeName, symbol: k, string, code });
        this[k] = value;
        stringMap[string] = value;
        if (codeMap[code]) {
          throw new Error(`Enum codes must be unique! ${code} is already defined.`);
        }
        codeMap[code] = value;
        values.push(value);
      });
      // Values sorted by code increasing. Note: codes will never be equal due to
      // uniqueness precondition enforced above.
      values.sort((a, b) => a.code < b.code ? -1 : 1);
      Object.freeze(this);
    }

    type() {
      return typeName;
    }

    fromCode(c) {
      return codeMap[c];
    }

    fromString(s) {
      return stringMap[s];
    }

    values() {
      return values.slice(0);
    }

    static get name() {
      return typeName;
    }

  })();
};

export default makeEnum;
