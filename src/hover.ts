import * as vscode from 'vscode';

export function registerHover(context: vscode.ExtensionContext) {
  context.subscriptions.push(vscode.languages.registerHoverProvider('cffc', {
    provideHover(document, position, token) {
      const range = document.getWordRangeAtPosition(position, /[*\w]+/);
      const word = document.getText(range);

      switch (word) {

        // --------------------------------------------------
        // Integers
        // --------------------------------------------------

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
        case 'i16':
          return new vscode.Hover(
            '**`i16`**\n\n' +
            'The `i16` type represents a signed 16-bit integer.\n\n' +
            '- **Size**: 16 bits\n' +
            '- **Range**: -32768 - 32767\n\n' +
            'Example of `i16` declaration:\n\n' +
            '```cffc\n' +
            'var a: i16 = 123;\n' +
            '```'
          );
        case 'i32':
          return new vscode.Hover(
            '**`i32`**\n\n' +
            'The `i32` type represents a signed 32-bit integer.\n\n' +
            '- **Size**: 32 bits\n' +
            '- **Range**: -2147483648 - 2147483647\n\n' +
            'Example of `i32` declaration:\n\n' +
            '```cffc\n' +
            'var a: i32 = 123;\n' +
            '```'
          );
        case 'i64':
          return new vscode.Hover(
            '**`i64`**\n\n' +
            'The `i64` type represents a signed 64-bit integer.\n\n' +
            '- **Size**: 64 bits\n' +
            '- **Range**: -9223372036854775808 to 9223372036854775807\n\n' +
            'Example of `i64` declaration:\n\n' +
            '```cffc\n' +
            'var a: i64 = 123;\n' +
            '```'
          );

        case 'u8':
          return new vscode.Hover(
            '**`u8`**\n\n' +
            'The `u8` type represents a unsigned 8-bit integer.\n\n' +
            '- **Size**: 8 bits\n' +
            '- **Range**: 0 - 256\n\n' +
            'Example of `u8` declaration:\n\n' +
            '```cffc\n' +
            'var a: u8 = 123;\n' +
            '```'
          );
        case 'u16':
          return new vscode.Hover(
            '**`u16`**\n\n' +
            'The `u16` type represents a unsigned 16-bit integer.\n\n' +
            '- **Size**: 16 bits\n' +
            '- **Range**: 0 - 65536\n\n' +
            'Example of `u16` declaration:\n\n' +
            '```cffc\n' +
            'var a: u16 = 123;\n' +
            '```'
          );
        case 'u32':
          return new vscode.Hover(
            '**`u32`**\n\n' +
            'The `u32` type represents a unsigned 32-bit integer.\n\n' +
            '- **Size**: 32 bits\n' +
            '- **Range**: 0 - 4294967296\n\n' +
            'Example of `u32` declaration:\n\n' +
            '```cffc\n' +
            'var a: u32 = 123;\n' +
            '```'
          );
        case 'u64':
          return new vscode.Hover(
            '**`u64`**\n\n' +
            'The `u64` type represents a unsigned 64-bit integer.\n\n' +
            '- **Size**: 64 bits\n' +
            '- **Range**: 0 - 18446744073709551615\n\n' +
            'Example of `u64` declaration:\n\n' +
            '```cffc\n' +
            'var a: u64 = 123;\n' +
            '```'
          );

        // --------------------------------------------------
        // Floats
        // --------------------------------------------------

        case 'float':
          return new vscode.Hover(
            '**`float`**\n\n' +
            'The `float` type represents a signed floating point number.\n\n' +
            '- **Size**: 32 bits\n' +
            '- **Range**: -3.402823e+38 to 3.402823e+38\n\n' +
            'Example of `float` declaration:\n\n' +
            '```cffc\n' +
            'var a: float = 123.456;\n' +
            '```'
          );
        case 'double':
          return new vscode.Hover(
            '**`double`**\n\n' +
            'The `double` type represents a signed double-precision floating point number.\n\n' +
            '- **Size**: 64 bits\n' +
            '- **Range**: -1.797693e+308 to 1.797693e+308\n\n' +
            'Example of `double` declaration:\n\n' +
            '```cffc\n' +
            'var a: double = 123.456;\n' +
            '```'
          );
        case 'f32':
          return new vscode.Hover(
            '**`f32`**\n\n' +
            'The `f32` type represents a signed 32-bit floating point number.\n\n' +
            '- **Size**: 32 bits\n' +
            '- **Range**: -3.402823e+38 to 3.402823e+38\n\n' +
            'Example of `f32` declaration:\n\n' +
            '```cffc\n' +
            'var a: f32 = 123.456;\n' +
            '```'
          );
        case 'f64':
          return new vscode.Hover(
            '**`f64`**\n\n' +
            'The `f64` type represents a signed 64-bit floating point number.\n\n' +
            '- **Size**: 64 bits\n' +
            '- **Range**: -1.797693e+308 to 1.797693e+308\n\n' +
            'Example of `f64` declaration:\n\n' +
            '```cffc\n' +
            'var a: f64 = 123.456;\n' +
            '```'
          );
        
        // --------------------------------------------------
        // Strings
        // --------------------------------------------------

        case 'string':
          return new vscode.Hover(
            '**`string`**\n\n' +
            'The `string` type represents a UTF-8 encoded string.\n\n' +
            'It is stored as a pointer to a null-terminated array of `u8`.\n\n' +
            'Example of `string` declaration:\n\n' +
            '```cffc\n' +
            'var a: string = "Hello, World!";\n' +
            '```'
          );
        
        // --------------------------------------------------
        // Pointers
        // --------------------------------------------------

        case 'ptr':
          return new vscode.Hover(
            '**`ptr`**\n\n' +
            'The `ptr` type represents a pointer to a value of any type.\n\n' +
            'Example of `ptr` declaration:\n\n' +
            '```cffc\n' +
            'var a: ptr = 0;\n' +
            '```'
          );
        
        case '*i8':
          return new vscode.Hover(
            '**`*i8`**\n\n' +
            'The `*i8` type represents a pointer to a signed 8-bit integer.\n\n' +
            'Example of `*i8` declaration:\n\n' +
            '```cffc\n' +
            'var a: *i8 = 0;\n' +
            '```'
          );
        
        case '*i16':
          return new vscode.Hover(
            '**`*i16`**\n\n' +
            'The `*i16` type represents a pointer to a signed 16-bit integer.\n\n' +
            'Example of `*i16` declaration:\n\n' +
            '```cffc\n' +
            'var a: *i16 = 0;\n' +
            '```'
          );

        case '*i32':
          return new vscode.Hover(
            '**`*i32`**\n\n' +
            'The `*i32` type represents a pointer to a signed 32-bit integer.\n\n' +
            'Example of `*i32` declaration:\n\n' +
            '```cffc\n' +
            'var a: *i32 = 0;\n' +
            '```'
          );

        case '*i64':
          return new vscode.Hover(
            '**`*i64`**\n\n' +
            'The `*i64` type represents a pointer to a signed 64-bit integer.\n\n' +
            'Example of `*i64` declaration:\n\n' +
            '```cffc\n' +
            'var a: *i64 = 0;\n' +
            '```'
          );

        case '*u8':
          return new vscode.Hover(
            '**`*u8`**\n\n' +
            'The `*u8` type represents a pointer to a unsigned 8-bit integer.\n\n' +
            'Example of `*u8` declaration:\n\n' +
            '```cffc\n' +
            'var a: *u8 = 0;\n' +
            '```'
          );

        case '*u16':
          return new vscode.Hover(
            '**`*u16`**\n\n' +
            'The `*u16` type represents a pointer to a unsigned 16-bit integer.\n\n' +
            'Example of `*u16` declaration:\n\n' +
            '```cffc\n' +
            'var a: *u16 = 0;\n' +
            '```'
          );

        case '*u32':
          return new vscode.Hover(
            '**`*u32`**\n\n' +
            'The `*u32` type represents a pointer to a unsigned 32-bit integer.\n\n' +
            'Example of `*u32` declaration:\n\n' +
            '```cffc\n' +
            'var a: *u32 = 0;\n' +
            '```'
          );

        case '*u64':
          return new vscode.Hover(
            '**`*u64`**\n\n' +
            'The `*u64` type represents a pointer to a unsigned 64-bit integer.\n\n' +
            'Example of `*u64` declaration:\n\n' +
            '```cffc\n' +
            'var a: *u64 = 0;\n' +
            '```'
          );
        
        // --------------------------------------------------
        // Others
        // --------------------------------------------------

        case 'void':
          return new vscode.Hover(
            '**`void`**\n\n' +
            'The `void` type represents an empty type.\n\n' +
            'Example of `void` declaration:\n\n' +
            '```cffc\n' +
            'var a: void = 0;\n' +
            '```'
          );
        
        case 'bool':
          return new vscode.Hover(
            '**`bool`**\n\n' +
            'The `bool` type represents a boolean value.\n\n' +
            'Example of `bool` declaration:\n\n' +
            '```cffc\n' +
            'var a: bool = true;\n' +
            '```'
          );
      }

      return undefined;
    }
  }));
}