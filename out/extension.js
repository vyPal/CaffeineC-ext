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
exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
const hover_1 = require("./hover");
const path_1 = __importDefault(require("path"));
function activate(context) {
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('cffc');
    const outputChannel = vscode.window.createOutputChannel('CaffeineC');
    let ast = null;
    let tokens = [];
    (0, hover_1.registerHover)(context);
    const tokenTypes = ['class', 'function', 'variable', 'parameter', 'property', 'type', 'string', 'number', 'keyword', 'comment', 'regexp', 'operator'];
    const tokenModifiers = ['decleration', 'definition', 'readonly', 'static', 'deprecated', 'abstract', 'async', 'modification', 'documentation', 'invocation'];
    const legend = new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers);
    context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider({ language: 'cffc' }, {
        provideDocumentSemanticTokens(document) {
            if (ast != null) {
                outputChannel.appendLine("Sending tokens: " + tokens);
                let data = new Uint32Array(tokens);
                return new vscode.SemanticTokens(data);
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
                    outputChannel.appendLine("This got called");
                    ast = JSON.parse(stdout);
                    tokens = processAst(ast, outputChannel);
                }
            });
        }
    }));
}
exports.activate = activate;
function processAst(ast, o) {
    const tokens = [];
    ast["Statements"].forEach((statement) => {
        if (statement.VariableDefinition != null) {
            o.appendLine(JSON.stringify(statement.VariableDefinition, null, 2));
            // Highlight variable definitions
            const { line, column } = getLineAndColumn(statement.VariableDefinition);
            tokens.push(line, column, statement.VariableDefinition.Name.length, TokenType.variable, TokenModifiers.definition);
        }
        else if (statement.Assignment != null) {
            // Highlight variable assignments
            const { line, column } = getLineAndColumn(statement.Assignment.Left);
            tokens.push(line, column, statement.Assignment.Left.Name.length, TokenType.variable, TokenModifiers.modification);
        }
        else if (statement.FunctionDefinition != null) {
            // Highlight function definitions
            const { line, column } = getLineAndColumn(statement.FunctionDefinition);
            tokens.push(line, column, statement.FunctionDefinition.Name.length, TokenType.function, TokenModifiers.definition);
        }
        else if (statement.Expression != null && statement.Expression.FunctionCall != null) {
            // Highlight function calls
            const { line, column } = getLineAndColumn(statement.Expression.FunctionCall);
            tokens.push(line, column, statement.Expression.FunctionCall.FunctionName.length, TokenType.function, TokenModifiers.invocation);
        }
    });
    return tokens;
}
function getLineAndColumn(obj) {
    return {
        line: parseInt(obj['Pos']["Line"]),
        column: parseInt(obj['Pos']["Column"])
    };
}
var TokenType;
(function (TokenType) {
    TokenType[TokenType["class"] = 0] = "class";
    TokenType[TokenType["function"] = 1] = "function";
    TokenType[TokenType["variable"] = 2] = "variable";
    TokenType[TokenType["parameter"] = 3] = "parameter";
    TokenType[TokenType["property"] = 4] = "property";
    TokenType[TokenType["type"] = 5] = "type";
    TokenType[TokenType["string"] = 6] = "string";
    TokenType[TokenType["number"] = 7] = "number";
    TokenType[TokenType["keyword"] = 8] = "keyword";
    TokenType[TokenType["comment"] = 9] = "comment";
    TokenType[TokenType["regexp"] = 10] = "regexp";
    TokenType[TokenType["operator"] = 11] = "operator";
})(TokenType || (TokenType = {}));
var TokenModifiers;
(function (TokenModifiers) {
    TokenModifiers[TokenModifiers["decleration"] = 0] = "decleration";
    TokenModifiers[TokenModifiers["definition"] = 1] = "definition";
    TokenModifiers[TokenModifiers["readonly"] = 2] = "readonly";
    TokenModifiers[TokenModifiers["static"] = 3] = "static";
    TokenModifiers[TokenModifiers["deprecated"] = 4] = "deprecated";
    TokenModifiers[TokenModifiers["abstract"] = 5] = "abstract";
    TokenModifiers[TokenModifiers["async"] = 6] = "async";
    TokenModifiers[TokenModifiers["modification"] = 7] = "modification";
    TokenModifiers[TokenModifiers["documentation"] = 8] = "documentation";
    TokenModifiers[TokenModifiers["invocation"] = 9] = "invocation";
})(TokenModifiers || (TokenModifiers = {}));
//# sourceMappingURL=extension.js.map