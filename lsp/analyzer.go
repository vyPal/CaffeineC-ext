package main

import (
	"context"
	"fmt"
	"regexp"
	"runtime/debug"
	"strconv"
	"strings"

	"github.com/sourcegraph/jsonrpc2"
	"github.com/vyPal/go-lsp"
)

func DecodeError(stderr string, conn *jsonrpc2.Conn, uri lsp.DocumentURI, ctx context.Context) {
	err := strings.Split(stderr, "\n")[0]
	err = strings.Replace(err, "panic: ", "", -1)

	split := strings.Split(err, ":")

	line, _ := strconv.Atoi(split[0])
	column, _ := strconv.Atoi(split[1])
	message := strings.Join(split[2:], ":")
	message = strings.TrimLeft(message, " ")

	rang := lsp.Range{Start: lsp.Position{Line: line - 1, Character: column - 1}, End: lsp.Position{Line: line - 1, Character: column}}
	diagnostic := lsp.Diagnostic{Range: rang, Message: message, Severity: lsp.Error, Source: "CaffeineC Parser"}

	conn.Notify(ctx, "textDocument/publishDiagnostics", lsp.PublishDiagnosticsParams{URI: uri, Diagnostics: []lsp.Diagnostic{diagnostic}})
}

type Server struct {
	documents map[string]string
	conn      *jsonrpc2.Conn
}

func (s *Server) DidChange(ctx context.Context, params lsp.DocumentURI, text string) error {
	// Update the document in the server's state.
	s.documents[string(params)] = text
	return nil
}

type MdHover struct {
	Contents interface{} `json:"contents"`
	Range    *Range      `json:"range,omitempty"`
}

type Range struct {
	Start Position `json:"start"`
	End   Position `json:"end"`
}

type Position struct {
	Line      int `json:"line"`
	Character int `json:"character"`
}

type MarkupContent struct {
	Kind  string `json:"kind"`
	Value string `json:"value"`
}

func (s *Server) Hover(ctx context.Context, params HoverParams) (*MdHover, error) {
	// Get the current state of the document.
	doc := s.documents[string(params.TextDocument.URI)]

	// Get the line and character position of the hover.
	line := params.Position.Line
	character := params.Position.Character

	// Get the text being hovered over.
	// This is a simple example and may not work correctly for all cases.
	lines := strings.Split(doc, "\n")
	if line < len(lines) {
		text := lines[line]
		if character < len(text) {
			// Match word characters around the given position.
			re := regexp.MustCompile(`[\w*-]+`)
			matches := re.FindAllStringIndex(text, -1)
			for _, match := range matches {
				if match[0] <= character && character <= match[1] {
					hoveredText := text[match[0]:match[1]]
					if symbol, ok := SymbolTable[hoveredText]; ok {
						if symbol.Type == "variable" {
							return &MdHover{
								Contents: MarkupContent{
									Kind:  "markdown",
									Value: fmt.Sprintf("```cffc\n%s: %s\n```", symbol.Name, symbol.Data["type"]),
								},
							}, nil
						} else if symbol.Type == "parameter" {
							return &MdHover{
								Contents: MarkupContent{
									Kind:  "markdown",
									Value: fmt.Sprintf("**Name:** %s\n\n**Type:** %s", symbol.Name, symbol.Data["type"]),
								},
							}, nil
						}
					}
				}
			}
		}
	}

	// Return the hover information.
	return &MdHover{}, nil
}

func AnalyzeAst(ast *Program, conn *jsonrpc2.Conn, ctx context.Context, req *jsonrpc2.Request) {
	/*
		legend := lsp.SemanticTokensLegend{
						TokenTypes: []string{
							"namespace", // 0
							"class", // 1
							"enum", // 2
							"interface", // 3
							"struct", // 4
							"typeParameter", // 5
							"type", // 6
							"parameter", // 7
							"variable", // 8
							"property", // 9
							"enumMember", // 10
							"decorator", // 11
							"event", // 12
							"function", // 13
							"method", // 14
							"macro", // 15
							"label", // 16
							"comment", // 17
							"string", // 18
							"keyword", // 19
							"number", // 20
							"regexp", // 21
							"operator", // 22
						},
						TokenModifiers: []string{
							"declaration",
							"definition",
							"readonly",
							"static",
							"deprecated",
							"abstract",
							"async",
							"modification",
							"documentation",
							"defaultLibrary",
						},
					},
	*/
	tokens := lsp.SemanticTokens{
		Data: []uint{},
	}

	if ast == nil {
		return
	}

	for _, stmt := range ast.Statements {
		if TryCatch(func() {
			analyzeStatement(stmt, &tokens)
		})() != nil {
			continue
		}
	}

	tokens.Data = ConvertToRelativePositions(tokens.Data)

	conn.Reply(ctx, req.ID, tokens)
}

