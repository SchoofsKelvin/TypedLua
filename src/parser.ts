
import * as ls from './parserStructs';

type falsy = null | undefined | false | 0;
function assert<T>(condition: T | falsy, errorMessage?: string): T {
  if (!condition) throw new Error(errorMessage);
  return condition;
}

function stringFromMatch(match: RegExpExecArray | null) {
  return match ? match[0] : null;
}

const IS_PREFIX = ['Variable', 'Field', 'FunctionCall', 'FunctionSelfCall', 'Brackets'];

const ESCAPED: { [key: string]: undefined | string } = {
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
  protected lastExpression?: ls.Expression;
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
  public parse(): ls.MainChunk {
    const start: ls.Comment = this.lastExpression = {
      type: 'Comment', long: false, index: 0, text: '',
    };
    this.scope = new ls.Scope();
    const ch = this.chunk();
    assert(this.index === this.source.length, 'Unexpected symbol');
    return {
      ...ch,
      type: 'MainChunk',
      lines: this.charToLine,
      startComment: start.comment,
    };
  }
  public line(index: number = this.index): number {
    return this.charToLine.findIndex(v => v > index);
  }
  /* PARSER STUFF */
  protected regexp(pattern: string | RegExp): RegExp {
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
  protected actualTrim(): number {
    const reg = this.regexp(/\s+/);
    const mat = reg.exec(this.source);
    if (!mat) return this.index;
    return this.index += mat[0].length;
  }
  protected comment(): boolean {
    this.actualTrim();
    const mat = this.match(/--\[=*\[/, true);
    if (mat) {
      const start = this.line();
      const eq = '='.repeat(mat[0].length - 4);
      const [a, b] = assert(this.find(`]${eq}]`, true), `Unfinished long comment starting at line ${start}`);
      this.index = b + 1;
      if (this.lastExpression) {
        if (this.lastExpression.type !== 'Comment' || this.lastExpression.index !== mat.index) {
          // ^ Some code reverting (this.index=oldIndex) could result in a comment being parsed twice
          this.lastExpression = this.lastExpression.comment = {
            type: 'Comment',
            index: mat.index,
            long: true,
            text: this.source.substring(mat.index + mat[0].length, a),
          };
        }
      }
      return true;
    }
    if (this.string('--', true)) {
      const index = this.index - 2;
      const end = this.find('\n', true);
      if (!end) return false;
      this.index = end[1] + 1;
      if (this.lastExpression) {
        this.lastExpression = this.lastExpression.comment = {
          index,
          type: 'Comment',
          long: false,
          text: this.source.substring(index + 2, end[1]),
        };
      }
      return true;
    }
    return false;
  }
  protected trim(): number {
    while (this.comment());
    return this.actualTrim();
  }
  protected string(str: string, noTrim = false): string | null {
    const i = noTrim ? this.index : this.trim();
    if (this.source.startsWith(str, i)) {
      this.index = i + str.length;
      return str;
    }
    return null;
  }
  protected match(pat: string | RegExp, noTrim = false): RegExpExecArray | null {
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
  protected keyword(word?: string): ls.Keyword | null {
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
  /* SYNTAX PARSING */
  protected block(locals: string[] = []): [ls.Block, ls.Scope] {
    const scope = this.scope = this.scope!.createSubScope();
    scope.createVariables(locals);
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
      this.string(';');
      stats.push(this.lastExpression = { index, type: 'Break' });
    } else if (this.keyword('return')) {
      stats.push(this.lastExpression = {
        index,
        type: 'Return',
        expressions: this.expList() || [],
      });
      this.string(';');
    }
    this.currrentBlock = prev;
    this.scope = scope.parent;
    return [stats, scope];
  }
  protected chunk(locals?: string[]): ls.Chunk {
    const prev = this.currentChunk;
    const chunk = this.currentChunk = {} as ls.Chunk;
    const [block, scope] = this.block(locals);
    chunk.block = block;
    chunk.scope = scope;
    this.currentChunk = prev;
    return chunk;
  }
  /* MORE PRECISE SYNTAX PARSING */
  protected functionName(): ls.Variable | ls.Field | ls.Method {
    let index = this.trim();
    let name = assert(this.name(), 'Expected a name');
    const scope = this.scope as ls.Scope;
    const variable = scope.calculateVariable(name);
    let expr: ls.Variable | ls.Field | ls.Method = {
      index, variable,
      type: 'Variable',
      declaration: false,
    };
    this.lastExpression = expr;
    while (this.string('.')) {
      index = this.trim();
      name = assert(this.name(), 'Expected a name');
      expr = this.lastExpression = {
        index, name,
        type: 'Field',
        base: expr,
      };
    }
    if (this.string(':')) {
      index = this.trim();
      name = assert(this.name(), 'Expected a name');
      expr = this.lastExpression = {
        index, name,
        type: 'Method',
        base: expr,
      };
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
        const expressions = assert(this.expList(), 'Expected an expression');
        return this.lastExpression = {
          index, variables, expressions,
          type: 'Assignment',
        };
      }
      this.index = index;
      return null;
    }
    switch (keyword) {
      case ls.Keyword.do: {
        const [block] = this.block();
        const endIndex = this.trim();
        assert(this.keyword('end'), `Expected \`end\` to close \`do\` (line ${line})`);
        return this.lastExpression = { index, endIndex, block, type: 'Do' };
      }
      case ls.Keyword.while: {
        const condition = assert(this.expression(), 'Expected an expression');
        assert(this.keyword('do'), 'Expected `do`');
        const [block] = this.block();
        const endIndex = this.trim();
        assert(this.keyword('end'), `Expected \`end\` to close \`while\` (line ${line})`);
        return this.lastExpression = { index, endIndex, condition, block, type: 'While' };
      }
      case ls.Keyword.repeat: {
        const [block] = this.block();
        const untilIndex = this.trim();
        assert(this.keyword('until'), `Expected \`until\` to close \`repeat\` (line ${line})`);
        const condition = assert(this.expression(), 'Expected an expression');
        return this.lastExpression = { index, untilIndex, condition, block, type: 'Repeat' };
      }
      case ls.Keyword.if: {
        let expr = assert(this.expression(), 'Expected an expression');
        assert(this.keyword('then'), 'Expected `then`');
        const blocks: ls.IfBlock[] = [[expr, this.block()[0], index]];
        let elseIndex = this.trim();
        while (this.keyword('elseif')) {
          expr = assert(this.expression(), 'Expected an expression');
          this.lastExpression = expr;
          assert(this.keyword('then'), 'Expected `then`');
          blocks.push([expr, this.block()[0], elseIndex]);
          elseIndex = this.trim();
        }
        elseIndex = this.trim();
        const otherwise = this.keyword('else') ? this.block()[0] : undefined;
        const last = blocks.length === 1 ? 'if' : 'elseif';
        const endIndex = this.trim();
        assert(this.keyword('end'), `Expected \`end\` to close \`${last}\` (line ${line})`);
        return this.lastExpression = {
          index, blocks, otherwise,
          endIndex, elseIndex,
          type: 'If',
        };
      }
      case ls.Keyword.for: {
        const names = assert(this.nameList(), 'Expected a name');
        if (names.length === 1 && this.string('=')) {
          const v = assert(this.expression(), 'Expected an expression');
          assert(this.string(','), 'Expected a `,`');
          const limit = assert(this.expression(), 'Expected an expression');
          const step = this.string(',') ? assert(this.expression(), 'Expected an expression') : undefined;
          assert(this.keyword('do'), 'Expected `do`');
          const innerblock = this.block()[0];
          const endIndex = this.trim();
          assert(this.keyword('end'), `Expected \`end\` to close \`for\` (line ${line})`);
          return this.lastExpression = {
            index, limit, step, endIndex,
            type: 'NumericFor',
            block: innerblock,
            name: names[0],
            var: v,
          };
        }
        assert(this.keyword('in'), 'Expected `in`');
        const expressions = assert(this.expList(), 'Expected an expression');
        assert(this.keyword('do'), 'Expected `do`');
        const block = this.block(names)[0];
        const endIndex2 = this.trim();
        assert(this.keyword('end'), `Expected \`end\` to close \`for\` (line ${line})`);
        return this.lastExpression = {
          index, block, names, expressions,
          type: 'GenericFor',
          endIndex: endIndex2,
        };
      }
      case ls.Keyword.function: {
        const name = assert(this.functionName(), 'Expected a name');
        const func = this.funcBody();
        func.variable = name;
        if (name.type === 'Method') {
          func.chunk.scope.insertVariable('self', 0);
        }
        func.index = index;
        return this.lastExpression = func;
      }
      case ls.Keyword.local: {
        if (this.keyword('function')) {
          const name = assert(this.name(), 'Expected a name');
          const scope = this.scope!;
          const variable = scope.createVariable(name)
          const func = this.funcBody();
          func.index = index;
          func.variable = {
            index, variable,
            type: 'Variable',
            declaration: true,
          };
          return this.lastExpression = func;
        }
        const vars = assert(this.typedNameList(), 'Expected a name');
        const expressions = this.string('=') ?
          assert(this.expList(), 'Expected an expression') : [];
        const scope = this.scope!;
        const variables = scope.createVariables(vars.map(v => v[0])).map<ls.Variable>((variable, i) => ({
          index, variable,
          type: 'Variable',
          declaration: true,
          parsedTyping: vars[i][1] || undefined,
        }));
        return this.lastExpression = {
          index, variables, expressions,
          type: 'Assignment',
        };
      }
    }
    this.index = index;
    return null;
  }
  protected checkBinop(expr: ls.BinaryOp): ls.Expression {
    this.lastExpression = expr;
    const { right } = expr;
    /*
      FIRST or SECOND and THIRD
      OR(
        left: FIRST
        right: AND(
          left: SECOND
          right: THIRD
        )
      )
      --> OR.right = AND.left
      --> AND.left = OR
      --> replace OR with AND
    */
    if ('priority' in right) {
      if (right.priority < expr.priority) {
        if (right.type === 'BinaryOp') {
          expr.right = right.left;
          right.left = expr;
          expr = right;
        }
      }
    }
    return this.postExpression(expr);
  }
  protected postExpression(prev: ls.Expression): ls.Expression {
    this.lastExpression = prev;
    const index = this.trim();
    const binop = this.binop();
    const isPrefix = IS_PREFIX.includes(prev.type);
    if (binop) {
      const right = assert(this.expression(), 'Expected an expression');
      return this.checkBinop({
        index, right,
        type: 'BinaryOp',
        operation: binop,
        priority: ls.BINARY_OP_PRIORTY[binop],
        left: prev,
      });
    } else if (this.string('[')) {
      assert(isPrefix, 'Unexpected symbol `[`');
      const line = this.line();
      const expression = assert(this.expression(), 'Expected an expression');
      assert(this.string(']'), `Expected \`]\` to close \`[\` (line ${line})`);
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
    const lambda = this.lambda();
    if (lambda) return lambda;
    if (this.string('(', true)) {
      const expression = assert(this.expression(), 'Expected an expression');
      assert(this.string(')'), `Expected \`)\` to close \`(\` (line ${line})`);
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
    let exp: ls.Expression | null = this.table();
    if (exp) return this.lastExpression = exp;
    exp = this.number() || this.stringConstant();
    if (exp) return this.postExpression(exp);
    const name = this.name();
    if (name) {
      const scope = this.scope!;
      const variable = scope.calculateVariable(name);
      return this.postExpression({
        index, variable,
        type: 'Variable',
        declaration: false,
      });
    }
    this.index = index;
    return null;
  }
  protected varList(): (ls.Variable | ls.Field)[] | null {
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
    if (!value) return null;
    if (this.string('.', true)) {
      const n = assert(this.match(/\d+/, true), 'Malformed number');
      value = `${(value ? value[0] : '')}.${n}`;
    } else if (!value) {
      return null;
    }
    if (this.match(/[eE]/, true)) {
      const n = assert(this.match(/[-\+]?\d+/, true), 'Malformed number');
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
    const [a, b] = assert(this.find(`]${'='.repeat(eqs)}]`, true), 'Unfinished string');
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
      assert(this.string(']'), `Expected \`]\` to close \`[\` (line ${line})`);
      assert(this.string('='), 'Expected `=`');
      const value = assert(this.expression(), 'Expected an expression');
      return { key, value };
    }
    const index = this.trim();
    const name = this.name();
    if (name && this.string('=')) {
      const value = assert(this.expression(), 'Expected an expression');
      this.lastExpression = value;
      return { value, key: { index, type: 'Constant', value: name } };
    }
    this.index = index;
    const v = this.expression();
    if (v) this.lastExpression = v;
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
    assert(this.string('}'), `Expected \`}\` to close \`{\` (line ${line})`);
    return { index, content, type: 'Table' };
  }
  protected expList(): ls.Expression[] | null {
    const expr = this.expression();
    if (!expr) return null;
    this.lastExpression = expr;
    const res = [expr];
    while (this.string(',')) {
      res.push(this.lastExpression = assert(this.expression(), 'Unexpected `,`'));
    }
    return res;
  }
  protected args(): ls.Expression[] | null {
    const expr = this.stringConstant() || this.table();
    if (expr) return [this.lastExpression = expr];
    if (!this.string('(')) return null;
    const line = this.line();
    const res = this.expList();
    assert(this.string(')'), `Expected \`)\` to close \`(\` (line ${line})`);
    return res || [];
  }
  protected name(): string | null {
    const peek = this.peek(this.match, /[_a-zA-Z][_\w]*/);
    const match = peek[0];
    if (match && ls.Keyword[match[0] as any] === undefined) return match[0];
    this.index = peek[1];
    return null;
  }
  protected typedNameList(vararg = false): [string, ls.ParsedTyping | null][] | null {
    if (vararg && this.string('...')) {
      const typing = this.string(':') ? assert(this.typing(), 'Expected a typing') : null;
      return [['...', typing && { type: 'VARARG', subtype: typing }]];
    }
    let name = this.name();
    if (!name) return null;
    let typing = this.string(':') ? assert(this.typing(), 'Expected a typing') : null;
    const names: [string, ls.ParsedTyping | null][] = [[name, typing]];
    while (this.string(',')) {
      if (vararg && this.string('...')) {
        typing = this.string(':') ? assert(this.typing(), 'Expected a typing') : null;
        names.push(['...', typing && { type: 'VARARG', subtype: typing }]);
        break;
      }
      name = assert(this.name(), 'Expected a name');
      typing = this.string(':') ? assert(this.typing(), 'Expected a typing') : null;
      names.push([name, typing]);
    }
    return names;
  }
  protected nameList(vararg = false): string[] | null {
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
  protected parList(): ls.FunctionParameterName[] {
    const para: ls.FunctionParameterName = null!;
    const nameList = this.typedNameList(true);
    if (nameList) {
      return nameList.map<ls.FunctionParameterName>(v => ({
        name: v[0],
        parsedTyping: v[1] || undefined,
      }));
    }
    if (this.string('...')) {
      let parsedTyping = this.string(':') ? assert(this.typing(), 'Expected a typing') : undefined;
      parsedTyping = parsedTyping && { type: 'VARARG', subtype: parsedTyping };
      return [{ parsedTyping, name: '...' }];
    }
    return [];
  }
  protected lambda(): ls.FunctionExpr | null {
    let index = this.index;
    let params!: ls.FunctionParameterName[];
    if (this.string('(')) {
      const argList = this.typedNameList(true) || [];
      params = argList.map<ls.FunctionParameterName>(v => ({
        name: v[0],
        parsedTyping: v[1] || undefined,
      }));
      if (!this.string(')')) {
        this.index = index;
        return null;
      }
    } else {
      const name = this.name();
      if (name) params = [{ name }];
    }
    if (!params || !this.string('=>')) {
      this.index = index;
      return null;
    }
    const [parameterNames, parsedVarargTyping] = this.splitVararg(params);
    const paramNames = parameterNames.map(p => p.name);
    if (this.string('{')) {
      const line = this.line();
      const chunk = this.chunk(paramNames);
      const endIndex = this.trim();
      assert(this.string('}'), `Expected \`}\` for lambda (line ${line})`);
      const parameters = parameterNames.map<ls.FunctionParameter>((param) => ({
        ...param,
        variable: chunk.scope.getVariable(param.name)!,
      }));
      return {
        index, chunk, parameters, endIndex,
        parsedVarargTyping: parsedVarargTyping || undefined,
        type: 'Function',
        local: false,
      };
    } else if (this.keyword('do')) {
      const line = this.line();
      const chunk = this.chunk(paramNames);
      const endIndex = this.trim();
      assert(this.keyword('end'), `Expected \`end\` for lambda (line ${line})`);
      const parameters = parameterNames.map<ls.FunctionParameter>((param) => ({
        ...param,
        variable: chunk.scope.getVariable(param.name)!,
      }));
      return {
        index, chunk, parameters, endIndex,
        parsedVarargTyping: parsedVarargTyping || undefined,
        type: 'Function',
        local: false,
      };
    }
    index = this.index;
    const brackets = this.string('(');
    const scope = this.scope = this.scope!.createSubScope();
    scope.createVariables(paramNames);
    let block = assert(this.expList() || (brackets ? [] : null), 'Expected an expression');
    this.scope = scope.parent;
    assert(!brackets || this.string(')'), 'Expected `)`');
    block = block.length ? [{
      index,
      type: 'Return',
      expressions: block,
    }] : [];
    const parameters = parameterNames.map<ls.FunctionParameter>((param) => ({
      ...param,
      variable: scope.getVariable(param.name)!,
    }));
    return {
      index, parameters,
      parsedVarargTyping: parsedVarargTyping || undefined,
      endIndex: index,
      type: 'Function',
      local: false,
      chunk: { block, scope },
    };
  }
  protected splitVararg(params: ls.FunctionParameterName[]): [ls.FunctionParameterName[], ls.ParsedTypingVararg | null] {
    params = params.slice(0);
    const last = params.pop();
    if (!last) return [params, null];
    if (last.name.endsWith('...')) {
      if (last.parsedTyping) {
        if (last.parsedTyping.type !== 'VARARG') {
          throw new Error('This should not happen?');
        }
        /*if (last.parsedTyping.type === 'VARARG') {
          return [params, { type: 'VARARG', subtype: last.parsedTyping.subtype }];
        }
        return [params, { type: 'VARARG', subtype: last.parsedTyping }];*/
        return [params, last.parsedTyping];
      }
    } else {
      params.push(last);
    }
    return [params, null];
  }
  protected funcBody(): ls.FunctionExpr {
    const index = this.index;
    assert(this.string('('), 'Expected `(`');
    const params = this.parList();
    const [parameterNames, parsedVarargTyping] = this.splitVararg(params);
    assert(this.string(')'), 'Expected `)`');
    const parsedReturnTyping = this.string(':') && this.typeTuple() || undefined;
    const line = this.line();
    const chunk = this.chunk(parameterNames.map(p => p.name));
    const endIndex = this.trim();
    assert(this.keyword('end'), `Expected \`end\` for function (line ${line})`);
    const parameters = parameterNames.map<ls.FunctionParameter>((param) => ({
      ...param,
      variable: chunk.scope.getVariable(param.name)!,
    }));
    return {
      index, chunk, parameters, endIndex, parsedReturnTyping,
      parsedVarargTyping: parsedVarargTyping || undefined,
      type: 'Function',
      local: false,
    };
  }
  protected constant(): ls.Constant | null {
    const index = this.index;
    const constant = this.number() || this.stringConstant();
    if (constant) return constant;
    const keyword = this.keyword();
    switch (keyword) {
      case ls.Keyword.nil:
        return { index, type: 'Constant', value: null };
      case ls.Keyword.true:
        return { index, type: 'Constant', value: true };
      case ls.Keyword.false: {
        return { index, type: 'Constant', value: false };
      }
    }
    return null;
  }
  protected typeList(): ls.ParsedTyping[] | null {
    const typing = this.typing();
    if (!typing) return null;
    const typings = [typing];
    while (this.string(',')) {
      typings.push(assert(this.typing(), 'Expected a name'));
    }
    return typings;
  }
  protected typeTuple(allowBrackets = true): ls.ParsedTypingTuple | null {
    const index = this.index;
    const bracket = allowBrackets && this.string('(');
    if (bracket && this.string(')')) return { type: 'TUPLE', types: [] };
    const types = this.typeList();
    if (!types) {
      this.index = index;
      return null;
    }
    assert(!bracket || this.string(')'), 'Expected `)`');
    return { types, type: 'TUPLE' };
  }
  protected lambdaTyping(): ls.ParsedTypingFunction | null {
    const index = this.index;
    let parameters!: ls.FunctionParameterName[];
    if (this.string('(')) {
      const argList = this.typedNameList(true) || [];
      parameters = argList.map<ls.FunctionParameterName>(v => ({
        name: v[0],
        parsedTyping: v[1] || undefined,
      }));
      if (!this.string(')')) {
        this.index = index;
        return null;
      }
    } else {
      const name = this.name();
      if (name) parameters = [{ name }];
    }
    if (!parameters || !this.string('=>')) {
      this.index = index;
      return null;
    }
    const returnTypes = assert(this.typeTuple(), 'Expected a typing');
    return { parameters, returnTypes, type: 'FUNCTION' };
  }
  protected typing(): ls.ParsedTyping | null {
    const index = this.index;
    const line = this.line();
    let typing: ls.ParsedTyping | null = null;
    while (true) {
      if (typing) {
        const binop = this.string('&') || this.string('|');
        if (binop) {
          const right = assert(this.typing(), `Expected a typing`);
          if (binop === '|' && right.type === 'AND') {
            right.left = { type: 'OR', left: typing, right: right.left };
            return right;
          }
          return { right, type: binop === '|' ? 'OR' : 'AND', left: typing };
        } else {
          break;
        }
      } else {
        const lambda = this.lambdaTyping();
        if (lambda) {
          typing = lambda;
        } else if (this.string('(')) {
          typing = this.typing();
          assert(this.string(')'), 'Expected `)`');
          return typing;
        } else {
          const constant = this.constant();
          const name = constant ? null : this.name();
          if (constant) {
            typing = { type: 'CONSTANT', value: constant.value };
          } else if (name) {
            typing = { name, type: 'NAME' };
          } else {
            break;
          }
        }
      }
      while (this.match(/\[\s*\]/)) {
        typing = { type: 'ARRAY', subtype: typing };
      }
    }
    return typing;
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
