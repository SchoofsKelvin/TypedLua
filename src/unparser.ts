
import * as ls from './structs';

function declaresLocal(expr: ls.Expression | null | undefined) {
  if (!expr) return false;
  if (expr.type !== 'Variable') return false;
  return expr.declaration;
}

function longStringThing(str: string, amount: number) {
  if (str.includes(`[${'='.repeat(amount)}[`)) return true;
  return str.includes(`]${'='.repeat(amount)}]`);
}

const ESCAPE_FUNC = (s: string) => `\\${s.charCodeAt(0)}`;
function escapeString(str: string, quote: string) {
  return str.replace(quote, `\\${quote}`)
    .replace('\n','\\n').replace('\t','\\t')
    .replace(/[^\w_\-+*/\\[\](){}#'"´`~:;,.?$^£%¨°!@&|]/, ESCAPE_FUNC);
}

export class Unparser {
  protected indent = -1;
  protected currentLine = '';
  protected lines: string[] = [];
  constructor(protected chunk: ls.MainChunk) {
  }
  /* PUBLIC METHODS */
  public unparse(): string {
    this.unparseExpressions(this.chunk.block);
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
  protected ensureLine(line: number): void {
    line -= 1;
    while (this.lines.length < line) this.nextLine();
  }
  protected unparseExpressions(exprs: ls.Expression[]): void {
    this.indent += 1;
    exprs.forEach(this.unparseExpression, this);
    this.indent -= 1;
  }
  protected safeAppend(str: string): void {
    if (this.currentLine.match(/\w$/)) {
      if (str.match(/^\w/)) {
        str = ' ' + str;
      }
    }
    this.currentLine += str;
  }
  protected unparseExpression(expr: ls.Expression): void {
    this.ensureLine(this.line(expr.index));
    switch (expr.type) {
      case 'Vararg':
        return this.safeAppend('...');
      case 'Break':
        return this.safeAppend('break');
      case 'Return': {
        const exprs = expr.expressions;
        this.safeAppend('return');
        this.unparseExpressions(exprs);
        break;
      }
      case 'Variable':
        return this.safeAppend(expr.name);
      case 'Field':
      case 'Method':
        this.unparseExpression(expr.base);
        if (expr.type === 'Method' || expr.name) {
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
        return this.safeAppend('end');
      case 'Repeat':
        this.safeAppend('repeat');
        this.unparseExpressions(expr.block);
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
          this.safeAppend('else');
          this.unparseExpressions(expr.otherwise);
        }
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
        return this.safeAppend('end');
      case 'Assignment': {
        let first: ls.Expression = expr.variables[0];
        if (declaresLocal(first)) this.safeAppend('local ');
        this.unparseExpression(first);
        expr.variables.slice(1).forEach((e) => {
          this.currentLine += ', ';
          this.unparseExpression(e);
        });
        this.currentLine += ' = ';
        first = expr.expressions[0];
        if (first) this.unparseExpression(first);
        expr.expressions.slice(1).forEach((e) => {
          this.currentLine += ', ';
          this.unparseExpression(e);
        });
        break;
      }
      case 'BinaryOp':
        this.unparseExpression(expr.left);
      case 'UnaryOp':
        this.safeAppend(expr.operation);
        if (expr.operation === 'not') this.currentLine += ' ';
        const right = expr.type === 'UnaryOp' ? expr.expression : expr.right;
        return this.unparseExpression(right);
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
          if (expr.value.includes('\n')) {
            let amount = 0;
            while (longStringThing(expr.value, amount)) amount += 1;
            const eq = '='.repeat(amount);
            this.currentLine += `[${eq}[${expr.value}]${eq}]`;
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
        this.currentLine += expr.parameters.join(', ');
        this.currentLine += ')';
        this.unparseExpressions(expr.chunk.block);
        return this.safeAppend('end');
      }
      default:
        throw new Error('oops');
    }
  }
}

export default Unparser;