func analyzeStatement(stmt *Statement, tokens *lsp.SemanticTokens) {
	if stmt.VariableDefinition != nil {
		tokens.Data = append(tokens.Data, []uint{uint(stmt.VariableDefinition.Name.Pos.Line) - 1, uint(stmt.VariableDefinition.Name.Pos.Column) - 1, uint(len(stmt.VariableDefinition.Name.Name)), 8, 0b10}...)
		if stmt.VariableDefinition.Assignment != nil {
			analyzeExpression(stmt.VariableDefinition.Assignment, tokens)
		}
		SymbolTable[stmt.VariableDefinition.Name.Name] = CTSymbol{
			Name: stmt.VariableDefinition.Name.Name,
			Type: "variable",
			Data: map[string]string{
				"type": stmt.VariableDefinition.Type.Type,
			},
		}
	} else if stmt.Assignment != nil {
		analyzeIdentifier(stmt.Assignment.Left, tokens)
		if stmt.Assignment.Right != nil {
			analyzeExpression(stmt.Assignment.Right, tokens)
		}
	} else if stmt.ExternalFunction != nil {
		tokens.Data = append(tokens.Data, []uint{uint(stmt.ExternalFunction.Name.Pos.Line) - 1, uint(stmt.ExternalFunction.Name.Pos.Column) - 1, uint(len(stmt.ExternalFunction.Name.Name)), 13, 0b10}...)
		for _, p := range stmt.ExternalFunction.Parameters {
			tokens.Data = append(tokens.Data, []uint{uint(p.Name.Pos.Line) - 1, uint(p.Name.Pos.Column) - 1, uint(len(p.Name.Name)), 7, 0b10}...)
			SymbolTable[p.Name.Name] = CTSymbol{
				Name: p.Name.Name,
				Type: "parameter",
				Data: map[string]string{
					"type": p.Type.Type,
				},
			}
		}
	} else if stmt.FunctionDefinition != nil {
		tokens.Data = append(tokens.Data, []uint{uint(stmt.FunctionDefinition.Name.Pos.Line) - 1, uint(stmt.FunctionDefinition.Name.Pos.Column) - 1, uint(len(stmt.FunctionDefinition.Name.Name)), 13, 0b10}...)
		for _, p := range stmt.FunctionDefinition.Parameters {
			tokens.Data = append(tokens.Data, []uint{uint(p.Name.Pos.Line) - 1, uint(p.Name.Pos.Column) - 1, uint(len(p.Name.Name)), 7, 0b10}...)
			SymbolTable[p.Name.Name] = CTSymbol{
				Name: p.Name.Name,
				Type: "parameter",
				Data: map[string]string{
					"type": p.Type.Type,
				},
			}
		}
		for _, s := range stmt.FunctionDefinition.Body {
			analyzeStatement(s, tokens)
		}
	} else if stmt.ClassDefinition != nil {
		tokens.Data = append(tokens.Data, []uint{uint(stmt.ClassDefinition.Name.Pos.Line) - 1, uint(stmt.ClassDefinition.Name.Pos.Column) - 1, uint(len(stmt.ClassDefinition.Name.Name)), 1, 0b1}...)
		for _, s := range stmt.ClassDefinition.Body {
			analyzeStatement(s, tokens)
		}
	} else if stmt.If != nil {
		analyzeExpression(stmt.If.Condition, tokens)
		for _, s := range stmt.If.Body {
			analyzeStatement(s, tokens)
		}
		for _, e := range stmt.If.ElseIf {
			tokens.Data = append(tokens.Data, []uint{uint(e.KWElse.Pos.Line) - 1, uint(e.KWElse.Pos.Column) - 1, 4, 19, 0}...)
			tokens.Data = append(tokens.Data, []uint{uint(e.KWIf.Pos.Line) - 1, uint(e.KWIf.Pos.Column) - 1, 2, 19, 0}...)
			analyzeExpression(e.Condition, tokens)
		}
		for _, s := range stmt.If.Else {
			analyzeStatement(s, tokens)
		}
	} else if stmt.For != nil {
		tokens.Data = append(tokens.Data, []uint{uint(stmt.For.KWFor.Pos.Line) - 1, uint(stmt.For.KWFor.Pos.Column) - 1, 3, 19, 0}...)
		if stmt.For.Initializer != nil {
			analyzeStatement(stmt.For.Initializer, tokens)
		}
		if stmt.For.Condition != nil {
			analyzeExpression(stmt.For.Condition, tokens)
		}
		if stmt.For.Increment != nil {
			analyzeStatement(stmt.For.Increment, tokens)
		}
		for _, s := range stmt.For.Body {
			analyzeStatement(s, tokens)
		}
	} else if stmt.Expression != nil {
		analyzeExpression(stmt.Expression, tokens)
	} else if stmt.While != nil {
		tokens.Data = append(tokens.Data, []uint{uint(stmt.While.KWWhile.Pos.Line) - 1, uint(stmt.While.KWWhile.Pos.Column) - 1, 5, 19, 0}...)
		for _, s := range stmt.While.Body {
			analyzeStatement(s, tokens)
		}
	} else if stmt.Return != nil {
		tokens.Data = append(tokens.Data, []uint{uint(stmt.Return.KWReturn.Pos.Line) - 1, uint(stmt.Return.KWReturn.Pos.Column) - 1, 6, 19, 0}...)
		analyzeExpression(stmt.Return.Expression, tokens)
	} else if stmt.Break != nil {
		tokens.Data = append(tokens.Data, []uint{uint(stmt.Pos.Line) - 1, uint(stmt.Pos.Column) - 1, 5, 19, 0}...)
	} else if stmt.Continue != nil {
		tokens.Data = append(tokens.Data, []uint{uint(stmt.Pos.Line) - 1, uint(stmt.Pos.Column) - 1, 8, 19, 0}...)
	} else if stmt.FieldDefinition != nil {
		tokens.Data = append(tokens.Data, []uint{uint(stmt.FieldDefinition.Name.Pos.Line) - 1, uint(stmt.FieldDefinition.Name.Pos.Column) - 1, uint(len(stmt.FieldDefinition.Name.Name)), 8, 0b10}...)
		tokens.Data = append(tokens.Data, []uint{uint(stmt.FieldDefinition.Type.Pos.Line) - 1, uint(stmt.FieldDefinition.Type.Pos.Column) - 1, uint(len(stmt.FieldDefinition.Type.Type)), 5, 0}...)
	} else if stmt.Export != nil {
		analyzeStatement(stmt.Export, tokens)
	}
}

