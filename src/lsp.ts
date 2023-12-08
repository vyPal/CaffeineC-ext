import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, StreamInfo } from 'vscode-languageclient/node.js';
import * as net from 'net';
import * as child_process from 'child_process';
import * as os from 'os';
import * as fs from 'fs';
import getPort from 'get-port';

export async function registerLSP(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
  // Find a free port
  const port = await getPort();

  let binary_ready = false;

  let serverOptions: ServerOptions = async () => {
    let binaryPath = context.asAbsolutePath('./lsp/lsp');
    let lspPath = context.asAbsolutePath('./lsp');

    // Adjust the binary path based on the operating system
    switch (os.platform()) {
      case 'win32':
        binaryPath += '.exe';
        break;
      case 'darwin':
        binaryPath += '-mac';
        break;
      // Add cases for other platforms as needed
    }

    // Check if the binary exists
    if (!fs.existsSync(binaryPath)) {
      // Build the LSP server
      await new Promise<void>((resolve, reject) => {
        child_process.exec('cd ' + lspPath + ' && go build -o ' + binaryPath + ' .', (error, stdout, stderr) => {
          if (error) {
            console.error(`Failed to build server: ${error}`);
            reject(error);
            return;
          }
          outputChannel.appendLine(`Server build output: ${stdout}`);
          resolve();
        });
      });
    }

    // Start the server
    const serverProcess = child_process.spawn(binaryPath, [`--port=${port}`], { env: process.env });

    return new Promise((resolve, reject) => {
      serverProcess.stderr.on('data', (data) => {
        console.error(`Server error: ${data}`);
      });

      serverProcess.stdout.on('data', (data) => {
        outputChannel.appendLine(`Server: ${data}`);
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