import * as vscode from 'vscode';
import { exec } from 'child_process';
import { registerHover } from './hover';
import path from 'path';

export function activate(context: vscode.ExtensionContext) {
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('cffc');
  const outputChannel = vscode.window.createOutputChannel('CaffeineC');

  let ast: any = null;
  let tokens: number[] = [];

  registerHover(context);

  const tokenTypes = ['class', 'function', 'variable', 'parameter', 'property', 'type', 'string', 'number', 'keyword', 'comment', 'regexp', 'operator'];
  const tokenModifiers = ['decleration', 'definition', 'readonly', 'static', 'deprecated', 'abstract', 'async', 'modification', 'documentation'];
  const legend = new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers);
  context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider({ language: 'cffc' }, {
    provideDocumentSemanticTokens(document: vscode.TextDocument): vscode.ProviderResult<vscode.SemanticTokens> {
      if (ast != null) {
        let data = new Uint32Array(tokens);
        return new vscode.SemanticTokens(data);
      }
      return undefined;
    }
  }, legend));

  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(e => {
    const fileName = e.document.fileName;
    const languageId = e.document.languageId;

    // Check if the file is a cffc or caffeinec file
    if (languageId === 'cffc') {
      exec(`CaffeineC build -p -s="${e.document.getText()}"`, (error, stdout, stderr) => {
          if (error) {
            if (stderr) {
              if (stderr.startsWith("panic")) {
                let err = stderr.split("\n")[0];
                err = err.replace("panic: ", "");

                let split = err.split(":");

                const line = split.shift() || 0;
                const column = split.shift() || 0;
                const message = split.join(":");

                const range = new vscode.Range(new vscode.Position(+line - 1, +column - 1), new vscode.Position(+line - 1, +column));
                const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error);
                diagnostic.source = 'CaffeineC';
                diagnosticCollection.set(vscode.Uri.file(path.resolve(fileName)), [diagnostic]);
              }
            }
          } else {
            diagnosticCollection.clear();
            outputChannel.appendLine("This got called");
            ast = JSON.parse(stdout);
            tokens = processAst(ast);
          }
      });
    }
  }));
}

function processAst(ast: any): number[] {
  const tokens: number[] = [];
  ast["Statements"].forEach((statement: any) => {
    if (statement.VariableDefinition != null) {
      // Highlight variable definitions
      const { line, column } = getLineAndColumn(statement.VariableDefinition);
      tokens.push(line, column, statement.VariableDefinition.Name.length, TokenType.Variable, TokenModifiers.Definition);
    } else if (statement.Assignment != null) {
      // Highlight variable assignments
      const { line, column } = getLineAndColumn(statement.Assignment.Left);
      tokens.push(line, column, statement.Assignment.Left.Name.length, TokenType.Variable, TokenModifiers.Modification);
    } else if (statement.FunctionDefinition != null) {
      // Highlight function definitions
      const { line, column } = getLineAndColumn(statement.FunctionDefinition);
      tokens.push(line, column, statement.FunctionDefinition.Name.length, TokenType.Function, TokenModifiers.Definition);
    } else if (statement.Expression != null && statement.Expression.FunctionCall != null) {
      // Highlight function calls
      const { line, column } = getLineAndColumn(statement.Expression.FunctionCall);
      tokens.push(line, column, statement.Expression.FunctionCall.FunctionName.length, TokenType.Function, TokenModifiers.Invocation);
    }
  });
  return tokens;
}

function getLineAndColumn(obj: any): { line: number, column: number } {
  return {
    line: parseInt(obj['Pos']["Line"]),
    column: parseInt(obj['Pos']["Column"])
  };
}

enum TokenType {
  Variable = 0,
  Function = 1,
}

enum TokenModifiers {
  Definition = 0,
  Modification = 1,
  Invocation = 2,
}