func analyzeExpression(expr *Expression, tokens *lsp.SemanticTokens) {
	analyzeComparison(expr.Left, tokens)
	for _, op := range expr.Right {
		tokens.Data = append(tokens.Data, []uint{uint(op.Op.Pos.Line) - 1, uint(op.Op.Pos.Column) - 1, uint(len(op.Op.Op)), 22, 0}...)
		analyzeComparison(op.Expression, tokens)
	}
}

func analyzeComparison(comp *Comparison, tokens *lsp.SemanticTokens) {
	analyzeTerm(comp.Left, tokens)
	for _, op := range comp.Right {
		tokens.Data = append(tokens.Data, []uint{uint(op.Op.Pos.Line) - 1, uint(op.Op.Pos.Column) - 1, uint(len(op.Op.Op)), 22, 0}...)
		analyzeTerm(op.Comparison, tokens)
	}
}

func analyzeTerm(term *Term, tokens *lsp.SemanticTokens) {
	analyzeFactor(term.Left, tokens)
	for _, op := range term.Right {
		tokens.Data = append(tokens.Data, []uint{uint(op.Op.Pos.Line) - 1, uint(op.Op.Pos.Column) - 1, uint(len(op.Op.Op)), 22, 0}...)
		analyzeFactor(op.Term, tokens)
	}
}

