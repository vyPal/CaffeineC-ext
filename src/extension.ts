import * as vscode from 'vscode';
import { registerHover } from './hover.js';
import { registerLSP } from './lsp.js';
import * as child_process from 'child_process';
import * as https from 'https';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export async function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('CaffeineC');

  child_process.exec('CaffeineC --version', (error, stdout, stderr) => {
    if (error) {
      // If the command does not exist, set the 'caffeinec.compiler_not_installed' context to true
      vscode.commands.executeCommand('setContext', 'caffeinec.compiler_not_installed', true);
      vscode.window.showInformationMessage('The CaffeineC compiler was not detected on your system. Would you like to install it?', "Yes", "No").then(val => {
        if (val == "Yes") {
          const scriptUrl = os.platform() === 'win32' ? 
            'https://raw.githubusercontent.com/vyPal/CaffeineC/master/install.ps1' : 
            'https://raw.githubusercontent.com/vyPal/CaffeineC/master/install.bash';
          const scriptPath = path.join(os.tmpdir(), 'install_caffeinec' + (os.platform() === 'win32' ? '.ps1' : '.bash'));

          vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Installing CaffeineC",
            cancellable: false
          }, (progress, token) => {
            return new Promise((resolve, reject) => {
              const file = fs.createWriteStream(scriptPath);
              https.get(scriptUrl, response => {
                response.pipe(file);

                file.on('finish', () => {
                  file.close();  // close() is async, call cb after close completes.

                  const cmd = os.platform() === 'win32' ? `powershell.exe -File ${scriptPath}` : `bash ${scriptPath}`;
                  child_process.exec(cmd, (error, stdout, stderr) => {
                    if (error) {
                      vscode.window.showErrorMessage(`Error installing CaffeineC: ${error.message}`);
                      reject(error);
                    } else {
                      vscode.window.showInformationMessage('CaffeineC installed successfully');
                      resolve(null);
                    }
                  });
                });
              }).on('error', err => { // Handle errors
                fs.unlink(scriptPath, () => {}); // Delete the file async. (But we don't check the result)
                vscode.window.showErrorMessage(`Error downloading install script: ${err.message}`);
                reject(err);
              });
            });
          });
        }
      });
    } else {
      // Extract the version number from the output
      const installedVersion = stdout.split(' ')[2].trim();

      // Fetch the latest release from the GitHub API
      https.get('https://api.github.com/repos/vyPal/CaffeineC/releases/latest', { headers: { 'User-Agent': 'node.js' } }, res => {
        let data = '';

        // A chunk of data has been received.
        res.on('data', chunk => {
          data += chunk;
        });

        // The whole response has been received.
        res.on('end', () => {
          const latestRelease = JSON.parse(data);
          const latestVersion = latestRelease.tag_name.substring(1); // Remove the 'v' from the start of the tag

          // Compare the installed version with the latest version
          if (installedVersion !== latestVersion) {
            vscode.window.showInformationMessage(`A new version of CaffeineC is available: ${latestVersion}`, "Update", "Ignore").then(val => {
              if (val == "Update") {
                child_process.exec('CaffeineC update', (error) => {
                  if (error) {
                    vscode.window.showErrorMessage("Error updating the CaffeineC compiler: "+error)
                  }
                })
              }
            })
          }
        });
      }).on('error', err => {
        console.error(`Error fetching the latest release: ${err.message}`);
      });
    }
  });

  registerHover(context, outputChannel);
  await registerLSP(context, outputChannel);


}