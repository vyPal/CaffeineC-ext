import * as vscode from 'vscode';

export function registerHover(context: vscode.ExtensionContext, out: vscode.OutputChannel) {
  context.subscriptions.push(vscode.languages.registerHoverProvider('cffc', {
    provideHover(document, position, token) {
      const range = document.getWordRangeAtPosition(position, /[*\w]+/);
      const word = document.getText(range);

      if (word.startsWith('*')) {
        let npointer = word.split('*').length - 1;
        let newWord = word.replace(/\*/g, '');

        if (newWord.startsWith('i')) {
          newWord = newWord.replace('i', '');

          let int = parseInt(newWord);

          if (!isNaN(int)) {
            return intHover(int, npointer);
          }
        } else if (newWord.startsWith('u')) {
          newWord = newWord.replace('u', '');

          let uint = parseInt(newWord);

          if (!isNaN(uint)) {
            return uintHover(uint, npointer);
          }
        } else if (word.startsWith('f')) {
          let newWord = word.replace('f', '');
  
          let float = parseInt(newWord);
  
          if (!isNaN(float)) {
            return floatHover(float, 0);
          }
        }
      } else if (word.startsWith('i')) {
        let newWord = word.replace('i', '');

        let int = parseInt(newWord);

        if (!isNaN(int)) {
          return intHover(int, 0);
        }
      } else if (word.startsWith('u')) {
        let newWord = word.replace('u', '');

        let uint = parseInt(newWord);

        if (!isNaN(uint)) {
          return uintHover(uint, 0);
        }
      } else if (word.startsWith('f')) {
        let newWord = word.replace('f', '');

        let float = parseInt(newWord);

        if (!isNaN(float)) {
          return floatHover(float, 0);
        }
      } else if (word == 'true' || word == 'false' || word == 'bool') {
        return new vscode.Hover(
          `## \`bool\` Primitive Type\n\n` +
          `The \`bool\` type represents a **boolean**.\n\n` +
          `### Specifications\n\n` +
          `- **Size**: 1 bits\n` +
          `- **Range**: 0 to 1\n\n` +
          '### Example\n\n' +
          'Here is an example of a \`bool\` declaration:\n\n' +
          '```cffc\n' +
          `var a: bool = ${word};\n` +
          '```'
        );
      } else if (word == 'void') {
        return new vscode.Hover(
          `## \`void\` Primitive Type\n\n` +
          `The \`void\` type represents a **void**.\n\n` +
          `### Specifications\n\n` +
          `- **Size**: 0 bits\n` +
          `- **Range**: 0 to 0\n\n` +
          '### Example\n\n' +
          'Here is an example of a \`void\` declaration:\n\n' +
          '```cffc\n' +
          `var a: void;\n` +
          '```'
        );
      }

      return undefined;
    }
  }));
}

function intHover(int: number, ptr: number): vscode.Hover {
  return new vscode.Hover(
    `## ${"pointer to ".repeat(ptr)}\`i${int}\` Primitive Type\n\n` +
    `The \`${"*".repeat(ptr)}i${int}\` type represents a ${"pointer to ".repeat(ptr)}${ptr > 0 ? "a " : ""}**signed ${int}-bit integer**.\n\n` +
    `### Specifications${ptr > 0 ? ` of i${int}` : ""}\n\n` +
    `- **Size**: ${int} bits\n` +
    `- **Range**: -${2**(int-1)} to ${2**(int-1)-1}\n\n` +
    '### Example\n\n' +
    `Here is an example of an \`${"*".repeat(ptr)}i${int}\` declaration:\n\n` +
    '```cffc\n' +
    `var a: ${"*".repeat(ptr)}i${int} = ${ptr > 0 ? Math.floor(Math.random() * 2**int) : Math.floor(Math.random() * 2**int-2**(int-1)+1)};\n` +
    '```'
  );
}

function uintHover(int: number, ptr: number): vscode.Hover {
  return new vscode.Hover(
    `## ${"pointer to ".repeat(ptr)}\`u${int}\` Primitive Type\n\n` +
    `The \`${"*".repeat(ptr)}u${int}\` type represents a ${"pointer to ".repeat(ptr)}${ptr > 0 ? "an " : ""}**un-signed ${int}-bit integer**.\n\n` +
    `### Specifications${ptr > 0 ? ` of u${int}` : ""}\n\n` +
    `- **Size**: ${int} bits\n` +
    `- **Range**: 0 to ${2**int}\n\n` +
    '### Example\n\n' +
    `Here is an example of an \`${"*".repeat(ptr)}u${int}\` declaration:\n\n` +
    '```cffc\n' +
    `var a: ${"*".repeat(ptr)}u${int} = ${Math.floor(Math.random() * 2**int)};\n` +
    '```'
  );
}

function floatHover(int: number, ptr: number): vscode.Hover {
  return new vscode.Hover(
    `## ${"pointer to ".repeat(ptr)}\`f${int}\` Primitive Type\n\n` +
    `The \`${"*".repeat(ptr)}f${int}\` type represents a ${"pointer to ".repeat(ptr)}${ptr > 0 ? "a " : ""}**${int}-bit floating point number**.\n\n` +
    `### Specifications${ptr > 0 ? ` of f${int}` : ""}\n\n` +
    `- **Size**: ${int} bits\n` +
    `- **Range**: -${2**(int-1)} to ${2**(int-1)-1}\n\n` +
    '### Example\n\n' +
    `Here is an example of an \`${"*".repeat(ptr)}f${int}\` declaration:\n\n` +
    '```cffc\n' +
    `var a: ${"*".repeat(ptr)}f${int} = ${Math.random() * 2**int-2**(int-1)+1};\n` +
    '```'
  );
}