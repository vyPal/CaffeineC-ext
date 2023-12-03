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
exports.registerHover = void 0;
const vscode = __importStar(require("vscode"));
function registerHover(context) {
    context.subscriptions.push(vscode.languages.registerHoverProvider('cffc', {
        provideHover(document, position, token) {
            const range = document.getWordRangeAtPosition(position, /[*\w]+/);
            const word = document.getText(range);
            switch (word) {
                case 'int':
                    return new vscode.Hover('**`int`**\n\n' +
                        'The `int` type represents a signed integer.\n\n' +
                        '- **Size**: 64 bits\n' +
                        '- **Range**: -9223372036854775808 to 9223372036854775807\n\n' +
                        'Example of `int` declaration:\n\n' +
                        '```cffc\n' +
                        'var a: int = 123;\n' +
                        '```');
                case 'i8':
                    return new vscode.Hover('**`i8`**\n\n' +
                        'The `i8` type represents a signed 8-bit integer.\n\n' +
                        '- **Size**: 8 bits\n' +
                        '- **Range**: -128 to 127\n\n' +
                        'Example of `i8` declaration:\n\n' +
                        '```cffc\n' +
                        'var a: i8 = 123;\n' +
                        '```');
            }
            return undefined;
        }
    }));
}
exports.registerHover = registerHover;
//# sourceMappingURL=hover.js.map