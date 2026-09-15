package agent

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
)

const systemPrompt = `You are a system design assistant embedded in a visual diagram editor.
You help users design system architectures by creating and modifying diagrams.

You have access to the current architecture and tools to modify it.
When a user asks you to design something, inspect the current state first, then build it out step by step.
Place components with reasonable spacing: use x increments of ~200 and y increments of ~150.
Connect components logically (e.g., client → load balancer → api server → database).

Available component types: client, dns, load-balancer, api-server, database, cache, queue, cdn, worker, object-storage.

Always explain what you're doing in plain language as you make changes.`

const maxIterations = 5

type Loop struct {
	client *Client
	db     *sql.DB
}

func NewLoop(client *Client, db *sql.DB) *Loop {
	return &Loop{client: client, db: db}
}

type ActionResult struct {
	Action string `json:"action"`
	Detail string `json:"detail"`
}

type RunResult struct {
	Response string       `json:"response"`
	Actions  []ActionResult `json:"actions"`
}

func (l *Loop) Run(ctx context.Context, userMessage string) (*RunResult, error) {
	messages := []Message{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: userMessage},
	}
	tools := Definitions()
	var allActions []ActionResult

	for i := 0; i < maxIterations; i++ {
		resp, err := l.client.ChatCompletion(messages, tools)
		if err != nil {
			return nil, fmt.Errorf("model call failed: %w", err)
		}

		// No tool calls — model is done, return its text response.
		if len(resp.ToolCalls) == 0 {
			return &RunResult{
				Response: resp.Content,
				Actions:  allActions,
			}, nil
		}

		// Append the assistant message (with tool calls) to history.
		messages = append(messages, *resp)

		// Execute each tool call and collect results.
		for _, tc := range resp.ToolCalls {
			log.Printf("agent tool call: %s", tc.Function.Name)

			var rawArgs json.RawMessage
			if tc.Function.Arguments != "" {
				rawArgs = json.RawMessage(tc.Function.Arguments)
			}

			result := ExecuteTool(l.db, tc.Function.Name, rawArgs, tc.ID)
			messages = append(messages, Message{
				Role:       "tool",
				Content:    result.Content,
				ToolCallID: tc.ID,
			})

			allActions = append(allActions, ActionResult{
				Action: tc.Function.Name,
				Detail: result.Content,
			})
		}
	}

	// Exceeded max iterations — return what we have.
	return &RunResult{
		Response: "I've made several changes to the architecture. Let me know if you'd like any adjustments.",
		Actions:  allActions,
	}, nil
}
