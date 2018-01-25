
import fs from 'fs';
import { join } from 'path';
import { deepMerge } from '../src/util';
import recommended from '@sqs/eslint-config-squarespace/rules/recommended';
import vanilla from '@sqs/eslint-config-squarespace/rules/vanilla';
import imports from '@sqs/eslint-config-squarespace/rules/imports';

// Script to merge private eslint config rules into this project.

const rcpath = join(__dirname, '..', '.eslintrc');
const eslintrc = JSON.parse(fs.readFileSync(rcpath, { encoding: 'utf-8' }));

const locals = {
	"jest/no-identical-title": "error",
	"jest/valid-expect": "error"
};

const rules = deepMerge({}, recommended.rules, vanilla.rules, imports.rules, locals);

eslintrc.rules = rules;
console.log(JSON.stringify(eslintrc, null, '  '));

