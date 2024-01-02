package main

import (
	"strconv"

	"github.com/alecthomas/participle/v2/lexer"
)

type Bool struct {
	Value bool
	Str   string
	Pos   lexer.Position
}

func (b *Bool) Capture(values []string) error {
	b.Value = values[0] == "true"
	b.Str = values[0]
	return nil
}

type Duration struct {
	Pos    lexer.Position
	Number float64
	Unit   string
}

func (d *Duration) Capture(values []string) error {
	num, err := strconv.ParseFloat(values[0], 64)
	if err != nil {
		return err
	}
	d.Number = num
	d.Unit = values[1]
	return nil
}

type Value struct {
	Pos      lexer.Position
	Float    *float64  `parser:"  @Float"`
	Int      *int64    `parser:"| @Int"`
	Bool     *Bool     `parser:"| @('true' | 'false')"`
	String   *string   `parser:"| @String"`
	Duration *Duration `parser:"| @Int @('h' | 'm' | 's' | 'ms' | 'us' | 'ns')"`
}

type Identifier struct {
	Pos  lexer.Position
	Name string      `parser:"@Ident"`
	Sub  *Identifier `parser:"( '.' @@ )*"`
}

type ArgumentList struct {
	Pos       lexer.Position
	Arguments []*Expression `parser:"( @@ ( ',' @@ )* )?"`
}

type KWNew struct {
	Pos   lexer.Position
	Dummy bool `parser:"'new'"`
}

type ClassName struct {
	Name string `parser:"@Ident"`
	Pos  lexer.Position
}

type ClassInitializer struct {
	Pos       lexer.Position
	New       *KWNew       `parser:"@@"`
	ClassName *ClassName   `parser:"@@"`
	Args      ArgumentList `parser:"'(' @@ ')'"`
}

type FunctionCall struct {
	Pos          lexer.Position
	FunctionName string       `parser:"@Ident"`
	Args         ArgumentList `parser:"'(' @@ ')'"`
}

type Factor struct {
	Pos              lexer.Position
	Value            *Value            `parser:"  @@"`
	ClassInitializer *ClassInitializer `parser:"| (?= 'new') @@"`
	SubExpression    *Expression       `parser:"| '(' @@ ')'"`
	FunctionCall     *FunctionCall     `parser:"| (?= Ident '(') @@"`
	ClassMethod      *ClassMethod      `parser:"| (?= Ident ( '.' Ident)+ '(') @@"`
	Identifier       *Identifier       `parser:"| @@"`
}

type OpTermSymbol struct {
	Op  string `parser:"@( '*' | '/' | '%' )"`
	Pos lexer.Position
}

type OpTerm struct {
	Pos  lexer.Position
	Op   *OpTermSymbol `parser:"@@"`
	Term *Factor       `parser:"@@"`
}

type OpComparisonSymbol struct {
	Op  string `parser:"@( ('=' '=') | ( '<' '=' ) | '<'  | ( '>' '=' ) |'>' | ('!' '=') )"`
	Pos lexer.Position
}

type OpComparison struct {
	Pos        lexer.Position
	Op         *OpComparisonSymbol `parser:"@@"`
	Comparison *Term               `parser:"@@"`
}

type OpExpressionSymbol struct {
	Op  string `parser:"@( '+' | '-' )"`
	Pos lexer.Position
}

type OpExpression struct {
	Pos        lexer.Position
	Op         *OpExpressionSymbol `parser:"@@"`
	Expression *Comparison         `parser:"@@"`
}

type Term struct {
	Pos   lexer.Position
	Left  *Factor   `parser:"@@"`
	Right []*OpTerm `parser:"@@*"`
}

type Comparison struct {
	Pos   lexer.Position
	Left  *Term           `parser:"@@"`
	Right []*OpComparison `parser:"@@*"`
}

type Expression struct {
	Pos   lexer.Position
	Left  *Comparison     `parser:"@@"`
	Right []*OpExpression `parser:"@@*"`
}

type Assignment struct {
	Pos   lexer.Position
	Left  *Identifier `parser:"@@"`
	Right *Expression `parser:"'=' @@"`
}

type KWVar struct {
	Pos   lexer.Position
	Dummy bool `parser:"'var'"`
}

type VariableName struct {
	Name string `parser:"@Ident"`
	Pos  lexer.Position
}

type VariableType struct {
	Type string `parser:"@('*'? Ident)"`
	Pos  lexer.Position
}

type KWConst struct {
	Pos   lexer.Position
	Dummy bool `parser:"'const'"`
}

