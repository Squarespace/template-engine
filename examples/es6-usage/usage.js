/*
 * Run:
 *   npm install
 *   babel-node usage.js
 */

import { Compiler } from '@squarespace/template-engine';

const json = {
  items: [{name: 'First'}, {name: 'Second'}, {name: 'Third'}
]};

const source = '{.repeated section items}{name}\n{.end}';

// Create an instance of the compiler.
const compiler = new Compiler();

// Parse a template..
const { code } = compiler.parse(source);

// View the raw code.
console.log(code);

// Execute a compiled template
const { ctx } = compiler.execute({ code: code, json: json });
const output = ctx.render();
console.log(output);


// If everything worked you should see the following output:
//
//  [ 17, 1, [ [ 4, [Array], [Array], 3, [] ] ], 18 ]
//  First
//  Second
//  Third
