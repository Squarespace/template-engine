/*
 * Run:
 *   npm install
 *   node usage.js
 */

const engine = require('@squarespace/template-engine');

const json = {
  items: [{name: 'First'}, {name: 'Second'}, {name: 'Third'}
]};

const source = '{.repeated section items}{name}\n{.end}';

// Create an instance of the compiler.
const compiler = new engine.Compiler();

// Parse a template..
const parsed = compiler.parse(source);

// View the raw code.
const code = parsed.code;
console.log(JSON.stringify(code));

// Execute a compiled template
const result = compiler.execute({ code: code, json: json });
const output = result.ctx.render();
console.log(output);

// If everything worked you should see the following output:
//
//  [17,1,[[4,["items"],[[1,[["name"]],0],[0,"\n"]],3,[]]],18]
//  First
//  Second
//  Third
