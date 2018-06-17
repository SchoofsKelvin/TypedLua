
import * as fs from 'fs';

import { AnalyzingWalker } from './analyzer';
import Parser from './parser';
import Unparser from './unparser';

/*
try { // Lua 5.1
  const source = fs.readFileSync('input.lua', 'utf-8');
  const parser = new Parser(source);
  const idk = parser.parse();
  console.log(idk);
  const unparser = new Unparser(idk);
  const uhu = unparser.unparse();
  fs.writeFileSync('output.lua', uhu, 'utf-8');
  console.log('Output written to output.lua');
} catch (e) { console.error(e); }
*/

try { // Typed Lua 5.1
  const source = fs.readFileSync('input.typed.lua', 'utf-8');
  const parser = new Parser(source);
  const idk = parser.parse();
  console.log(idk);
  const analyzer = new AnalyzingWalker();
  analyzer.analyzeMainChunk(idk);
  const diags = analyzer.getDiagnostics();
  diags.forEach(d => console.error(`${d.code} (line ${parser.line(d.index)}) ${d.message || ''}`));
  const unparser = new Unparser(idk);
  const uhu = unparser.unparse();
  fs.writeFileSync('output.typed.lua', uhu, 'utf-8');
  console.log('Output written to output.typed.lua');
} catch (e) { console.error(e); }
