"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerLSP = void 0;
const vscode = __importStar(require("vscode"));
const node_js_1 = require("vscode-languageclient/node.js");
const net = __importStar(require("net"));
const child_process = __importStar(require("child_process"));
const getPort = require("get-port");
async function registerLSP(context) {
    // Find a free port
    const port = await getPort.default();
    let serverOptions = async () => {
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
                let result = {
                    writer: socket,
                    reader: socket
                };
                resolve(result);
            }, 150); // Wait 1 second for the server to start
        });
    };
    // Options for the language client
    let clientOptions = {
        documentSelector: [{ scheme: 'file', language: 'cffc' }],
        synchronize: {
            configurationSection: 'cffc',
            fileEvents: vscode.workspace.createFileSystemWatcher('**/.cffc')
        }
    };
    // Create and start the language client
    let client = new node_js_1.LanguageClient('cffc', 'CaffeineC Language Server', serverOptions, clientOptions);
    await client.start();
    context.subscriptions.push(client);
}
exports.registerLSP = registerLSP;
//# sourceMappingURL=lsp.js.map