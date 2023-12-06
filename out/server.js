"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_1 = require("vscode-languageserver/node");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
let connection = (0, node_1.createConnection)(node_1.ProposedFeatures.all);
let documents = new node_1.TextDocuments(vscode_languageserver_textdocument_1.TextDocument);
connection.onInitialize(() => {
    return {
        capabilities: {
            textDocumentSync: node_1.TextDocumentSyncKind.Full
        }
    };
});
documents.listen(connection);
connection.listen();
//# sourceMappingURL=server.js.map