
import * as ls from './parserStructs';
import * as ts from './typingStructs';
import { Walker } from './walker';

class AnalyzingWalker extends Walker {
  public walkExpression(expr: ls.Expression): void {
    switch (expr.type) {
      case 'Constant': {
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
      }
    }
    super.walkExpression(expr);
  }
}
