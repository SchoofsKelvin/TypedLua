
import { TypingHolder } from './typingStructs';

import { ExpressionBase, FunctionParameter } from './parserStructs';

// Add some typing to some parsing things

declare module './parserStructs' {
  export interface ExpressionBase {
    typing?: TypingHolder;
    parsedTyping?: ParsedTyping;
  }

  export interface FunctionParameter {
    typing?: TypingHolder;
    parsedTyping?: ParsedTyping;
  }
}

/* Typing stuff for the parser */

export type ParsedTypingType = 'NAME' | 'AND' | 'OR' | 'CONSTANT' | 'ARRAY';

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

export type ParsedTyping = ParsedTypingName | ParsedTypingAndOr | ParsedTypingConstant | ParsedTypingArray;
