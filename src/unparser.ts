
import * as ls from './parserStructs';

function declaresLocal(expr: ls.Expression | null | undefined) {
  if (!expr) return false;
  if (expr.type !== 'Variable') return false;
  return expr.declaration && expr.variable.local;
}

function longStringThing(str: string, amount: number) {
  if (str.includes(`[${'='.repeat(amount)}[`)) return true;
  if (str.includes(`]${'='.repeat(amount)}]`)) return true;
  if (str.endsWith(']') && amount == 0) return true;
  return str.includes(`]${'='.repeat(amount)}]`);
}

function replace(str: string, search: string, replacement: string) {
  let res = str.replace(search, replacement);
  while (str !== res) {
    str = res;
    res = str.replace(search, replacement);
  }
  return res;
}

const ESCAPE_FUNC = (s: string) => `\\${s.charCodeAt(0)}`;
function escapeString(str: string, quote: string) {
  return replace(str, quote, `\\${quote}`)
    .replace(/\n/g,'\\n').replace(/\t/g,'\\t')
    .replace(/[^\w_\-+* \t/\\[\](){}#'"´`~:;,.?$^£%¨°!@&|]/g, ESCAPE_FUNC);
}

export class Unparser {
  protected indent = 0;
  protected currentLine = '';
  protected lines: string[] = [];
  constructor(protected chunk: ls.MainChunk) {
  }
  /* PUBLIC METHODS */
  public unparse(): string {
    this.unparseComment(this.chunk.startComment);
    this.indent = -1;
    this.unparseExpressions(this.chunk.block);
    this.indent = 0;
    this.nextLine();
    return this.lines.join('\n');
  }
  public line(index: number): number {
    return this.chunk.lines.findIndex(v => v > index);
  }
  /* UNPARSING STUFF */
  protected nextLine(): void {
    this.lines.push(this.currentLine);
    this.currentLine = '\t'.repeat(this.indent);
  }
  protected append(str: string): void {
    const lines = str.split('\n');
    this.currentLine += lines[0];
    for (let i = 1; i < lines.length; i += 1) {
      this.nextLine();
      this.currentLine += lines[i];
    }
  }
  protected ensureLine(line: number): void {
    line -= 1;
    while (this.lines.length < line) this.nextLine();
  }
  protected unparseExpressions(exprs: ls.Expression[], comas = false): void {
    this.indent += 1;
    if (comas) {
      exprs.forEach((expr, index) => {
        if (index) this.currentLine += ', ';
        this.unparseExpression(expr);
      });
    } else {
      exprs.forEach(this.unparseExpression, this);
    }
    this.indent -= 1;
  }
  protected safeAppend(str: string): void {
    if (this.currentLine.match(/(\w|\.\.)$/)) {
      str = ' ' + str;
    }
    this.currentLine += str;
  }
  protected unparseComment(expr?: ls.Comment): void {
    while (expr) {
      this.ensureLine(this.line(expr.index));
      const text = expr.text.replace(/\r$/, '');
      let amount = 0;
      while (longStringThing(text, amount)) amount += 1;
      const eq = '='.repeat(amount);
      this.append(`--[${eq}[${text}]${eq}]`);
      expr = expr.comment;
    }
  }
  protected unparseExpression(expr: ls.Expression): void {
    this.unparseExpressionForReal(expr);
    if ('typing' in expr && expr.typing) {
      const text = expr.typing.typing.toString().replace(/\r$/, '');
      let amount = 0;
      while (longStringThing(text, amount)) amount += 1;
      const eq = '='.repeat(amount);
      this.append(`--[${eq}[${text}]${eq}]`);
    }
    this.unparseComment(expr.comment);
  }
  protected unparseExpressionForReal(expr: ls.Expression): void {
    this.ensureLine(this.line(expr.index));
    switch (expr.type) {
      case 'Vararg':
        return this.safeAppend('...');
      case 'Break':
        return this.safeAppend('break');
      case 'Return': {
        const exprs = expr.expressions;
        this.safeAppend('return');
        this.unparseExpressions(exprs, true);
        break;
      }
      case 'Variable':
        return this.safeAppend(expr.variable.name);
      case 'Field':
      case 'Method':
        this.unparseExpression(expr.base);
        if (expr.type === 'Method') {
          this.currentLine += ':';
          this.safeAppend(expr.name as string);
        } else if (expr.name) {
          this.currentLine += '.';
          this.safeAppend(expr.name as string);
        } else if (expr.expression) {
          this.currentLine += '[';
          this.unparseExpression(expr.expression);
          this.currentLine += ']';
        }
        break;
      case 'While':
        this.safeAppend('while');
        this.unparseExpression(expr.condition);
      case 'Do':
        this.safeAppend('do');
        this.unparseExpressions(expr.block);
        this.ensureLine(this.line(expr.endIndex));
        return this.safeAppend('end');
      case 'Repeat':
        this.safeAppend('repeat');
        this.unparseExpressions(expr.block);
        this.ensureLine(this.line(expr.untilIndex));
        this.safeAppend('until');
        return this.unparseExpression(expr.condition);
      case 'If': {
        this.safeAppend('if');
        const first = expr.blocks[0];
        this.unparseExpression(first[0]);
        this.safeAppend('then');
        this.unparseExpressions(first[1]);
        expr.blocks.slice(1).forEach(([cond, block, index]) => {
          this.ensureLine(this.line(index));
          this.safeAppend('elseif');
          this.unparseExpressions(block);
          this.safeAppend('then');
        });
        this.ensureLine(this.line(expr.endIndex));
        if (expr.otherwise) {
          this.ensureLine(this.line(expr.elseIndex!));
          this.safeAppend('else');
          this.unparseExpressions(expr.otherwise);
        }
        this.ensureLine(this.line(expr.endIndex));
        return this.safeAppend('end');
      }
      case 'NumericFor':
        this.safeAppend(`for ${expr.name} = `);
        this.unparseExpression(expr.var);
        [expr.limit, expr.step].forEach((e) => {
          if (!e) return;
          this.currentLine += ', ';
          this.unparseExpression(e);
        });
        this.currentLine += ' do';
        this.unparseExpressions(expr.block);
        this.ensureLine(this.line(expr.endIndex));
        return this.safeAppend('end');
      case 'GenericFor':
        this.safeAppend(`for `);
        this.currentLine += expr.names.join(', ');
        this.currentLine += ' in ';
        this.unparseExpression(expr.expressions[0]);
        expr.expressions.slice(1).forEach((e) => {
          this.currentLine += ', ';
          this.unparseExpression(e);
        });
        this.currentLine += ' do';
        this.unparseExpressions(expr.block);
        this.ensureLine(this.line(expr.endIndex));
        return this.safeAppend('end');
      case 'Assignment': {
        let first: ls.Expression = expr.variables[0];
        if (declaresLocal(first)) this.safeAppend('local ');
        this.unparseExpression(first);
        expr.variables.slice(1).forEach((e) => {
          this.currentLine += ', ';
          this.unparseExpression(e);
        });
        first = expr.expressions[0];
        if (first) {
          this.currentLine += ' = ';
          this.unparseExpression(first);
        }
        expr.expressions.slice(1).forEach((e) => {
          this.currentLine += ', ';
          this.unparseExpression(e);
        });
        break;
      }
      case 'BinaryOp':
        this.unparseExpression(expr.left);
      case 'UnaryOp':
        this.currentLine += ' ' + expr.operation;
        if (expr.type === 'BinaryOp') {
          this.currentLine += ' ';
          return this.unparseExpression(expr.right);
        }
        if (expr.operation === 'not') this.currentLine += ' ';
        return this.unparseExpression(expr.expression);
      case 'FunctionSelfCall':
        this.unparseExpression(expr.base);
        this.currentLine += `:${expr.name}`;
      case 'FunctionCall': {
        if (expr.type === 'FunctionCall') {
          this.unparseExpression(expr.target);
        }
        this.currentLine += '(';
        const first = expr.arguments[0];
        if (first) this.unparseExpression(first);
        expr.arguments.slice(1).forEach((e) => {
          this.currentLine += ', ';
          this.unparseExpression(e);
        });
        this.currentLine += ')';
        break;
      }
      case 'Brackets':
        this.currentLine += '(';
        this.unparseExpression(expr.expression);
        this.currentLine += ')';
        break;
      case 'Constant':
        if (expr.value === null) return this.safeAppend('nil');
        if (typeof expr.value === 'string') {
          if (expr.value.includes('\n') && expr.value.length > 100) {
            let amount = 0;
            while (longStringThing(expr.value, amount)) amount += 1;
            const eq = '='.repeat(amount);
            this.append(`[${eq}[${expr.value}]${eq}]`);
          } else if (expr.value.length === 1) {
            this.currentLine += `'${escapeString(expr.value, '\'')}'`;
          } else {
            this.currentLine += `"${escapeString(expr.value, '"')}"`;
          }
          break;
        }
        return this.safeAppend(expr.value.toString());
      case 'Table': {
        this.currentLine += '{';
        expr.content.forEach(({ key, value }) => {
          if (key) {
            this.ensureLine(this.line(key.index));
            this.currentLine += '[';
            this.unparseExpression(key);
            this.currentLine += '] = ';
          }
          this.unparseExpression(value);
        });
        this.currentLine += '}';
        break;
      }
      case 'Function': {
        if (declaresLocal(expr.variable)) {
          this.safeAppend('local ');
        }
        this.safeAppend('function');
        if (expr.variable) {
          this.unparseExpression(expr.variable);
        }
        this.currentLine += '(';
        this.currentLine += expr.parameters.map(v => v.name).join(', ');
        if (expr.varargTyping) {
          if (expr.parameters.length) this.currentLine += ', ';
          this.currentLine += '...';
        }
        this.currentLine += ')';
        this.unparseExpressions(expr.chunk.block);
        this.ensureLine(this.line(expr.endIndex));
        return this.safeAppend('end');
      }
      default:
        throw new Error('oops');
    }
  }
}

export default Unparser;
