
import * as fs from 'fs';

import Parser from './parser';

const source = fs.readFileSync('input.lua', 'utf-8');

const parser = new Parser(source);

try {
  const idk = parser.parse();
  console.log(idk);
} catch (e) {
  console.log(parser.line());
  throw e;
}
