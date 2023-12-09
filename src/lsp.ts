import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, StreamInfo } from 'vscode-languageclient/node.js';
import * as net from 'net';
import * as child_process from 'child_process';
import * as os from 'os';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';
import getPort from 'get-port';

// Generate a checksum of the source code and its dependencies
function generateChecksum(directory: string): string {
  let hash = crypto.createHash('sha256');

  fs.readdirSync(directory).forEach(file => {
    let filePath = path.join(directory, file);

    if (fs.lstatSync(filePath).isDirectory()) {
      hash.update(generateChecksum(filePath));
    } else {
      hash.update(fs.readFileSync(filePath));
    }
  });

  return hash.digest('hex');
}

// Store the checksum in a file
function storeChecksum(checksum: string, file: string) {
  fs.writeFileSync(file, checksum);
}

// Compare the stored checksum with the current checksum
function needsRebuild(directory: string, file: string): boolean {
  let currentChecksum = generateChecksum(directory);
  let storedChecksum = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';

  return currentChecksum !== storedChecksum;
}

export async function registerLSP(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
  // Find a free port
  const port = await getPort();

  let serverOptions: ServerOptions = async () => {
    let binaryPath = context.asAbsolutePath('./built-lsp/lsp');
    let checksumFile = context.asAbsolutePath('./built-lsp/checksum.txt');
    let sourceDirectory = context.asAbsolutePath('./lsp');

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
    if (!fs.existsSync(binaryPath) || needsRebuild(sourceDirectory, checksumFile)) {
      // Build the LSP server
      outputChannel.appendLine('Building server...');
      await new Promise<void>((resolve, reject) => {
        child_process.exec('cd ' + sourceDirectory + ' && go build -o ' + binaryPath + ' .', (error, stdout, stderr) => {
          if (error) {
            console.error(`Failed to build server: ${error}`);
            reject(error);
            return;
          }
          outputChannel.appendLine(`Server build output: ${stdout}`);
          storeChecksum(generateChecksum(sourceDirectory), checksumFile);
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