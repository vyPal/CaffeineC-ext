package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"net"
	"strings"

	"github.com/alecthomas/participle/v2"
	"github.com/sourcegraph/jsonrpc2"
	"github.com/vyPal/go-lsp"
)

type handler struct{}

var parser *participle.Parser[Program]

var ast *Program

func (h *handler) Handle(ctx context.Context, conn *jsonrpc2.Conn, req *jsonrpc2.Request) {
	switch req.Method {
	case "initialize":
		params := &lsp.InitializeParams{}
		if err := json.Unmarshal(*req.Params, params); err != nil {
			conn.Notify(ctx, "window/showMessage", &lsp.ShowMessageParams{
				Type:    lsp.MTError,
				Message: err.Error(),
			})
			return
		}

		parser = participle.MustBuild[Program]()

		res := &lsp.InitializeResult{
			Capabilities: lsp.ServerCapabilities{
				TextDocumentSync: &lsp.TextDocumentSyncOptionsOrKind{
					Options: &lsp.TextDocumentSyncOptions{
						OpenClose: true,
						Change:    lsp.TDSKFull,
					},
				},
				CompletionProvider: &lsp.CompletionOptions{
					TriggerCharacters: []string{"."},
				},
				SemanticTokensProvider: &lsp.SemanticTokensOptions{
					Legend: lsp.SemanticTokensLegend{
						TokenTypes:     []string{"class", "function", "variable", "parameter", "property", "enumMember", "keyword", "comment", "string", "number", "regexp", "operator"},
						TokenModifiers: []string{"declaration", "definition", "readonly", "static", "deprecated", "abstract", "async", "modification", "documentation", "defaultLibrary"},
					},
					Full: lsp.STPFFull,
					DocumentSelector: lsp.DocumentSelector{
						lsp.DocumentFilter{Language: "cffc"},
					},
				},
			},
		}

		conn.Reply(ctx, req.ID, res)

	case "initialized":
		conn.Reply(ctx, req.ID, nil)

	case "textDocument/didChange":
		params := &lsp.DidChangeTextDocumentParams{}
		if err := json.Unmarshal(*req.Params, params); err != nil {
			conn.Notify(ctx, "window/showMessage", &lsp.ShowMessageParams{
				Type:    lsp.MTError,
				Message: err.Error(),
			})
			return
		}
		var err error
		ast, err = parser.Parse("", strings.NewReader(params.ContentChanges[0].Text))
		if err != nil {
			DecodeError(err.Error(), conn, params.TextDocument.URI, ctx)
			return
		} else {
			conn.Notify(ctx, "textDocument/publishDiagnostics", lsp.PublishDiagnosticsParams{
				URI: params.TextDocument.URI, Diagnostics: []lsp.Diagnostic{},
			})
		}

		conn.Reply(ctx, req.ID, nil)

	case "textDocument/didOpen":
		params := &lsp.DidOpenTextDocumentParams{}
		if err := json.Unmarshal(*req.Params, params); err != nil {
			DecodeError(err.Error(), conn, params.TextDocument.URI, ctx)
			return
		} else {
			conn.Notify(ctx, "textDocument/publishDiagnostics", lsp.PublishDiagnosticsParams{
				URI: params.TextDocument.URI, Diagnostics: []lsp.Diagnostic{},
			})
		}
		var err error
		ast, err = parser.Parse("", strings.NewReader(params.TextDocument.Text))
		if err != nil {
			conn.Notify(ctx, "window/showMessage", &lsp.ShowMessageParams{
				Type:    lsp.MTError,
				Message: err.Error(),
			})
			return
		}

		conn.Reply(ctx, req.ID, nil)

	case "textDocument/semanticTokens/full":
		params := &lsp.SemanticTokensParams{}
		if err := json.Unmarshal(*req.Params, params); err != nil {
			conn.Notify(ctx, "window/showMessage", &lsp.ShowMessageParams{
				Type:    lsp.MTError,
				Message: err.Error(),
			})
			return
		}

		AnalyzeAst(ast, conn, ctx, req)

	/*
		case "textDocument/completion":
			params := &lsp.CompletionParams{}
			if err := json.Unmarshal(*req.Params, params); err != nil {
				conn.Notify(ctx, "window/showMessage", &lsp.ShowMessageParams{
					Type:    lsp.MTError,
					Message: err.Error(),
				})
				return
			}

			conn.Notify(ctx, "window/showMessage", &lsp.ShowMessageParams{
				Type:    0,
				Message: "Completing....",
			})

			list := GenerateCompletions(params)
			conn.Reply(ctx, req.ID, list)
	*/
	case "shutdown":
		conn.Reply(ctx, req.ID, nil)
		/*
			default:
				conn.Notify(ctx, "window/showMessage", &lsp.ShowMessageParams{
					Type:    lsp.MTError,
					Message: fmt.Sprintf("Unknown method: %s", req.Method),
				})
				conn.Reply(ctx, req.ID, nil)
		*/
	}
}

func main() {
	port := flag.String("port", "8080", "port to listen on")
	flag.Parse()

	ln, err := net.Listen("tcp", "127.0.0.1:"+*port)
	if err != nil {
		panic(err)
	}

	fmt.Printf("Listening on port %s\n", *port)

	h := &handler{}

	for {
		conn, err := ln.Accept()
		if err != nil {
			panic(err)
		}

		go func() {
			jsonrpc2.NewConn(context.Background(), jsonrpc2.NewBufferedStream(conn, jsonrpc2.VSCodeObjectCodec{}), h)
		}()
	}
}
