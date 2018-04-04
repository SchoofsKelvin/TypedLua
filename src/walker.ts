
import * as ls from './structs';

export type walkType<T extends ls.Expression> = (expr: T) => void;

export interface IWalker {
  walkVararg: walkType<ls.Vararg>;
  walkBreak: walkType<ls.Break>;
  walkReturn: walkType<ls.Return>;
  walkVariable: walkType<ls.Variable>;
  walkField: walkType<ls.Field>;
  walkMethod: walkType<ls.Method>;
  walkDo: walkType<ls.Do>;
  walkWhile: walkType<ls.While>;
  walkRepeat: walkType<ls.Repeat>;
  walkIf: walkType<ls.If>;
  walkNumericFor: walkType<ls.NumericFor>;
  walkGenericFor: walkType<ls.GenericFor>;
  walkAssignment: walkType<ls.Assignment>;
  walkUnaryOp: walkType<ls.UnaryOp>;
  walkBinaryOp: walkType<ls.BinaryOp>;
  walkFunctionCall: walkType<ls.FunctionCall>;
  walkFunctionSelfCall: walkType<ls.FunctionSelfCall>;
  walkBrackets: walkType<ls.Brackets>;
  walkConstant: walkType<ls.Constant>;
  walkTable: walkType<ls.Table>;
  walkFunctionExpr: walkType<ls.FunctionExpr>;
  walkComment: walkType<ls.Comment>;
}

export abstract class Walker implements IWalker {
  public walkExpression(expr: ls.Expression): void {
    const walk = (this as any)[`walk${expr.type}`] as (expr: ls.Expression) => {};
    if (!walk) throw new Error(`Couldn't find the walker for '${expr.type}'`);
    walk(expr);
  }
  /* IWalker methods */
  public walkVararg(expr: ls.Vararg): void {}
  public walkBreak(expr: ls.Break): void {}
  public walkReturn(expr: ls.Return): void {}
  public walkVariable(expr: ls.Variable): void {}
  public walkField(expr: ls.Field): void {}
  public walkMethod(expr: ls.Method): void {}
  public walkDo(expr: ls.Do): void {}
  public walkWhile(expr: ls.While): void {}
  public walkRepeat(expr: ls.Repeat): void {}
  public walkIf(expr: ls.If): void {}
  public walkNumericFor(expr: ls.NumericFor): void {}
  public walkGenericFor(expr: ls.GenericFor): void {}
  public walkAssignment(expr: ls.Assignment): void {}
  public walkUnaryOp(expr: ls.UnaryOp): void {}
  public walkBinaryOp(expr: ls.BinaryOp): void {}
  public walkFunctionCall(expr: ls.FunctionCall): void {}
  public walkFunctionSelfCall(expr: ls.FunctionSelfCall): void {}
  public walkBrackets(expr: ls.Brackets): void {}
  public walkConstant(expr: ls.Constant): void {}
  public walkTable(expr: ls.Table): void {}
  public walkFunctionExpr(expr: ls.FunctionExpr): void {}
  public walkComment(expr: ls.Comment): void {}
}
