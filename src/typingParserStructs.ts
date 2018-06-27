
import { Typing, TypingClass, TypingFunction, TypingHolder, TypingVararg } from './typingStructs';

import * as ls from './parserStructs';

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

  export enum Keyword {
    class = 'CLASS',
    extends = 'EXTENDS',
    implements = 'IMPLEMENTS',
  }

  export interface ExpressionTypes {
    Class: Class;
  }
}

export interface Class extends ls.ExpressionBase {
  type: 'Class';
  typing?: TypingHolder<TypingClass>;
  parsedTyping?: ParsedTyping;
}

/* Typing stuff for the parser */

export type ParsedTypingType = 'NAME' | 'AND' | 'OR' | 'CONSTANT' | 'ARRAY' | 'FUNCTION' | 'VARARG' | 'CLASS';

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
  parameters: ls.FunctionParameter[];
  returnTypes: ParsedTyping[];
}
export interface ParsedTypingVararg extends ParsedTypingBase {
  type: 'VARARG';
  subtype: ParsedTyping;
}
export interface ParsedTypingClass extends ParsedTypingBase {
  type: 'CLASS';
  name?: string;
  extends?: ParsedTypingName;
  implements: ParsedTypingName[];
}

export type ParsedTyping = ParsedTypingName | ParsedTypingAndOr
  | ParsedTypingConstant | ParsedTypingArray | ParsedTypingFunction
  | ParsedTypingVararg | ParsedTypingClass;
