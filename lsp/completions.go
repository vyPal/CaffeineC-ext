package main

import "github.com/vyPal/go-lsp"

func GenerateCompletions(params *lsp.CompletionParams) *lsp.CompletionList {
	list := &lsp.CompletionList{}

	// Keyword completions
	list.Items = append(list.Items, lsp.CompletionItem{
		Label:  "var",
		Detail: "Declare a variable",
		Kind:   lsp.CIKKeyword,
	})

	list.Items = append(list.Items, lsp.CompletionItem{
		Label:  "func",
		Detail: "Define a function",
		Kind:   lsp.CIKKeyword,
	})

	list.Items = append(list.Items, lsp.CompletionItem{
		Label:  "class",
		Detail: "Define a class",
		Kind:   lsp.CIKKeyword,
	})

	list.Items = append(list.Items, lsp.CompletionItem{
		Label:  "if",
		Detail: "Start an if statement",
		Kind:   lsp.CIKKeyword,
	})

	list.Items = append(list.Items, lsp.CompletionItem{
		Label:  "for",
		Detail: "Start a for loop",
		Kind:   lsp.CIKKeyword,
	})

	list.Items = append(list.Items, lsp.CompletionItem{
		Label:  "while",
		Detail: "Start a while loop",
		Kind:   lsp.CIKKeyword,
	})

	return list
}
