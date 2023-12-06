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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerParser = void 0;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const vscode = __importStar(require("vscode"));
const tokenTypes = ['namespace', 'class', 'enum', 'interface', 'struct', 'typeParameter', 'type', 'parameter', 'variable', 'property', 'enumMember', 'decorator', 'event', 'function', 'method', 'macro', 'label', 'comment', 'string', 'keyword', 'number', 'regexp', 'operator'];
const tokenModifiers = ['declaration', 'definition', 'readonly', 'static', 'deprecated', 'abstract', 'async', 'modification', 'documentation', 'defaultLibrary'];
const legend = new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers);
let ast = null;
function registerParser(context, diagnosticCollection, ouputChannel) {
    context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider({ language: 'cffc' }, {
        provideDocumentSemanticTokens(document) {
            if (ast != null) {
                const builder = new vscode.SemanticTokensBuilder(legend);
                ast["Statements"].forEach((statement) => {
                    if (statement.VariableDefinition != null) {
                        // Highlight variable definitions
                        const { line, column } = getLineAndColumn(statement.VariableDefinition);
                        let varStart = new vscode.Position(line, column);
                        let varEnd = varStart.translate(0, 3);
                        let nameStart = varEnd.translate(0, 1);
                        let nameEnd = nameStart.translate(0, statement.VariableDefinition.Name.length);
                        builder.push(new vscode.Range(varStart, varEnd), 'keyword', []);
                        builder.push(new vscode.Range(nameStart, nameEnd), 'variable', ['declaration']);
                    }
                    else if (statement.Assignment != null) {
                        // Highlight variable assignments
                        const { line, column } = getLineAndColumn(statement.Assignment.Left);
                        builder.push(new vscode.Range(new vscode.Position(line, column), new vscode.Position(line, column + statement.Assignment.Left.Name.length)), 'variable', ['modification']);
                        //tokens.push(line, column, statement.Assignment.Left.Name.length, TokenType.variable, 3);
                    }
                });
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
            (0, child_process_1.exec)(`CaffeineC build -p -s="${e.document.getText()}"`, (error, stdout, stderr) => {
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
                            diagnosticCollection.set(vscode.Uri.file(path_1.default.resolve(fileName)), [diagnostic]);
                        }
                    }
                }
                else {
                    diagnosticCollection.clear();
                    ast = JSON.parse(stdout);
                }
            });
        }
    }));
}
exports.registerParser = registerParser;
function getLineAndColumn(obj) {
    return {
        line: parseInt(obj['Pos']["Line"]) - 1,
        column: parseInt(obj['Pos']["Column"]) - 1
    };
}
//# sourceMappingURL=parser.js.map