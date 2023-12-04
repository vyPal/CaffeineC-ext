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
  const tokenModifiers = ['decleration', 'definition', 'readonly', 'static', 'deprecated', 'abstract', 'async', 'modification', 'documentation', 'invocation'];
  const legend = new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers);
  context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider({ language: 'cffc' }, {
    provideDocumentSemanticTokens(document: vscode.TextDocument): vscode.ProviderResult<vscode.SemanticTokens> {
      if (ast != null) {
        outputChannel.appendLine("Sending tokens: "+tokens);
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
            tokens = processAst(ast, outputChannel);
          }
      });
    }
  }));
}

function processAst(ast: any, o: vscode.OutputChannel): number[] {
  const tokens: number[] = [];
  ast["Statements"].forEach((statement: any) => {
    if (statement.VariableDefinition != null) {
      o.appendLine(JSON.stringify(statement.VariableDefinition, null, 2))
      // Highlight variable definitions
      const { line, column } = getLineAndColumn(statement.VariableDefinition);
      tokens.push(line, column, statement.VariableDefinition.Name.length, TokenType.variable, TokenModifiers.definition);
    } else if (statement.Assignment != null) {
      // Highlight variable assignments
      const { line, column } = getLineAndColumn(statement.Assignment.Left);
      tokens.push(line, column, statement.Assignment.Left.Name.length, TokenType.variable, TokenModifiers.modification);
    } else if (statement.FunctionDefinition != null) {
      // Highlight function definitions
      const { line, column } = getLineAndColumn(statement.FunctionDefinition);
      tokens.push(line, column, statement.FunctionDefinition.Name.length, TokenType.function, TokenModifiers.definition);
    } else if (statement.Expression != null && statement.Expression.FunctionCall != null) {
      // Highlight function calls
      const { line, column } = getLineAndColumn(statement.Expression.FunctionCall);
      tokens.push(line, column, statement.Expression.FunctionCall.FunctionName.length, TokenType.function, TokenModifiers.invocation);
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
  class = 0,
  function = 1,
  variable = 2,
  parameter = 3,
  property = 4,
  type = 5,
  string = 6,
  number = 7,
  keyword = 8,
  comment = 9,
  regexp = 10,
  operator = 11,
}

enum TokenModifiers {
  decleration = 0,
  definition = 1,
  readonly = 2,
  static = 3,
  deprecated = 4,
  abstract = 5,
  async = 6,
  modification = 7,
  documentation = 8,
  invocation = 9,
}