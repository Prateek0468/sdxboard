package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
)

const systemPrompt = `You are a system design assistant in a visual diagram editor.

RULES:
1. ALWAYS call inspect_architecture first to see what's on the canvas.
2. To delete something, use delete_by_label with the component's label. Do NOT guess IDs.
3. To find something, use find_component or inspect_architecture.
4. When creating, place components with spacing: x += 200, y += 150.
5. Connect components logically (client → load balancer → api server → database).
6. Explain each action in plain language.

Component types: client, dns, load-balancer, api-gateway, api-server, database, cache, queue, cdn, worker, object-storage, message-broker, search-engine, vector-db, ml-service, monitoring, serverless, cdn-edge.

IMPORTANT: When the user says "remove X" or "delete X", use delete_by_label with X as the label.`

const maxIterations = 8

type Loop struct {
	client *Client
	db     *DB
}

func NewLoop(client *Client, db *DB) *Loop {
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

		if len(resp.ToolCalls) == 0 {
			return &RunResult{
				Response: resp.Content,
				Actions:  allActions,
			}, nil
		}

		messages = append(messages, *resp)

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

	return &RunResult{
		Response: "I've made several changes to the architecture. Let me know if you'd like any adjustments.",
		Actions:  allActions,
	}, nil
}