func analyzeFactor(fact *Factor, tokens *lsp.SemanticTokens) {
	if fact.Value != nil {
		val := fact.Value
		if val.Bool != nil {
			tokens.Data = append(tokens.Data, []uint{uint(val.Pos.Line) - 1, uint(val.Pos.Column) - 1, uint(len(val.Bool.Str)), 6, 0}...)
		} else if val.Duration != nil {
			tokens.Data = append(tokens.Data, []uint{uint(val.Duration.Pos.Line) - 1, uint(val.Duration.Pos.Column) - 1, uint(len(fmt.Sprint(val.Duration.Number))), 20, 0}...)
			tokens.Data = append(tokens.Data, []uint{uint(val.Duration.Pos.Line - 1 + len(fmt.Sprint(val.Duration.Number))), uint(val.Duration.Pos.Column) - 1, uint(len(fmt.Sprint(val.Duration.Unit))), 6, 0}...)
		} else if val.Float != nil {
			tokens.Data = append(tokens.Data, []uint{uint(val.Pos.Line) - 1, uint(val.Pos.Column) - 1, uint(len(fmt.Sprint(val.Float))), 20, 0}...)
		} else if val.Int != nil {
			tokens.Data = append(tokens.Data, []uint{uint(val.Pos.Line) - 1, uint(val.Pos.Column) - 1, uint(len(fmt.Sprint(val.Int))), 20, 0}...)
		} else if val.String != nil {
			tokens.Data = append(tokens.Data, []uint{uint(val.Pos.Line) - 1, uint(val.Pos.Column) - 1, uint(len(*val.String)), 18, 0}...)
		}
	} else if fact.Identifier != nil {
		analyzeIdentifier(fact.Identifier, tokens)
	} else if fact.ClassInitializer != nil {
		tokens.Data = append(tokens.Data, []uint{uint(fact.ClassInitializer.New.Pos.Line) - 1, uint(fact.ClassInitializer.New.Pos.Column) - 1, 3, 19, 0}...)
		tokens.Data = append(tokens.Data, []uint{uint(fact.ClassInitializer.ClassName.Pos.Line) - 1, uint(fact.ClassInitializer.ClassName.Pos.Column) - 1, uint(len(fact.ClassInitializer.ClassName.Name)), 1, 0}...)
		// TODO: Add parameters
	} else if fact.SubExpression != nil {
		analyzeExpression(fact.SubExpression, tokens)
	} else if fact.FunctionCall != nil {
		tokens.Data = append(tokens.Data, []uint{uint(fact.FunctionCall.Pos.Line) - 1, uint(fact.FunctionCall.Pos.Column) - 1, uint(len(fact.FunctionCall.FunctionName)), 13, 0}...)
		for _, e := range fact.FunctionCall.Args.Arguments {
			analyzeExpression(e, tokens)
		}
	} else if fact.ClassMethod != nil {
		analyzeIdentifier(fact.ClassMethod.Identifier, tokens)
		for _, e := range fact.ClassMethod.Args.Arguments {
			analyzeExpression(e, tokens)
		}
	}
}

func analyzeIdentifier(iden *Identifier, tokens *lsp.SemanticTokens) {
	tokens.Data = append(tokens.Data, []uint{uint(iden.Pos.Line) - 1, uint(iden.Pos.Column) - 1, uint(len(iden.Name)), 8, 0}...)
	if iden.Sub != nil {
		analyzeIdentifier(iden.Sub, tokens)
	}
}

func ConvertToRelativePositions(tokensData []uint) []uint {
	if len(tokensData) < 5 {
		return tokensData
	}

	relativeTokensData := make([]uint, len(tokensData))

	// Copy the first token as it is
	copy(relativeTokensData[:5], tokensData[:5])

	for i := 5; i < len(tokensData); i += 5 {
		// Line number is relative to the previous token's line number
		relativeTokensData[i] = tokensData[i] - tokensData[i-5]

		// If it's the same line, make character position relative to the previous token's character position
		// If it's a new line, character position remains the same
		if relativeTokensData[i] == 0 {
			relativeTokensData[i+1] = tokensData[i+1] - tokensData[i-4]
		} else {
			relativeTokensData[i+1] = tokensData[i+1]
		}

		// Copy the length, token type, and token modifiers as they are
		copy(relativeTokensData[i+2:i+5], tokensData[i+2:i+5])
	}

	return relativeTokensData
}

func TryCatch(f func()) func() error {
	return func() (err error) {
		defer func() {
			if panicInfo := recover(); panicInfo != nil {
				err = fmt.Errorf("%v, %s", panicInfo, string(debug.Stack()))
				return
			}
		}()
		f() // calling the decorated function
		return err
	}
}
