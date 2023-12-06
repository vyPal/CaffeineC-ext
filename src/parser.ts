import { exec } from 'child_process';
import path from 'path';
import * as vscode from 'vscode';

const tokenTypes = ['namespace', 'class', 'enum', 'interface', 'struct', 'typeParameter', 'type', 'parameter', 'variable', 'property', 'enumMember', 'decorator', 'event', 'function', 'method', 'macro', 'label', 'comment', 'string', 'keyword', 'number', 'regexp', 'operator'];
const tokenModifiers = ['declaration', 'definition', 'readonly', 'static', 'deprecated', 'abstract', 'async', 'modification', 'documentation', 'defaultLibrary'];
const legend = new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers);

let ast: any = null;

export function registerParser(context: vscode.ExtensionContext, diagnosticCollection: vscode.DiagnosticCollection, ouputChannel: vscode.OutputChannel) {
  context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider({ language: 'cffc' }, {
    provideDocumentSemanticTokens(document: vscode.TextDocument): vscode.ProviderResult<vscode.SemanticTokens> {
      if (ast != null) {
        const builder = new vscode.SemanticTokensBuilder(legend)
        ast["Statements"].forEach((statement: any) => {
          if (statement.VariableDefinition != null) {
            // Highlight variable definitions
            const { line, column } = getLineAndColumn(statement.VariableDefinition);
            let varStart = new vscode.Position(line, column)
            let varEnd = varStart.translate(0, 3)
            let nameStart = varEnd.translate(0, 1)
            let nameEnd = nameStart.translate(0, statement.VariableDefinition.Name.length)
            builder.push(
              new vscode.Range(varStart, varEnd),
              'keyword',
              []
            );
            builder.push(
              new vscode.Range(nameStart, nameEnd),
              'variable',
              ['declaration']
            );
          } else if (statement.Assignment != null) {
            // Highlight variable assignments
            const { line, column } = getLineAndColumn(statement.Assignment.Left);
            builder.push(
              new vscode.Range(new vscode.Position(line, column), new vscode.Position(line, column + statement.Assignment.Left.Name.length)),
              'variable',
              ['modification']
            );
            //tokens.push(line, column, statement.Assignment.Left.Name.length, TokenType.variable, 3);
          }
        })
        return builder.build();
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
            ast = JSON.parse(stdout);
          }
      });
    }
  }));
}

function getLineAndColumn(obj: any): { line: number, column: number } {
  return {
    line: parseInt(obj['Pos']["Line"]) - 1,
    column: parseInt(obj['Pos']["Column"]) - 1
  };
}