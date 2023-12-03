import * as vscode from 'vscode';

export function registerHover(context: vscode.ExtensionContext) {
  context.subscriptions.push(vscode.languages.registerHoverProvider('cffc', {
    provideHover(document, position, token) {
      const range = document.getWordRangeAtPosition(position, /[*\w]+/);
      const word = document.getText(range);

      switch (word) {
        case 'int':
          return new vscode.Hover(
            '**`int`**\n\n' +
            'The `int` type represents a signed integer.\n\n' +
            '- **Size**: 64 bits\n' +
            '- **Range**: -9223372036854775808 to 9223372036854775807\n\n' +
            'Example of `int` declaration:\n\n' +
            '```cffc\n' +
            'var a: int = 123;\n' +
            '```'
        );
        case 'i8':
          return new vscode.Hover(
              '**`i8`**\n\n' +
              'The `i8` type represents a signed 8-bit integer.\n\n' +
              '- **Size**: 8 bits\n' +
              '- **Range**: -128 to 127\n\n' +
              'Example of `i8` declaration:\n\n' +
              '```cffc\n' +
              'var a: i8 = 123;\n' +
              '```'
          );
      }

      return undefined;
    }
  }));
}