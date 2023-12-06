import * as vscode from 'vscode';
import { registerHover } from './hover.js';
import { registerLSP } from './lsp.js';

export async function activate(context: vscode.ExtensionContext) {
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('cffc');
  const outputChannel = vscode.window.createOutputChannel('CaffeineC');

  registerHover(context);
  // registerParser(context, diagnosticCollection, outputChannel);
  await registerLSP(context);
}