
// Export the typed parsing structs too
export * from './typingParserStructs';

/* Constants (+ their types)*/

export enum Keyword {
  do = 'DO',
  end = 'END',
  while = 'WHILE',
  repeat = 'REPEAT',
  until = 'UNTIL',
  if = 'IF',
  then = 'THEN',
  elseif = 'ELSEIF',
  else = 'ELSE',
  for = 'FOR',
  in = 'IN',
  function = 'FUNCTION',
  local = 'LOCAL',
  return = 'RETURN',
  break = 'BREAK',
  false = 'FALSE',
  true = 'TRUE',
  nil = 'NIL',
  not = 'NOT',
  and = 'AND',
  or = 'OR',
}

export enum BinaryOperationEnum {
  POW = '^',
  MUL = '*',
  DIV = '/',
  MOD = '%',
  ADD = '+',
  MIN = '-',
  CONCAT = '..',
  LESS_THAN = '<',
  LESS_OR_EQUAL_THAN = '<=',
  GREATER_THAN = '>',
  GREATER_OR_EQUAL_THAN = '>=',
  EQUALS = '==',
  NOT_EQUALS = '~=',
  OR = 'or',
  AND = 'and',
}

export type BinaryOperation = '^'
  | '*' | '/' | '%'
  | '+' | '-'
  | '..'
  | '<' | '<=' | '>' | '>=' | '==' | '~='
  | 'or' | 'and';

export const BINARY_OP_PRIORTY: {
  readonly [P in BinaryOperation]: number;
} = {
  ['^']: 1,
  // unary operators = 2
  ['*']: 3, ['/']: 3, ['%']: 3,
  ['+']: 4, ['-']: 4,
  ['..']: 5,
  ['<=']: 6, ['<']: 6, ['>=']: 6, ['>']: 6, ['==']: 6, ['~=']: 6,
  // and = 7, or = 8
  and: 7, or: 8,
};

export type UnaryOperation = '-' | '#' | 'not';

/* General data structures */

export class Scope {
  public parent?: Scope;
  public variables: ScopeVariable[] = [];
  public getVariable(name: string, recursive = false): ScopeVariable | null {
    return this.variables.find(v => v.name === name)
      || recursive && this.parent && this.parent.getVariable(name, true)
      || null;
  }
  public calculateVariable(name: string): ScopeVariable {
    return this.getVariable(name, true)
    || { name, local: false, scope: this };
  }
  public insertVariable(name: string, scopePosition: number) {
    const variable: ScopeVariable = {
      name, scopePosition,
      local: true,
      scope: this,
    };
    this.variables.splice(scopePosition, 0, variable);
    this.variables.forEach((v, i) => v.scopePosition = i);
    return variable;
  }
  public createVariable(name: string) {
    const variable: ScopeVariable = {
      name,
      local: true,
      scope: this,
      scopePosition: this.variables.length,
    };
    this.variables.push(variable);
    return variable;
  }
  public createVariables(names: string[]) {
    return names.map(this.createVariable, this);
  }
  public createSubScope() {
    const scope = new Scope();
    scope.parent = this;
    return scope;
  }
  static createPlaceholder(name: string): ScopeVariable {
    return {
      name,
      local: true,
      scope: null!,
    };
  }
}

export interface ScopeVariable {
  scope: Scope;
  scopePosition?: number;
  name: string;
  local: boolean;
}

export interface Chunk {
  block: Block;
  scope: Scope;
}

export interface FuncBody extends Chunk {
  parameters: string[];
}

export interface MainChunk extends Chunk {
  type: 'MainChunk';
  lines: number[];
  startComment?: Comment;
}

export interface ExpressionBase {
  type: string;
  index: number;
  /** There might be a comment right behind this expression */
  comment?: Comment;
}

export type Expression = Vararg | Break | Return | Variable
  | Field | Method | Do | While | Repeat | If | NumericFor
  | GenericFor | Assignment | UnaryOp | BinaryOp | FunctionCall
  | FunctionSelfCall | Brackets | Constant | Table | FunctionExpr
  | Comment;

/**
 * Used in {@link Table}
 */
export interface TableEntry {
  key?: Expression;
  value: Expression;
}

/**
 * Used in {@link If}
 */
export type IfBlock = [Expression, Block, number];

export type Block = Expression[];

/* Expression types (extending Expression) */
export interface Vararg extends ExpressionBase {
  type: 'Vararg';
}
export interface Break extends ExpressionBase {
  type: 'Break';
}
export interface Return extends ExpressionBase {
  type: 'Return';
  expressions: Block;
}
export interface Variable extends ExpressionBase {
  type: 'Variable';
  declaration: boolean;
  variable: ScopeVariable;
}
export interface Field extends ExpressionBase {
  type: 'Field';
  name?: string;
  expression?: Expression;
  base: Expression;
}
export interface Method extends ExpressionBase {
  type: 'Method';
  name: string;
  base: Expression;
}
export interface Do extends BlockExpressionBase {
  type: 'Do';
  block: Block;
}
export interface While extends BlockExpressionBase {
  type: 'While';
  block: Block;
  condition: Expression;
}
export interface Repeat extends ExpressionBase {
  type: 'Repeat';
  block: Block;
  condition: Expression;
  untilIndex: number;
}
export interface If extends BlockExpressionBase {
  type: 'If';
  blocks: IfBlock[];
  otherwise?: Block;
  elseIndex?: number;
}

export interface NumericFor extends BlockExpressionBase {
  type: 'NumericFor';
  block: Block;
  name: string;
  var: Expression;
  limit: Expression;
  step?: Expression;
}
export interface GenericFor extends BlockExpressionBase {
  type: 'GenericFor';
  block: Block;
  names: string[];
  expressions: Block;
}
export interface Assignment extends ExpressionBase {
  type: 'Assignment';
  variables: (Variable | Field)[]; // Variable/Field
  expressions: Block;
}
export interface UnaryOp extends ExpressionBase {
  type: 'UnaryOp';
  operation: UnaryOperation;
  priority: 2;
  expression: Expression;
}
export interface BinaryOp extends ExpressionBase {
  type: 'BinaryOp';
  operation: BinaryOperation;
  priority: number;
  left: Expression;
  right: Expression;
}
export interface FunctionCall extends ExpressionBase {
  type: 'FunctionCall';
  target: Expression;
  arguments: Block;
}
export interface FunctionSelfCall extends ExpressionBase {
  type: 'FunctionSelfCall';
  name: string;
  base: Expression;
  arguments: Block;
}
export interface Brackets extends ExpressionBase {
  type: 'Brackets';
  expression: Expression;
}
export interface Constant extends ExpressionBase {
  type: 'Constant';
  value: string | number | boolean | null;
}
export interface Table extends ExpressionBase {
  type: 'Table';
  content: TableEntry[];
}

/** Anything that has a block that has an ending `end` */
export interface BlockExpressionBase extends ExpressionBase {
  endIndex: number;
}

/** A crafting step for Function */
export interface FunctionParameterName {
  name: string;
}
export interface FunctionParameter {
  name: string;
  variable: ScopeVariable;
}
export interface FunctionExpr extends BlockExpressionBase {
  type: 'Function';
  chunk: Chunk;
  parameters: FunctionParameter[];
  variable?: Variable | Field | Method;
  local: boolean;
}

/** The special Comment expression */
export interface Comment extends ExpressionBase {
  type: 'Comment';
  long: boolean;
  text: string;
}
