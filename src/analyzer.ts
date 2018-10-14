
import { Diagnostic, DiagnosticCode, DiagnosticType } from './diagnostics';
import { FunctionFlow } from './functionFlow';
import * as ls from './parserStructs';
import * as ts from './typingStructs';
import { Walker } from './walker';

export interface PathSegment {
  expression: ls.Expression;
  [key: string]: any;
}

function nth(value: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = value % 100;
  return `${value}${(s[(v - 20) % 10] || s[v] || s[0])}`;
}

export class AnalyzingWalker extends Walker {
  protected flow = new FunctionFlow();
  protected diagnostics: Diagnostic[] = [];
  protected path: PathSegment[] = [];
  /* Getters / Setters */
  public get segment() {
    return this.path[this.path.length - 1];
  }
  public findLastSegment<T>(func: (segment: PathSegment) => boolean): PathSegment & T | null {
    const { path } = this;
    for (let i = path.length - 1; i >= 0; i -= 1) {
      if (func(path[i])) return path[i] as PathSegment & T;
    }
    return null;
  }
  public getDiagnostics(): Diagnostic[] {
    return this.diagnostics.slice(0);
  }
  /* Main stuff */
  public analyzeMainChunk(chunk: ls.MainChunk) {
    chunk.block.forEach(this.walkExpression, this);
  }
  public logDiagnosticError(code: DiagnosticCode, index: number, message?: string, type = DiagnosticType.Error) {
    this.diagnostics.push({ code, index, message, type });
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
        const vararg = params.pop();
        if (vararg && vararg.name.endsWith('...')) {
          func.vararg = this.generateTyping(vararg.parsedTyping, index).typing as ts.TypingVararg;
        } else if (vararg) {
          params.push(vararg);
        }
        params.forEach(p => p.typing = this.generateTyping(p.parsedTyping, index));
        // func.returnValues = new ts.TypingTuple(parsed.returnTypes.map(r => this.generateTyping(r, index).typing));
        func.returnValues = this.generateTyping(parsed.returnTypes, index).typing as ts.TypingTuple;
        return {
          typing: func,
          explicit: true,
        };
      }
      case 'VARARG': {
        const subtype = this.generateTyping(parsed.subtype, index);
        const typing = new ts.TypingVararg(subtype.typing);
        return {
          typing,
          explicit: true,
        };
      }
      case 'TUPLE': {
        const types = parsed.types.map(t => this.generateTyping(t, index).typing);
        return {
          typing: new ts.TypingTuple(types),
          explicit: true,
        };
      }
    }
    throw new Error(`Unknown parsed type '${parsed!.type}': ${parsed}`);
  }
  public getTyping(expr: ls.Expression, anyIfMissing?: true): ts.Typing;
  public getTyping(expr: ls.Expression, anyIfMissing: false): ts.Typing | null;
  public getTyping(expr: ls.Expression, anyIfMissing = true): ts.Typing | null {
    const any = anyIfMissing ? ts.ANY : null;
    switch (expr.type) {
      case 'Variable':
        const vt = this.flow.getVariableType(expr.variable);
        return vt ? vt.typing : any;
      // Field and Method are quite similar, really
      case 'Field':
        let indexType = expr.expression && this.getTyping(expr.expression);
      case 'Method':
        const baseType = this.getTyping(expr.base, false);
        if (!baseType) return null;
        indexType = indexType || new ts.TypingConstant(expr.name);
        return baseType.getField(indexType);
    }
    return expr.typing ? expr.typing.typing : any;
  }
  /* Expression walkers */
  public walkExpression(expr: ls.Expression) {
    this.path.push({ expression: expr });
    if ('parsedTyping' in expr && 'typing' in expr) {
      const parsed = expr.parsedTyping;
      if (parsed) {
        if (expr.typing) throw new Error('Already has a typing? What?');
        expr.typing = this.generateTyping(parsed, expr.index);
      }
    }
    super.walkExpression(expr);
    if (this.path.pop()!.expression !== expr) {
      throw new Error('How is this even possible?');
    }
  }
  public walkVariable(expr: ls.Variable) {
    super.walkVariable(expr);
    const { variable } = expr;
    if (expr.declaration && expr.parsedTyping) {
      expr.typing = this.generateTyping(expr.parsedTyping, expr.index);
    }
    const flowTyping = this.flow.getVariableType(variable);
    let typing = flowTyping || expr.typing;
    // If this is part of an assignment or function declaration, try to "steal" the typing from there if it's not explicitly defined here
    const segment = this.findLastSegment(s => s.expression.type === 'Assignment' || s.expression.type === 'Function');
    if (segment) {
      let assign: ls.Expression | null = segment.expression;
      if (assign.type === 'Assignment') {
        // If it's an assignment instead of a function, get the actual assigned value (if available)
        const index = assign.variables.indexOf(expr);
        assign = assign.expressions[index];
      } else {
        // When it's a function declaration, the function itself will set this variable's type
        assign = null;
      }
      if (assign) typing = assign.typing;
    }
    typing = typing || { typing: ts.ANY, explicit: false };
    if (typing.typing === ts.ANY && !typing.explicit) {
      typing = expr.typing = { typing: ts.ANY, explicit: false };
      const msg = `Cannot interfere typing for variable ${variable.name}, assuming any`;
      this.logDiagnosticError(DiagnosticCode.WARNING_IMPLICIT_VARIABLE, expr.index, msg, DiagnosticType.Warning);
    }
    if (expr.typing && !expr.typing.typing.canCastFrom(typing.typing)) {
      // const msg = `Cannot cast ${typing.typing} to ${expr.typing.typing}`;
      // this.logDiagnosticError(DiagnosticCode.ERROR_CANNOT_CAST, expr.index, msg);
      // walkAssignment should already emit an error for this, so yeah...
    } else if (!expr.typing || !expr.typing.explicit) {
      expr.typing = typing;
    }
    this.flow.setVariableType(variable, typing);
  }
  public checkFunctionCall(expr: ls.FunctionCall | ls.FunctionSelfCall) {
    let args = expr.arguments;
    let funcType: ts.Typing | null = null;
    if (expr.type === 'FunctionSelfCall') {
      args = [expr.base, ...args];
      const baseType = this.getTyping(expr.base, false);
      if (baseType) {
        const indexType = new ts.TypingConstant(expr.name);
        funcType = baseType.getField(indexType);
      }
    } else {
      funcType = this.getTyping(expr.target, false);
    }
    funcType = funcType && ts.collapseTyping(funcType);
    if (!funcType || funcType === ts.ANY) {
      expr.typing = { typing: new ts.TypingVararg(new ts.TypingArray(ts.ANY)), explicit: false };
      const msg = `Cannot interfere typing for function call, assuming any`;
      return this.logDiagnosticError(DiagnosticCode.WARNING_IMPLICIT_CALL, expr.index, msg, DiagnosticType.Warning);
    } else if (funcType instanceof ts.TypingFunction) {
      // TODO: Allow multiple function definitions (and pick the right one, if possible, based on parameters)
      expr.typing = { typing: funcType.returnValues, explicit: true };
      // First calculate some stuff with the passed argument expressions
      const argTypes = args.map(a => this.getTyping(a));
      const argCollapsed = ts.collapseTuples(argTypes);
      const argLast = argCollapsed[argCollapsed.length - 1];
      const argVararg = argLast && argLast instanceof ts.TypingVararg ? argLast.subtype : null;
      if (argVararg) argCollapsed.pop();
      // At this point, the following calls resulted in the following (typing) values:
      // f(1,2,3) -> argCollapsed = [1,2,3] and argVararg = null
      // assuming g() returns (string)
      // f(1,2,g()) -> argCollapsed = [1,2,string] and argVararg = null
      // assuming h() returns a vararg of numbers
      // f(1,2,h(),h()) -> argCollapsed = [1,2,number] and argVarag = number
      const parameters = funcType.parameters;
      const vararg = funcType.vararg;
      // If we gave too much arguments explicitly, complain
      if (!vararg && (args.length - (argVararg ? 1 : 0)) > parameters.length) {
        const msg = `Expected at most ${parameters.length} argument${parameters.length === 1 ? '' : 's'}, but got ${args.length}`;
        return this.logDiagnosticError(DiagnosticCode.ERROR_WRONG_PARAMETERS, expr.index, msg, DiagnosticType.Error);
      }
      // Now we'll check if we have all the required arguments and if they're the right type
      for (let i = 0; i < parameters.length; i += 1) {
        const arg = argCollapsed[i] || argVararg;
        if (!arg) {
          const msg = `Expected ${vararg ? 'at least' : ''} ${parameters.length} argument${parameters.length === 1 ? '' : 's'}, but got ${args.length}`;
          return this.logDiagnosticError(DiagnosticCode.ERROR_WRONG_PARAMETERS, expr.index, msg, DiagnosticType.Error);
        }
        const param = parameters[i];
        if (!param.typing) continue;
        const paramType = param.typing.typing;
        if (paramType.canCastFrom(arg)) continue;
        const msg = `Cannot cast the ${nth(i + 1)} parameter '${param.name}' of type ${arg} to ${paramType}`;
        return this.logDiagnosticError(DiagnosticCode.ERROR_CANNOT_CAST, expr.index, msg, DiagnosticType.Error);
      }
      if (vararg) {
        for (let i = parameters.length; i < argCollapsed.length; i += 1) {
          const arg = argCollapsed[i];
          if (vararg.canCastFrom(arg)) continue;
          const msg = `Cannot cast the ${nth(i + 1)} parameter of type ${arg} to ${vararg} for the vararg parameter`;
          return this.logDiagnosticError(DiagnosticCode.ERROR_CANNOT_CAST, expr.index, msg, DiagnosticType.Error);
        }
        if (argVararg && !vararg.canCastFrom(argVararg)) {
          const msg = `Cannot cast the vararg parameter of type ${argVararg} to ${vararg} for the vararg parameter`;
          return this.logDiagnosticError(DiagnosticCode.ERROR_CANNOT_CAST, expr.index, msg, DiagnosticType.Error);
        }
      }
    } else {
      // TODO: Add support for 'never' type (e.g. unreachable code) maybe?
      expr.typing = { typing: new ts.TypingVararg(new ts.TypingArray(ts.ANY)), explicit: false };
      const msg = `A value of type ${funcType} cannot be called`;
      return this.logDiagnosticError(DiagnosticCode.ERROR_CANNOT_CALL, expr.index, msg, DiagnosticType.Error);
    }
  }
  public walkFunctionCall(expr: ls.FunctionCall) {
    this.flow = new FunctionFlow(this.flow);
    super.walkFunctionCall(expr);
    this.checkFunctionCall(expr);
    this.flow = this.flow.parent!;
  }
  public walkFunctionSelfCall(expr: ls.FunctionSelfCall) {
    this.flow = new FunctionFlow(this.flow);
    super.walkFunctionSelfCall(expr);
    this.checkFunctionCall(expr);
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
      if (!('typing' in value) || !value.typing) return;
      const curType = v.typing && v.typing.typing;
      if (curType) {
        if (!curType.canCastFrom(value.typing.typing)) {
          const msg = `Cannot cast ${value.typing.typing} to ${curType}`;
          this.logDiagnosticError(DiagnosticCode.ERROR_CANNOT_CAST, value.index, msg);
        }
      }
      this.flow.setVariableType(v.variable, value.typing);
    });
  }
  public walkFunction(expr: ls.FunctionExpr) {
    const segm = Object.assign(this.segment, {
      returns: [] as ls.Return[],
    });
    if (expr.parsedVarargTyping) {
      expr.varargTyping = this.generateTyping(expr.parsedVarargTyping, expr.index) as ts.TypingHolder<ts.TypingVararg>;
    }
    if (expr.parsedReturnTyping) {
      expr.returnTyping = this.generateTyping(expr.parsedReturnTyping, expr.index) as ts.TypingHolder<ts.TypingTuple>;
    }
    // Above call should've walked through all return statements
    // which we can use now to generate the function's typing
    const { variable } = expr;
    const name = variable && (variable.type === 'Variable' ? variable.variable.name : variable.name);
    const func = new ts.TypingFunction(name);
    const params = func.parameters = expr.parameters;
    const vararg = params.pop();
    if (vararg && vararg.name.endsWith('...')) {
      func.vararg = this.generateTyping(vararg.parsedTyping, expr.index).typing as ts.TypingVararg;
    } else if (vararg) {
      params.push(vararg);
    }
    params.forEach(p => p.typing = this.generateTyping(p.parsedTyping, expr.index));
    // Assign early, so our body can access this, should it be necessary (e.g. recursive functions)
    expr.typing = {
      typing: func,
      explicit: true,
    };
    if (variable && variable.type === 'Variable') {
      this.flow.setVariableType(variable.variable, expr.typing);
    }
    // Register a new flow with all parameter types, otherwise the parameter don't properly "exist" in the body
    this.flow = new FunctionFlow(this.flow);
    params.forEach((param) => {
      if (param.typing) {
        this.flow.setVariableType(param.variable, param.typing!);
      } else {
        const msg = `Cannot interfere typing for parameter ${param.name}, assuming any`;
        this.logDiagnosticError(DiagnosticCode.WARNING_IMPLICIT_PARAMETER, expr.index, msg, DiagnosticType.Warning);
        this.flow.setVariableType(param.variable, { typing: ts.ANY, explicit: true });
      }
    });
    // Ignore comment above, we're gonna set the variable's typing if it exists
    if (variable) variable.typing = expr.typing;
    // Now let's go through the body and such
    super.walkFunction(expr);
    this.flow = this.flow.parent!;
    // TODO: Handle returning (dynamic) tuples?
    func.returnValues = new ts.TypingTuple(ts.unionFromTuples(segm.returns.map(r => r.returnTypes!.tuple)));
  }
  public walkReturn(expr: ls.Return) {
    super.walkReturn(expr);
    const returnTypes = new ts.TypingTuple(expr.expressions.map(e => e.typing!.typing));
    expr.returnTypes = returnTypes;
    interface FuncPS { returns: ls.Return[]; }
    const func = this.findLastSegment<FuncPS>(s => s.expression.type === 'Function');
    if (!func) throw new Error('TODO: Handle return statement in main chunk');
    func.returns.push(expr);
    // If the typing is explicit and has a return thingy, check it
    const { returnTyping } = func.expression as ls.FunctionExpr;
    if (!returnTyping || !returnTyping.explicit) return;
    if (!returnTyping.typing.canCastFrom(returnTypes)) {
      const msg = `Cannot return ${returnTypes} when ${returnTyping.typing} is expected`;
      this.logDiagnosticError(DiagnosticCode.ERROR_CANNOT_CAST_RETURN, expr.index, msg);
    }
  }
  public walkVararg(expr: ls.Vararg) {
    interface FuncPS { expression: ls.FunctionExpr; }
    const func = this.findLastSegment<FuncPS>(s => s.expression.type === 'Function');
    if (!func) throw new Error('TODO: Handle return statement in main chunk');
    expr.typing = func.expression.varargTyping;
  }
  public walkBinaryOp(expr: ls.BinaryOp) {
    super.walkBinaryOp(expr);
    // const left = expr.left.typing!.typing;
    // const right = expr.right.typing!.typing;
    const left = this.getTyping(expr.left);
    const right = this.getTyping(expr.right);
    // Gonna have to do a lot of magic and checks here for metafields 'n such
    if (expr.operation === ls.BinaryOperationEnum.AND) {
      if (left === ts.FALSE || left === ts.NIL) {
        // Left side can is nil/false, so we know the typing will be the same
        expr.typing = { typing: left, explicit: false };
      } else if (ts.FALSE.canCastFrom(left) || ts.NIL.canCastFrom(left)) {
        // Left side can be nil/false, so the typing can be either side
        expr.typing = { typing: new ts.TypingUnion([left, right]), explicit: false };
      }
      // Otherwise it's guaranteed to be the right side
      expr.typing = { typing: right, explicit: false };
    } else if (expr.operation === ls.BinaryOperationEnum.OR) {
      if (left === ts.FALSE || left === ts.NIL) {
        // Left side can is nil/false, so we know the typing will be the right side
        expr.typing = { typing: right, explicit: false };
      } else if (ts.FALSE.canCastFrom(left) || ts.NIL.canCastFrom(left)) {
        // Left side can be nil/false, so the typing can be either side
        expr.typing = { typing: new ts.TypingUnion([left, right]), explicit: false };
      }
      // Otherwise it's guaranteed to be the left side
      expr.typing = { typing: left, explicit: false };
    } else if (expr.operation === ls.BinaryOperationEnum.CONCAT) {
      // e.g. for concat, we can assume it's a string, but again...
      expr.typing = { typing: ts.STRING, explicit: true };
    } else if (left === ts.NUMBER && right === ts.NUMBER) {
      // Eh, definitely inaccurate, but good enough for now...
      expr.typing = { typing: ts.NUMBER, explicit: true };
    } else {
      expr.typing = { typing: ts.ANY, explicit: false };
      const msg = `No idea what binary op ${expr.operation} for ${left} and ${right} will result in, assuming any`;
      this.logDiagnosticError(DiagnosticCode.WARNING_UNKNOWN_BINARY_OP, expr.index, msg, DiagnosticType.Warning);
    }
  }
}
