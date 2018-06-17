
import * as ts from './typingStructs';

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
  public setVariableType(name: string, typing: ts.TypingHolder): void {
    this.variables[name] = typing;
  }
  public getVariableType(name: string): ts.TypingHolder | null {
    let flow: FunctionFlow | undefined = this as FunctionFlow;
    while (flow) {
      const typing = flow.variables[name];
      if (typing) return typing;
      flow = this.parent;
    }
    return null;
  }
}
