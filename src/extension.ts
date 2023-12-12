import * as vscode from 'vscode';
import { registerHover } from './hover.js';
import { registerLSP } from './lsp.js';

export async function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('CaffeineC');

  registerHover(context);
  //await registerLSP(context, outputChannel);
}