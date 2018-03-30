
import * as ts from 'typescript';

export class Transpiler {
  protected line: string[] = [];
  protected lines = [this.line];
  constructor(private sourceFile: ts.SourceFile) {

  }
  public transpile() {

  }
  public getResult() {
    return this.lines.join('\n');
  }
  protected nextLine() {
    this.line = [];
    this.lines.push(this.line);
  }
}

export default Transpiler;
