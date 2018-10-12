
import { Typing, TypingFunction, TypingHolder, TypingTuple, TypingVararg } from './typingStructs';

import { ExpressionBase, FunctionParameter } from './parserStructs';

// Add some typing to some parsing things

declare module './parserStructs' {

  // Maybe not the best move to add to everything? eh
  export interface ExpressionBase {
    typing?: TypingHolder;
    parsedTyping?: ParsedTyping;
  }
  /*
  Definitely needed by:
  - FunctionParameter
  - Constant
  - Field
  - Variable
  */

  export interface FunctionExpr {
    typing?: TypingHolder<TypingFunction>;
    parsedTyping?: ParsedTyping;
    varargTyping?: TypingHolder<TypingVararg>;
    parsedVarargTyping?: ParsedTypingVararg;
    parsedReturnTyping?: ParsedTypingTuple;
  }

  export interface Return {
    typing?: undefined;
    returnTypes?: Typing[];
  }

  export interface Vararg {
    typing?: TypingHolder<TypingVararg>;
  }

  // Isn't an expression, so doesn't inherit
  export interface FunctionParameter {
    typing?: TypingHolder;
    parsedTyping?: ParsedTyping;
  }
}

/* Typing stuff for the parser */

export type ParsedTypingType = 'NAME' | 'AND' | 'OR' | 'CONSTANT' | 'ARRAY' | 'FUNCTION' | 'VARARG' | 'TUPLE';

export interface ParsedTypingBase {
  type: ParsedTypingType;
}
export interface ParsedTypingName extends ParsedTypingBase {
  type: 'NAME';
  name: string;
}
export interface ParsedTypingAndOr extends ParsedTypingBase {
  type: 'AND' | 'OR';
  left: ParsedTyping;
  right: ParsedTyping;
}
export interface ParsedTypingConstant extends ParsedTypingBase {
  type: 'CONSTANT';
  value: string | number | boolean | null;
}
export interface ParsedTypingArray extends ParsedTypingBase {
  type: 'ARRAY';
  subtype: ParsedTyping;
}
export interface ParsedTypingFunction extends ParsedTypingBase {
  type: 'FUNCTION';
  parameters: FunctionParameter[];
  returnTypes: ParsedTyping[];
}
export interface ParsedTypingVararg extends ParsedTypingBase {
  type: 'VARARG';
  subtype: ParsedTyping;
}

export interface ParsedTypingTuple extends ParsedTypingBase {
  type: 'TUPLE';
  types: ParsedTyping[];
}

export type ParsedTyping = ParsedTypingName | ParsedTypingAndOr | ParsedTypingConstant
  | ParsedTypingArray | ParsedTypingFunction | ParsedTypingVararg | ParsedTypingTuple;
