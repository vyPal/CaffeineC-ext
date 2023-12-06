import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, StreamInfo } from 'vscode-languageclient/node.js';
import * as net from 'net';
import * as child_process from 'child_process';
import getPort from 'get-port';

export async function registerLSP(context: vscode.ExtensionContext) {
  // Find a free port
  const port = await getPort();

  let serverOptions: ServerOptions = async () => {
    // Start the server
    const serverProcess = child_process.spawn(context.asAbsolutePath('./lsp/lsp'), [`--port=${port}`], { env: process.env });

    return new Promise((resolve, reject) => {
      serverProcess.stderr.on('data', (data) => {
        console.error(`Server error: ${data}`);
      });

      serverProcess.stdout.on('data', (data) => {
        console.log(`Server: ${data}`);
      });

      serverProcess.on('exit', (code, signal) => {
        console.log(`Server exited with code ${code} and signal ${signal}`);
      });

      serverProcess.on('error', (error) => {
        console.error(`Failed to start server: ${error}`);
        reject(error);
      });

      // Wait for the server to start
      setTimeout(() => {
        // Connect to the server's port
        let socket = net.connect({ port: port });

        let result: StreamInfo = {
          writer: socket,
          reader: socket
        };

        resolve(result);
      }, 150); // Wait 1 second for the server to start
    });
  };

  // Options for the language client
  let clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'cffc' }],
    synchronize: {
      configurationSection: 'cffc',
      fileEvents: vscode.workspace.createFileSystemWatcher('**/.cffc')
    }
  };

  // Create and start the language client
  let client = new LanguageClient('cffc', 'CaffeineC Language Server', serverOptions, clientOptions);
  await client.start();
  context.subscriptions.push(client);
}