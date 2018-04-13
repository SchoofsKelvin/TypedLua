
import * as fs from 'fs';

import Parser from './parser';
import Unparser from './unparser';

const source = fs.readFileSync('input.lua', 'utf-8');

const parser = new Parser(source);

try {
  const idk = parser.parse();
  console.log(idk);
  const unparser = new Unparser(idk);
  const uhu = unparser.unparse();
  fs.writeFileSync('output.lua', uhu, 'utf-8');
  console.log('Output written to output.lua');
} catch (e) {
  console.log(parser.line());
  throw e;
}