type VariableDefinition struct {
	Pos        lexer.Position
	KWConst    *KWConst      `parser:"@@?"`
	Var        *KWVar        `parser:"@@"`
	Name       *VariableName `parser:"@@ ':'"`
	Type       *VariableType `parser:"@@"`
	Assignment *Expression   `parser:"( '=' @@ )?"`
}

type KWPrivate struct {
	Pos   lexer.Position
	Dummy bool `parser:"'private'"`
}

type FieldName struct {
	Name string `parser:"@Ident"`
	Pos  lexer.Position
}

type FieldType struct {
	Type string `parser:"@Ident"`
	Pos  lexer.Position
}

type FieldDefinition struct {
	Pos     lexer.Position
	Private *KWPrivate `parser:"@@?"`
	Name    *FieldName `parser:"@@"`
	Type    *FieldType `parser:"':' @@ ';'"`
}

type ArgumentName struct {
	Name string `parser:"@Ident"`
	Pos  lexer.Position
}

type ArgumentType struct {
	Type string `parser:"@('*'? Ident)"`
	Pos  lexer.Position
}

type ArgumentDefinition struct {
	Pos  lexer.Position
	Name *ArgumentName `parser:"@@ ':'"`
	Type *ArgumentType `parser:"@@"`
}

type KWStatic struct {
	Pos   lexer.Position
	Dummy bool `parser:"'static'"`
}

type KWFunc struct {
	Pos   lexer.Position
	Dummy bool `parser:"'func'"`
}

type FunctionName struct {
	Name string `parser:"@Ident"`
	Pos  lexer.Position
}

type FunctionDefinition struct {
	Pos        lexer.Position
	Private    *KWPrivate            `parser:"@@?"`
	Static     *KWStatic             `parser:"@@?"`
	KWVararg   *KWVararg             `parser:"@@?"`
	KWFunc     *KWFunc               `parser:"@@"`
	Name       *FunctionName         `parser:"@@"`
	Parameters []*ArgumentDefinition `parser:"'(' ( @@ ( ',' @@ )* )? ')'"`
	ReturnType *ReturnType           `parser:"( ':' @@ )?"`
	Body       []*Statement          `parser:"'{' @@* '}'"`
}

type KWClass struct {
	Pos   lexer.Position
	Dummy bool `parser:"'class'"`
}

type ClassDefinition struct {
	Pos     lexer.Position
	KWClass *KWClass     `parser:"@@"`
	Name    *ClassName   `parser:"@@"`
	Body    []*Statement `parser:"'{' @@* '}'"`
}

type ClassMethod struct {
	Pos        lexer.Position
	Identifier *Identifier   `parser:"@@"`
	Args       *ArgumentList `parser:"'(' @@ ')' ';'"`
}

type KWIf struct {
	Pos   lexer.Position
	Dummy bool `parser:"'if'"`
}

type KWElse struct {
	Pos   lexer.Position
	Dummy bool `parser:"'else'"`
}

type If struct {
	Pos       lexer.Position
	KWIf      *KWIf        `parser:"@@"`
	Condition *Expression  `parser:"'(' @@ ')'"`
	Body      []*Statement `parser:"'{' @@* '}'"`
	ElseIf    []*ElseIf    `parser:"( @@ )*"`
	Else      *Else        `parser:"( @@ )?"`
}

type ElseIf struct {
	Pos       lexer.Position
	KWElse    *KWElse      `parser:"@@"`
	KWIf      *KWIf        `parser:"@@"`
	Condition *Expression  `parser:"'(' @@ ')'"`
	Body      []*Statement `parser:"'{' @@* '}'"`
}

type Else struct {
	Pos    lexer.Position
	KWElse *KWElse      `parser:"@@"`
	Body   []*Statement `parser:"'{' @@* '}'"`
}

type KWFor struct {
	Pos   lexer.Position
	Dummy bool `parser:"'for'"`
}

type For struct {
	Pos         lexer.Position
	KWFor       *KWFor       `parser:"@@"`
	Initializer *Statement   `parser:"'(' @@"`
	Condition   *Expression  `parser:"@@ ';'"`
	Increment   *Statement   `parser:"@@ ')'"`
	Body        []*Statement `parser:"'{' @@* '}'"`
}

type KWWhile struct {
	Pos   lexer.Position
	Dummy bool `parser:"'while'"`
}

type While struct {
	Pos       lexer.Position
	KWWhile   *KWWhile     `parser:"@@"`
	Condition *Expression  `parser:"'(' @@ ')'"`
	Body      []*Statement `parser:"'{' @@* '}'"`
}

