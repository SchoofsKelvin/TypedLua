
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

export type BinaryOperation = '^'
  | '*' | '/' | '%'
  | '+' | '-'
  | '..'
  | '<' | '<=' | '>' | '>=' | '==' | '~='
  | 'or' | 'and';

export const BINARY_OP_PRIORTY: {[op: string]: number | undefined} = {
  ['^']: 1,
  // unary operators = 2
  ['*']: 3, ['/']: 3, ['%']: 3,
  ['+']: 4, ['-']: 4,
  ['..']: 5,
  ['<=']: 6, ['<']: 6, ['>=']: 6, ['>']: 6, ['==']: 6, ['~=']: 6,
  // or / and = 7
};

export type UnaryOperation = '-' | '#' | 'not';

/* General data structures */

export interface Scope {
  parent?: Scope;
  locals: string[];
  upvalues: string[];
}

export interface Chunk {
  block: Block;
  scope: Scope;
}

export interface FuncBody extends Chunk {
  parameters: string[];
}

export interface ExpressionBase {
  type: string;
  index: number;
}

export type Expression = Vararg | Break | Return | Variable
  | Field | Method | Do | While | Repeat | If | NumericFor
  | GenericFor | Assignment | UnaryOp | BinaryOp | FunctionCall
  | FunctionSelfCall | Brackets |Constant | Table | FunctionExpr;

/**
 * Used in {@link Table}
 */
export interface TableEntry {
  key?: Expression;
  value: Expression;
}

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
  scope: Scope;
  scopePosition: number;
  name: string;
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
export interface Do extends ExpressionBase {
  type: 'Do';
  block: Block;
}
export interface While extends ExpressionBase {
  type: 'While';
  block: Block;
  condition: Expression;
}
export interface Repeat extends ExpressionBase {
  type: 'Repeat';
  block: Block;
  condition: Expression;
}
export interface If extends ExpressionBase {
  type: 'If';
  blocks: [Expression, Block][];
  otherwise?: Block;
}

export interface NumericFor extends ExpressionBase {
  type: 'NumericFor';
  block: Block;
  name: string;
  var: Expression;
  limit: Expression;
  step?: Expression;
}
export interface GenericFor extends ExpressionBase {
  type: 'GenericFor';
  block: Block;
  names: string[];
  expressions: Block;
}
export interface Assignment extends ExpressionBase {
  type: 'Assignment';
  variables: (Variable | Field)[]; // Variable/Field
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
/** A crafting step for Function */
export interface FunctionExpr extends ExpressionBase {
  type: 'Function';
  chunk: Chunk;
  parameters: string[];
  variable?: Variable | Field | Method;
  local: boolean;
}
