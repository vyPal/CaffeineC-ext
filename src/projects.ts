import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activateProjects(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
  checkCfconfFile(context, vscode.window.activeTextEditor, outputChannel);
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((editor) => {
    checkCfconfFile(context, editor, outputChannel);
  }));
}

function checkCfconfFile(context: vscode.ExtensionContext, editor: vscode.TextEditor | undefined, outputChannel: vscode.OutputChannel) {
  if (editor && editor.document.languageId === 'cffc') {
    const fileDir = path.dirname(editor.document.uri.fsPath);
    let workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
      
    if (workspaceFolder) {
      let currentDir = fileDir;

      while (currentDir.startsWith(workspaceFolder.uri.fsPath)) {
        if (fs.existsSync(path.join(currentDir, 'cfconf.yaml'))) {
          outputChannel.appendLine('cfconf.yaml found in ' + currentDir);
          context.workspaceState.update('cfconfFile', path.join(currentDir, 'cfconf.yaml'));
          break;
        }
        currentDir = path.dirname(currentDir);
      }
    }
  }
}