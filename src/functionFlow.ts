
import * as ts from './typingStructs';
import { ScopeVariable } from './parserStructs';

export class FunctionFlow {
  protected typings: { [key: string]: ts.TypingHolder } = {};
  protected variables: { [key: string]: ts.TypingHolder } = {};
  constructor(public readonly parent?: FunctionFlow) {
    this.registerStandardTypes();
  }
  public registerStandardTypes() {
    this.typings.number = { typing: ts.NUMBER, explicit: false };
    this.typings.string = { typing: ts.STRING, explicit: false };
    this.typings.nil = { typing: ts.NIL, explicit: false };
    this.typings.true = { typing: ts.TRUE, explicit: false };
    this.typings.false = { typing: ts.FALSE, explicit: false };
    this.typings.boolean = { typing: ts.BOOLEAN, explicit: false };
    this.typings.any = { typing: ts.ANY, explicit: false };
  }
  public createKey(variable: ScopeVariable) {
    return `${variable.name}:${variable.local ? variable.scopePosition : 'G'}`;
  }
  /* Getters and setters */
  public setTyping(name: string, typing: ts.TypingHolder) {
    this.typings[name] = typing;
  }
  public getTyping(name: string): ts.TypingHolder | null {
    let flow: FunctionFlow | undefined = this as FunctionFlow;
    while (flow) {
      const typing = flow.typings[name];
      if (typing) return typing;
      flow = this.parent;
    }
    return null;
  }
  public setVariableType(variable: ScopeVariable, typing: ts.TypingHolder): void {
    this.variables[this.createKey(variable)] = typing;
  }
  public getVariableType(variable: ScopeVariable): ts.TypingHolder | null {
    let flow: FunctionFlow | undefined = this as FunctionFlow;
    const key = this.createKey(variable);
    while (flow) {
      const typing = flow.variables[key];
      if (typing) return typing;
      flow = flow.parent;
    }
    return null;
  }
}
