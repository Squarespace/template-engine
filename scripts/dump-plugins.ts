import { Formatters, Predicates } from '../src/plugins';
const names = [Formatters, Predicates]
    .reduce((p, c) => p.concat(Object.keys(c)), [] as string[])
    .sort();
console.log(JSON.stringify(names, undefined, '  '));
