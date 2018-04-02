
import * as util from 'util';

import * as ls from './structs';

type falsy = null | undefined | false | 0;
function assert<T>(condition: T | falsy, errorMessage?: string): T {
  if (!condition) throw new Error(errorMessage);
  return condition;
}

function stringFromMatch(match: RegExpExecArray | null) {
  return match ? match[0] : null;
}

const IS_PREFIX = ['Variable', 'Field', 'FunctionCall', 'FunctionSelfCall', 'Brackets'];

const ESCAPED: {[key: string]: undefined | string} = {
  a: '\a',
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t',
  v: '\v',
  ['\r']: '\n',
  ['\\']: '\\\\',
};

export class Parser {
  protected charToLine = [0];
  protected index = 0;
  protected scope?: ls.Scope;
  protected currrentBlock?: ls.Block;
  protected currentChunk?: ls.Chunk;
  constructor(protected source: string) {
    source = source.replace(/\r/, '');
    let charIndex = 0;
    for (const char of source) {
      if (char === '\n') {
        this.charToLine.push(charIndex);
      }
      charIndex += 1;
    }
    this.charToLine.push(charIndex);
  }
  /* PUBLIC METHODS */
  public parse() {
    const ch = this.chunk();
    assert(this.index === this.source.length, 'Unexpected symbol');
    return ch;
  }
  public line(index: number = this.index) {
    return this.charToLine.findIndex(v => v > index);
  }
  /* PARSER STUFF */
  protected regexp(pattern: string | RegExp) {
    const reg = new RegExp(pattern as RegExp, 'my');
    reg.lastIndex = this.index;
    return reg;
  }
  protected peekOLD<T>(method: (...args: any[]) => T, ...args: any[]): [T, number] {
    const old = this.index;
    return [method.apply(this, args), old];
  }
  protected peek<T>(m: () => T): [T, number];
  protected peek<T, A>(m: (a: A) => T, a: A): [T, number];
  protected peek<T, A, B>(m: (a: A, b: B) => T, a: A, b: B): [T, number];
  protected peek<T, A, B, C>(m: (a: A, b: B, c: C) => T, a: A, b: B, c: C): [T, number];
  protected peek<T>(method: (...args: any[]) => T, ...args: any[]): [T, number] {
    const old = this.index;
    return [method.apply(this, args), old];
  }
  protected actualTrim() {
    const reg = this.regexp(/\s+/);
    const mat = reg.exec(this.source);
    if (!mat) return this.index;
    return this.index += mat[0].length;
  }
  protected comment() {
    this.actualTrim();
    const mat = this.match(/--\[=*\[/, true);
    if (mat) {
      const start = this.line();
      const eq = '='.repeat(mat[0].length - 4);
      const [a,b] = assert(this.find(`]${eq}]`, true), `Unfinished long comment starting at line ${start}`);
      this.index = b + 1;
      return true;
    }
    if (this.string('--', true)) {
      const end = this.find('\n', true);
      if (!end) return false;
      this.index = end[1] + 1;
      return true;
    }
  }
  protected trim() {
    while (this.comment());
    return this.actualTrim();
  }
  protected string(str: string, noTrim = false) {
    const i = noTrim ? this.index : this.trim();
    if (this.source.startsWith(str, i)) {
      this.index = i + str.length;
      return str;
    }
    return null;
  }
  protected match(pat: string | RegExp, noTrim = false) {
    const reg = new RegExp(pat as RegExp, 'my');
    reg.lastIndex = noTrim ? this.index : this.trim();
    const mat = reg.exec(this.source);
    if (!mat) return null;
    this.index = mat.index + mat[0].length;
    return mat;
  }
  protected find(pat: string | RegExp, plain = false): [number, number] | null {
    if (plain) {
      const start = this.source.indexOf(pat as string, this.index);
      return start ? [start, start + (pat as string).length - 1] : null;
    }
    const reg = new RegExp(pat as RegExp, 'mg');
    reg.lastIndex = this.index;
    const mat = reg.exec(this.source);
    if (!mat) return null;
    return [mat.index, mat.index + mat[0].length - 1];
  }
  protected keyword(word?: string) {
    const peek = this.peek(this.match, /\w+/);
    const match = peek[0];
    if (match) {
      const keyword = match[0];
      const enu = ls.Keyword[keyword as any];
      if (enu !== undefined) {
        if (!word) return enu as any as ls.Keyword;
        if (word === keyword) return enu as any as ls.Keyword;
      }
    }
    this.index = peek[1];
    return null;
  }
  /* ERROR HANDLING */
  protected assert(condition: any, errorMessage: string, ...args: any[]) {
    if (!condition) throw new Error(util.format(errorMessage, ...args));
  }
  /* SYNTAX PARSING */
  protected block(): [ls.Block, ls.Scope] {
    const scope: ls.Scope = this.scope = {
      parent: this.scope,
      locals: [],
      upvalues: [],
    };
    const prev = this.currrentBlock;
    const stats: ls.Expression[] = this.currrentBlock = [];
    let stat = this.stat();
    while (stat) {
      stats.push(stat);
      this.string(';');
      // if (last) break;
      stat = this.stat();
    }
    const index = this.trim();
    if (this.keyword('break')) {
      stats.push({ index, type: 'Break' } as ls.Break);
    } else if (this.keyword('return')) {
      stats.push({
        index,
        type: 'Return',
        expressions: this.expList() || [],
      } as ls.Return);
    }
    this.currrentBlock = prev;
    this.scope = scope.parent;
    return [stats, scope];
  }
  protected chunk() {
    const prev = this.currentChunk;
    const chunk = this.currentChunk = {} as ls.Chunk;
    const [block, scope] = this.block();
    chunk.block = block;
    chunk.scope = scope;
    this.currentChunk = prev;
    return chunk;
  }
  /* MORE PRECISE SYNTAX PARSING */
  protected functionName() {
    let index = this.trim();
    let name = this.name();
    assert(name, 'Expected a name');
    const scope = this.scope as ls.Scope;
    let expr: ls.Variable | ls.Field | ls.Method = {
      index, name, scope,
      type: 'Variable',
      scopePosition: scope.locals.length,
    } as ls.Variable;
    while (this.string('.')) {
      index = this.trim();
      name = this.name();
      assert(name, 'Expected a name');
      expr = {
        index, name,
        type: 'Field',
        base: expr,
      } as ls.Field;
    }
    if (this.string(':')) {
      index = this.trim();
      name = this.name();
      assert(name, 'Expected a name');
      expr = {
        index, name,
        type: 'Method',
        base: expr,
      } as ls.Method;
    }
    return expr;
  }
  protected stat(): ls.Expression | null {
    const index = this.trim();
    const keyword = this.keyword();
    const line = this.line();
    if (!keyword) {
      this.index = index;
      const [expr] = this.peek(this.expression);
      if (expr && (expr.type === 'FunctionCall' || expr.type === 'FunctionSelfCall')) {
        return expr;
      }
      this.index = index;
      const variables = this.varList();
      if (variables) {
        assert(this.string('='), 'Expected `=`');
        const expressions = this.expList();
        assert(this.expression, 'Expected an expression');
        return {
          index, variables, expressions,
          type: 'Assignment',
        } as ls.Assignment;
      }
      this.index = index;
      return null;
    }
    switch (keyword as ls.Keyword) {
      case ls.Keyword.do: {
        const [block] = this.block();
        assert(this.keyword('end'),`Expected \`end\` to close \`do\` (line ${line})`);
        return { index, block, type: 'Do' } as ls.Do;
      }
      case ls.Keyword.while: {
        const condition = this.expression();
        assert(this.keyword('do'), 'Expected `do`');
        const [block] = this.block();
        assert(this.keyword('end'),`Expected \`end\` to close \`while\` (line ${line})`);
        return { index, condition, block, type: 'While' } as ls.While;
      }
      case ls.Keyword.repeat: {
        const [block] = this.block();
        assert(this.keyword('end'),`Expected \`until\` to close \`repeat\` (line ${line})`);
        const condition = this.expression();
        return { index, condition, block, type: 'Repeat' } as ls.Repeat;
      }
      case ls.Keyword.if: {
        let expr = assert(this.expression(), 'Expected an expression');
        assert(this.keyword('then'), 'Expected `then`');
        const blocks: [ls.Expression, ls.Block][] = [[expr, this.block()[0]]];
        while (this.keyword('elseif')) {
          expr = assert(this.expression(), 'Expected an expression');
          assert(this.keyword('then'), 'Expected `then`');
          blocks.push([expr, this.block()[0]]);
        }
        const otherwise = this.keyword('else') && this.block()[0];
        const last = blocks.length === 1 ? 'if' : 'elseif';
        assert(this.keyword('end'),`Expected \`end\` to close \`${last}\` (line ${line})`);
        return { index, blocks, otherwise, type: 'If' } as ls.If;
      }
      case ls.Keyword.for: {
        const names = assert(this.nameList(), 'Expected a name');
        if (names.length === 1 && this.string('=')) {
          const v = assert(this.expression(), 'Expected an expression');
          assert(this.string(','), 'Expected a `,`');
          const limit = assert(this.expression(), 'Expected an expression');
          const step = this.string(',') && assert(this.expression(), 'Expected an expression');
          assert(this.keyword('do'), 'Expected `do`');
          const innerblock = this.block()[0];
          assert(this.keyword('end'),`Expected \`end\` to close \`for\` (line ${line})`);
          return {
            index, limit, step,
            type: 'NumericFor',
            block: innerblock,
            name: names[0],
            var: v,
          } as ls.NumericFor;
        }
        assert(this.keyword('in'), 'Expected `in`');
        const expressions = assert(this.expList(), 'Expected an expression');
        assert(this.keyword('do'), 'Expected `do`');
        const block = this.block()[0];
        assert(this.keyword('end'),`Expected \`end\` to close \`for\` (line ${line})`);
        return {
          index, block, names, expressions,
          type: 'GenericFor',
        } as ls.GenericFor;
      }
      case ls.Keyword.function: {
        const name = assert(this.functionName(), 'Expected a name');
        const func = this.funcBody();
        func.variable = name;
        if (name.type === 'Method') {
          func.chunk.scope.locals.unshift('self');
        }
        func.index = index;
        return func;
      }
      case ls.Keyword.local: {
        if (this.keyword('function')) {
          const name = assert(this.name(), 'Expected a name');
          const locals = (this.scope as ls.Scope).locals;
          locals.push(name);
          const func = this.funcBody();
          func.index = index;
          func.variable = {
            index, name,
            type: 'Variable',
            scope: this.scope,
            scopePosition: locals.length,
          } as ls.Variable;
          return func;
        }
        const vars = assert(this.nameList(), 'Expected a name');
        const expressions = this.string('=') ?
          assert(this.expList(), 'Expected an expression') : [];
        const scope = this.scope as ls.Scope;
        const locStart = scope.locals.length;
        scope.locals = [...scope.locals, ...vars];
        const variables = vars.map((v, k) => ({
          index, scope,
          type: 'Variable',
          scopePosition: locStart + k,
        } as ls.Variable));
        return {
          index, variables, expressions,
          type: 'Assignment',
          locals: true,
        } as ls.Assignment;
      }
    }
    this.index = index;
    return null;
  }
  protected checkBinop(expr: ls.BinaryOp) {
    const left = expr.left as ls.UnaryOp | ls.BinaryOp;
    if (left.priority) {
      if (left.priority < expr.priority) {
        // TODO
      }
    }
    return this.postExpression(expr);
  }
  protected postExpression(prev: ls.Expression): ls.Expression {
    const index = this.trim();
    const binop = this.binop();
    const isPrefix = IS_PREFIX.includes(prev.type);
    if (binop) {
      const right = assert(this.expression(), 'Expected an expression');
      return this.checkBinop({
        index, right,
        type: 'BinaryOp',
        operation: binop,
        priority: ls.BINARY_OP_PRIORTY[binop] as number,
        left: prev,
      });
    } else if (this.string('[')) {
      assert(isPrefix, 'Unexpected symbol `[`');
      const line = this.line();
      const expression = assert(this.expression(), 'Expected an expression');
      assert(this.string(']'),`Expected \`]\` to close \`[\` (line ${line})`);
      return this.postExpression({
        index, expression,
        type: 'Field',
        base: prev,
      });
    } else if (this.string('.')) {
      assert(isPrefix, 'Unexpected symbol `.`');
      const name = assert(this.name(), 'Expected a name');
      return this.postExpression({
        index, name,
        type: 'Field',
        base: prev,
      });
    } else if (this.string(':')) {
      assert(isPrefix, 'Unexpected symbol `:`');
      const name = assert(this.name(), 'Expected a name');
      return this.postExpression({
        index, name,
        type: 'Method',
        base: prev,
      });
    }
    const args = this.args();
    if (args) {
      if (prev.type === 'Method') {
        return this.postExpression({
          index,
          type: 'FunctionSelfCall',
          arguments: args,
          name: prev.name,
          base: prev.base,
        });
      }
      assert(isPrefix, 'Unexpected symbol');
      return this.postExpression({
        index,
        type: 'FunctionCall',
        target: prev,
        arguments: args,
      });
    }
    return prev;
  }
  protected expression(): ls.Expression | null {
    const index = this.trim();
    const line = this.line();
    if (this.string('(', true)) {
      const expression = assert(this.expression(), 'Expected an expression');
      assert(this.string(')'),`Expected \`)\` to close \`(\` (line ${line})`);
      return this.postExpression({
        index, expression,
        type: 'Brackets',
      });
    } else if (this.string('...', true)) {
      return this.postExpression({ index, type: 'Vararg' });
    } else if (this.keyword('function')) {
      return this.postExpression(this.funcBody());
    }
    let [op]: any = this.peek(this.match, /[-#]/, true);
    op = op || this.keyword('not');
    if (op) {
      const expression = assert(this.expression(), 'Expected an expression');
      return this.postExpression({
        index, expression,
        type: 'UnaryOp',
        operation: op[0] as ls.UnaryOperation,
        priority: 2,
      });
    }
    this.index = index;
    const keyword = this.keyword();
    switch (keyword) {
      case ls.Keyword.nil:
        return this.postExpression({ index, type: 'Constant', value: null });
      case ls.Keyword.true:
        return this.postExpression({ index, type: 'Constant', value: true });
      case ls.Keyword.false: {
        return this.postExpression({ index, type: 'Constant', value: false });
      }
    }
    this.index = index;
    const exp = this.number() || this.stringConstant() || this.table();
    if (exp) return this.postExpression(exp);
    const [name] = this.peek(this.name);
    if (name) {
      const scope = this.scope as ls.Scope;
      return this.postExpression({
        index, name, scope,
        type: 'Variable',
        scopePosition: scope.locals.length,
      });
    }
    this.index = index;
    return null;
  }
  protected varList() {
    const index = this.trim();
    const v = this.expression();
    if (!v || v.type !== 'Field' && v.type !== 'Variable') {
      this.index = index;
      return null;
    }
    const vars = [v];
    while (this.string(',')) {
      const va = assert(this.expression(), 'Expected a variable/field');
      assert(va.type === 'Field' || va.type === 'Variable', 'Expected a variable/field');
      vars.push(va as ls.Variable | ls.Field);
    }
    return vars;
  }
  protected number(): ls.Constant | null {
    const index = this.trim();
    if (this.string('0x', true)) {
      const m = assert(this.match(/\w+/), 'Malformed number');
      const v = assert(parseInt(m[0], 16), 'Malformed number');
      return { index, type: 'Constant', value: v };
    }
    let value = stringFromMatch(this.match(/\d+/, true));
    if (this.string('.', true)) {
      const n = assert(this.match(/\d+/,true), 'Malformed number');
      value = `${(value ? value[0] : '')}.${n}`;
    } else if (!value) {
      return null;
    }
    if (this.match(/[eE]/, true)) {
      const n = assert(this.match(/[-\+]?\d+/,true), 'Malformed number');
      value = `${value}e${n}`;
    }
    return { index, type: 'Constant', value: parseInt(value, 10) };
  }
  protected stringConstant(): ls.Constant | null {
    this.trim();
    let q = stringFromMatch(this.match(/['"]/, true));
    if (q) {
      const [p, str] = [this.index, this.source];
      let [esc, value] = [false, ''];
      for (let i = p; i < str.length; i += 1) {
        const c = str[i];
        if (esc) {
          esc = false;
          const n = stringFromMatch(this.match(/\d{1,3}/, true));
          if (n) {
            const nn = parseInt(n, 10);
            assert(nn < 256, 'Escape sequence too large');
            value += String.fromCharCode(nn);
          }
          value += ESCAPED[c] || c;
        } else if (c === '\\') {
          esc = true;
        } else if (c === q) {
          this.index = i + 1;
          return { value, type: 'Constant', index: p - 1 };
        } else {
          value += c;
        }
      }
      throw new Error('Unfinished string');
    }
    q = stringFromMatch(this.match(/\[=*\[/, true));
    if (!q) return null;
    const eqs = q.length - 2;
    const pos = this.index;
    const [a,b] = assert(this.find(`]${'='.repeat(eqs)}]`, true), 'Unfinished string');
    this.index = b + 1;
    return {
      type: 'Constant',
      index: pos - eqs - 2,
      value: this.source.substring(pos, a),
    };
  }
  protected binop(): ls.BinaryOperation | null {
    const kw = this.keyword('or') || this.keyword('and');
    if (kw === ls.Keyword.or) return 'or';
    if (kw === ls.Keyword.and) return 'and';
    for (const op in ls.BINARY_OP_PRIORTY) {
      if (this.string(op)) return op as ls.BinaryOperation;
    }
    return null;
  }
  protected tableEntry(): ls.TableEntry | null {
    if (this.string('[')) {
      const line = this.line();
      const key = assert(this.expression(), 'Expected an expression');
      assert(this.string(']'),`Expected \`]\` to close \`[\` (line ${line})`);
      assert(this.string('='), 'Expected `=`');
      const value = assert(this.expression(), 'Expected an expression');
      return { key, value };
    }
    const index = this.trim();
    const name = this.name();
    if (name && this.string('=')) {
      const value = assert(this.expression(), 'Expected an expression');
      return { value, key: { index, type: 'Constant', value: name } };
    }
    this.index = index;
    const v = this.expression();
    return v ? { value: v } : null;
  }
  protected table(): ls.Table | null {
    const index = this.trim();
    if (!this.string('{', true)) return null;
    const line = this.line();
    const content: ls.TableEntry[] = [];
    let [sep, entry] = [true, this.tableEntry()];
    while (entry) {
      assert(sep, 'Expected `,` or `;`');
      content.push(entry);
      sep = !!this.match(/[,;]/);
      entry = this.tableEntry();
    }
    assert(this.string('}'),`Expected \`}\` to close \`{\` (line ${line})`);
    return { index, content, type: 'Table' };
  }
  protected expList(): ls.Expression[] | null {
    const expr = this.expression();
    if (!expr) return null;
    const res = [expr];
    while (this.string(',')) {
      res.push(assert(this.expression(), 'Unexpected `,`'));
    }
    return res;
  }
  protected args(): ls.Expression[] | null {
    const expr = this.stringConstant() || this.table();
    if (expr) return [expr];
    if (!this.string('(')) return null;
    const line = this.line();
    const res = this.expList();
    assert(this.string(')'),`Expected \`)\` to close \`(\` (line ${line})`);
    return res || [];
  }
  protected name() {
    const peek = this.peek(this.match, /[_a-zA-Z][_\w]*/);
    const match = peek[0];
    if (match && ls.Keyword[match[0] as any] === undefined) return match[0];
    this.index = peek[1];
    return null;
  }
  protected nameList(vararg = false) {
    let name = this.name();
    if (!name) return null;
    const names = [name];
    while (this.string(',')) {
      if (vararg && this.string('...')) {
        names.push('...');
        break;
      }
      name = assert(this.name(), 'Expected a name');
      names.push(name);
    }
    return names;
  }
  protected parList() {
    const nameList = this.nameList(true);
    if (nameList) {
      if (this.string(',')) {
        assert(this.string('...'), 'Expected `...`');
        nameList.push('...');
      }
      return nameList;
    }
    return this.string('...') ? ['...'] : [];
  }
  protected funcBody(): ls.FunctionExpr {
    const index = this.index;
    assert(this.string('('), 'Expected `(`');
    const parameters = this.parList();
    assert(this.string(')'), 'Expected `)`');
    const line = this.line();
    const chunk = this.chunk();
    assert(this.keyword('end'),`Expected \`end\` for function (line ${line})`);
    return {
      index, chunk, parameters,
      type: 'Function',
      local: false,
    };
  }
}

/*
const source = 'abc def';
for (let i = 0; i < source.length; i += 1) {
  const reg = /\s+/y;
  reg.lastIndex = i;
  const res = reg.exec(source);
  console.log(i, res, reg);
  if (i === 3) debugger;
}
*/

export default Parser;
