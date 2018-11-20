
import * as ls from './parserStructs';

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
  walkClass: walkType<ls.ClassExpr>;
  walkFunction: walkType<ls.FunctionExpr>;
  walkComment: walkType<ls.Comment>;
}

export abstract class Walker implements IWalker {
  public walkExpression(expr: ls.Expression): void {
    const walk = (this as any)[`walk${expr.type}`] as (expr: ls.Expression) => {};
    if (!walk) throw new Error(`Couldn't find the walker for '${expr.type}'`);
    walk.call(this, expr);
  }
  /* IWalker methods */
  public walkVararg(expr: ls.Vararg): void {}
  public walkBreak(expr: ls.Break): void {}
  public walkReturn(expr: ls.Return): void {
    expr.expressions.forEach(this.walkExpression, this);
  }
  public walkVariable(expr: ls.Variable): void {}
  public walkField(expr: ls.Field): void {
    this.walkExpression(expr.base);
    if (!expr.expression) return;
    this.walkExpression(expr.expression);
  }
  public walkMethod(expr: ls.Method): void {
    this.walkExpression(expr.base);
  }
  public walkDo(expr: ls.Do): void {
    expr.block.forEach(this.walkExpression, this);
  }
  public walkWhile(expr: ls.While): void {
    this.walkExpression(expr.condition);
    expr.block.forEach(this.walkExpression, this);
  }
  public walkRepeat(expr: ls.Repeat): void {
    expr.block.forEach(this.walkExpression, this);
    this.walkExpression(expr.condition);
  }
  public walkIf(expr: ls.If): void {
    expr.blocks.forEach(([cond, block]) => {
      this.walkExpression(cond);
      block.forEach(this.walkExpression, this);
    });
    if (!expr.otherwise) return;
    expr.otherwise.forEach(this.walkExpression, this);
  }
  public walkNumericFor(expr: ls.NumericFor): void {
    this.walkExpression(expr.var);
    this.walkExpression(expr.limit);
    if (expr.step) this.walkExpression(expr.step);
    expr.block.forEach(this.walkExpression, this);
  }
  public walkGenericFor(expr: ls.GenericFor): void {
    expr.expressions.forEach(this.walkExpression, this);
    expr.block.forEach(this.walkExpression, this);
  }
  public walkAssignment(expr: ls.Assignment): void {
    expr.variables.forEach(this.walkExpression, this);
    expr.expressions.forEach(this.walkExpression, this);
  }
  public walkUnaryOp(expr: ls.UnaryOp): void {
    this.walkExpression(expr.expression);
  }
  public walkBinaryOp(expr: ls.BinaryOp): void {
    this.walkExpression(expr.left);
    this.walkExpression(expr.right);
  }
  public walkFunctionCall(expr: ls.FunctionCall): void {
    this.walkExpression(expr.target);
    expr.arguments.forEach(this.walkExpression, this);
  }
  public walkFunctionSelfCall(expr: ls.FunctionSelfCall): void {
    this.walkExpression(expr.base);
    expr.arguments.forEach(this.walkExpression, this);
  }
  public walkBrackets(expr: ls.Brackets): void {
    this.walkExpression(expr.expression);
  }
  public walkConstant(expr: ls.Constant): void {}
  public walkTable(expr: ls.Table): void {
    expr.content.forEach(({ key, value }) => {
      if (key) this.walkExpression(key);
      this.walkExpression(value);
    });
  }
  public walkClass(expr: ls.ClassExpr): void {
    if (expr.variable) this.walkExpression(expr.variable);
    expr.methods.forEach(this.walkExpression, this);
  }
  public walkFunction(expr: ls.FunctionExpr): void {
    if (expr.variable) this.walkExpression(expr.variable);
    expr.chunk.block.forEach(this.walkExpression, this);
  }
  public walkComment(expr: ls.Comment): void {}
}
