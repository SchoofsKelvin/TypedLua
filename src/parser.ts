import { readFileSync } from 'fs';
import * as ts from 'typescript';

import Transpiler from './transpiler';

function delintSourceFile(sourceFile: ts.SourceFile) {
  const delintNode = (node: ts.Node) => {
    switch (node.kind) {
      case ts.SyntaxKind.ForStatement:
      case ts.SyntaxKind.ForInStatement:
      case ts.SyntaxKind.WhileStatement:
      case ts.SyntaxKind.DoStatement:
        if ((node as ts.IterationStatement).statement.kind !== ts.SyntaxKind.Block) {
          report(sourceFile, node, 'A looping statement\'s contents should be wrapped in a block body.');
        }
        break;

      case ts.SyntaxKind.IfStatement:
        const ifStatement = (node as ts.IfStatement);
        if (ifStatement.thenStatement.kind !== ts.SyntaxKind.Block) {
          report(sourceFile, ifStatement.thenStatement, 'An if statement\'s contents should be wrapped in a block body.');
        }
        if (ifStatement.elseStatement &&
                  ifStatement.elseStatement.kind !== ts.SyntaxKind.Block &&
                  ifStatement.elseStatement.kind !== ts.SyntaxKind.IfStatement) {
          report(sourceFile, ifStatement.elseStatement, 'An else statement\'s contents should be wrapped in a block body.');
        }
        break;

      case ts.SyntaxKind.BinaryExpression:
        const op = (node as ts.BinaryExpression).operatorToken.kind;
        if (op === ts.SyntaxKind.EqualsEqualsToken || op === ts.SyntaxKind.ExclamationEqualsToken) {
          report(sourceFile, node, 'Use \'===\' and \'!==\'.');
        }
        break;
    }
    for (const name in ts.SyntaxKind) {
      if (ts.SyntaxKind[name] as any as ts.SyntaxKind === node.kind) {
        (node as any).kindName = name;
        console.log(node.getFullStart(), name);
      }
    }
    ts.forEachChild(node, delintNode);
  };
  delintNode(sourceFile);
}

function report(sourceFile: ts.SourceFile, node: ts.Node, message: string) {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
  console.log(`${sourceFile.fileName} (${line + 1},${character + 1}): ${message}`);
}

export function delint(sourceFile: ts.SourceFile) {
  delintSourceFile(sourceFile);
  console.log(sourceFile);
  const transpiler = new Transpiler(sourceFile);
  transpiler.transpile();
  console.log(transpiler.getResult());
}

// Parse a file
const sf = ts.createSourceFile('parser.ts', readFileSync('./src/parser.ts').toString(), ts.ScriptTarget.ES2015, /*setParentNodes */ true);

// delint it
delint(sf);
