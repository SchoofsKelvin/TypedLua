
import { Diagnostic, DiagnosticCode, DiagnosticType } from './diagnostics';
import { FunctionFlow } from './functionFlow';
import * as ls from './parserStructs';
import * as ts from './typingStructs';
import { Walker } from './walker';

interface ScopeVariable {
  scope: ls.Scope;
  index: number;
  name: string;
}
class ScopeVariables {
  protected vars: ScopeVariable[] = [];
  public getVariable(scope: ls.Scope, index: number, name: string) {
    let variable = this.vars.find(v => v.scope === scope && v.index === index);
    if (variable) return variable;
    variable = { scope, index, name };
    this.vars.push(variable);
    return variable;
  }
  public getVariableFromExpression(expr: ls.Variable) {
    const index = expr.scope.locals.slice(0, expr.scopePosition).lastIndexOf(expr.name);
    return this.getVariable(expr.scope, index, expr.name);
  }
  public getIndex(variable: ScopeVariable) {
    return this.vars.indexOf(variable);
  }
}

export class AnalyzingWalker extends Walker {
  protected flow = new FunctionFlow();
  protected locals = new ScopeVariables();
  protected diagnostics: Diagnostic[] = [];
  /* Getters / Setters */
  public getDiagnostics(): Diagnostic[] {
    return this.diagnostics.slice(0);
  }
  /* Main stuff */
  public analyzeMainChunk(chunk: ls.MainChunk) {
    chunk.block.forEach(this.walkExpression, this);
  }
  public logDiagnosticError(code: DiagnosticCode, index: number, message?: string) {
    this.diagnostics.push({ code, index, message, type: DiagnosticType.Error });
  }
  public generateTyping(parsed: ls.ParsedTyping | null | undefined, index: number): ts.TypingHolder {
    if (!parsed) return { typing: ts.ANY, explicit: false };
    switch (parsed.type) {
      case 'CONSTANT':
        return { explicit: true, typing: new ts.TypingConstant(parsed.value) };
      case 'NAME': {
        const typing = this.flow.getTyping(parsed.name);
        if (typing) return typing;
        this.logDiagnosticError(DiagnosticCode.ERROR_UNKNOWN_TYPE, index, `Unknown type '${parsed.name}'`);
        return { typing: ts.ANY, explicit: false };
      }
      case 'ARRAY':
        return {
          typing: new ts.TypingArray(this.generateTyping(parsed.subtype, index).typing),
          explicit: true,
        };
      case 'AND':
      case 'OR': {
        // TODO: Add index field to ParsedTyping and use it here
        const left = this.generateTyping(parsed.left, index);
        const right = this.generateTyping(parsed.right, index);
        const clazz = parsed.type === 'AND' ? ts.TypingIntersection : ts.TypingUnion;
        return {
          typing: new clazz([left.typing, right.typing]),
          explicit: true,
        };
      }
      case 'FUNCTION': {
        // TODO: Add function name (in parser) if available
        const func = new ts.TypingFunction();
        const params = func.parameters = parsed.parameters.slice(0);
        const vararg = parsed.parameters.pop();
        if (vararg && vararg.name.endsWith('...')) {
          func.vararg = this.generateTyping(vararg.parsedTyping, index).typing as ts.TypingArray;
        } else if (vararg) {
          parsed.parameters.push(vararg);
        }
        params.forEach(p => p.typing = this.generateTyping(p.parsedTyping, index));
        func.returnValues = parsed.returnTypes.map(r => this.generateTyping(r, index).typing);
        return {
          typing: func,
          explicit: true,
        };
      }
    }
    throw new Error(`Unknown parsed type '${parsed!.type}': ${parsed}`);
  }
  /* Expression walkers */
  public walkExpression(expr: ls.Expression) {
    const parsed = expr.parsedTyping;
    if (parsed) {
      if (expr.typing) throw new Error('Already has a typing? What?');
      expr.typing = this.generateTyping(parsed, expr.index);
    }
    super.walkExpression(expr);
  }
  public walkVariable(expr: ls.Variable) {
    const variable = this.locals.getVariableFromExpression(expr);
    if (expr.declaration && expr.typing) {
      this.flow.setVariableType(variable.name, expr.typing);
    }
    super.walkVariable(expr);
  }
  public walkFunctionCall(expr: ls.FunctionCall) {
    this.flow = new FunctionFlow(this.flow);
    super.walkFunctionCall(expr);
    this.flow = this.flow.parent!;
  }
  public walkFunctionSelfCall(expr: ls.FunctionSelfCall) {
    this.flow = new FunctionFlow(this.flow);
    super.walkFunctionSelfCall(expr);
    this.flow = this.flow.parent!;
  }
  public walkConstant(expr: ls.Constant) {
    expr.typing = { explicit: true } as ts.TypingHolder;
    switch (typeof expr.value) {
      case 'boolean':
        expr.typing.typing = expr.value ? ts.TRUE : ts.FALSE;
        break;
      case 'number':
        expr.typing.typing = ts.NUMBER;
        break;
      case 'string':
        expr.typing.typing = ts.STRING;
        break;
    }
    if (expr.value === null) {
      expr.typing.typing = ts.NIL;
    }
  }
  public walkAssignment(expr: ls.Assignment) {
    super.walkAssignment(expr);
    expr.variables.forEach((v, index) => {
      if (v.type === 'Field') return;
      const value = expr.expressions[index];
      if (!value) return;
      // TODO: See if we can guess the typing? shouldn't be necessary
      if (!value.typing) return;
      const curType = v.typing && v.typing.typing;
      if (curType) {
        if (!value.typing.typing.canCastFrom(curType)) {
          const msg = `Cannot cast ${curType} to ${value.typing.typing}`;
          this.logDiagnosticError(DiagnosticCode.ERROR_CANNOT_CAST, value.index, msg);
        }
      }
      this.flow.setVariableType(v.name, value.typing);
    });
  }
}
