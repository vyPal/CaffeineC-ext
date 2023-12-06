package main

import (
	"context"
	"encoding/json"
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

func AnalyzeAst(ast *Program, conn *jsonrpc2.Conn, ctx context.Context, req *jsonrpc2.Request) {
	/*
		legend := lsp.SemanticTokensLegend{
			TokenTypes:     []string{"class", "function", "variable", "parameter", "property", "enumMember", "keyword", "comment", "string", "number", "regexp", "operator"},
			TokenModifiers: []string{"declaration", "definition", "readonly", "static", "deprecated", "abstract", "async", "modification", "documentation", "defaultLibrary"},
		}
	*/
	tokens := lsp.SemanticTokens{
		Data: []uint{},
	}

	for _, stmt := range ast.Statements {
		if stmt.VariableDefinition != nil {
			tokens.Data = append(tokens.Data, []uint{uint(stmt.VariableDefinition.Pos.Line) - 1, uint(stmt.VariableDefinition.Pos.Column) - 1, 3, 6, 0}...)
		}
	}

	tokens.Data = ConvertToRelativePositions(tokens.Data)

	json, err := json.Marshal(tokens.Data)
	if err != nil {
		conn.Notify(ctx, "window/showMessage", &lsp.ShowMessageParams{
			Type:    lsp.MTError,
			Message: err.Error(),
		})
		return
	}
	conn.Notify(ctx, "window/showMessage", &lsp.ShowMessageParams{
		Type:    0,
		Message: "Data: " + string(json),
	})

	conn.Reply(ctx, req.ID, tokens)
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