type KWReturn struct {
	Pos   lexer.Position
	Dummy bool `parser:"'return'"`
}

type Return struct {
	Pos        lexer.Position
	KWReturn   *KWReturn   `parser:"@@"`
	Expression *Expression `parser:"@@? ';'"`
}

type KWExtern struct {
	Pos   lexer.Position
	Dummy bool `parser:"'extern'"`
}

type ExternalFunctionName struct {
	Name string `parser:"@Ident"`
	Pos  lexer.Position
}

type ReturnType struct {
	Type string `parser:"@('*'? Ident)"`
	Pos  lexer.Position
}

type KWVararg struct {
	Pos   lexer.Position
	Dummy bool `parser:"'vararg'"`
}

type ExternalFunctionDefinition struct {
	Pos        lexer.Position
	KWExtern   *KWExtern             `parser:"@@"`
	KWVararg   *KWVararg             `parser:"@@?"`
	KWFunc     *KWFunc               `parser:"@@"`
	Name       *ExternalFunctionName `parser:"@@"`
	Parameters []*ArgumentDefinition `parser:"'(' ( @@ ( ',' @@ )* )? ')' ':'"`
	ReturnType *ReturnType           `parser:"@@"`
}

type ExternalDefinition struct {
	Pos      lexer.Position
	Function *ExternalFunctionDefinition `parser:"(?= 'extern' 'vararg'? 'func')@@?"`
	Variable *ExternalVariableDefinition `parser:"| (?= 'extern' 'var')@@?"`
}

type ExternalVariableDefinition struct {
	Pos  lexer.Position
	Name string `parser:"'extern' 'var' @Ident"`
	Type string `parser:"':' @('*'? Ident)"`
}

type KWImport struct {
	Pos   lexer.Position
	Dummy bool `parser:"'import'"`
}

type KWFrom struct {
	Pos   lexer.Position
	Dummy bool `parser:"'from'"`
}

type KWAs struct {
	Pos   lexer.Position
	Dummy bool `parser:"'as'"`
}

type Import struct {
	Pos      lexer.Position
	KWImport *KWImport `parser:"@@"`
	Package  string    `parser:"@String ';'"`
}

type FromImport struct {
	From    KWFrom   `parser:"@@"`
	Package string   `parser:"@String"`
	Import  KWImport `parser:"@@"`
	Symbol  Symbol   `parser:"@@"`
}

type FromImportMultiple struct {
	Package string   `parser:"'from' @String 'import' '{'"`
	Symbols []Symbol `parser:"@@ (',' @@)* '}' ';'"`
}

type Alias struct {
	Pos  lexer.Position
	As   KWAs   `parser:"@@"`
	Name string `parser:"@Ident"`
}

type Symbol struct {
	Name string `parser:"@Ident"`
	As   Alias  `parser:"@@?"`
}

type Statement struct {
	Pos                lexer.Position
	VariableDefinition *VariableDefinition `parser:"(?= 'const'? 'var' Ident) @@? (';' | '\\n')?"`
	Assignment         *Assignment         `parser:"| (?= Ident ( '.' Ident)* '=') @@? (';' | '\\n')?"`
	External           *ExternalDefinition `parser:"| (?= 'extern') @@? (';' | '\\n')?"`
	FunctionDefinition *FunctionDefinition `parser:"| (?= 'private'? 'static'? 'vararg'? 'func') @@?"`
	ClassDefinition    *ClassDefinition    `parser:"| (?= 'class') @@?"`
	If                 *If                 `parser:"| (?= 'if') @@?"`
	For                *For                `parser:"| (?= 'for') @@?"`
	While              *While              `parser:"| (?= 'while') @@?"`
	Return             *Return             `parser:"| (?= 'return') @@?"`
	FieldDefinition    *FieldDefinition    `parser:"| (?= 'private'? Ident ':' '*'? Ident) @@?"`
	Import             *Import             `parser:"| (?= 'import') @@?"`
	FromImportMultiple *FromImportMultiple `parser:"| (?= 'from' String 'import' '{') @@?"`
	FromImport         *FromImport         `parser:"| (?= 'from' String 'import') @@?"`
	Export             *Statement          `parser:"| 'export' @@? (';' | '\\n')?"`
	Break              *string             `parser:"| 'break' (';' | '\\n')?"`
	Continue           *string             `parser:"| 'continue' (';' | '\\n')?"`
	Expression         *Expression         `parser:"| @@ ';'"`
}

type Program struct {
	Pos        lexer.Position
	Package    string       `parser:"'package' @Ident ';'"`
	Statements []*Statement `parser:"@@*"`
}
