package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
)

const systemPrompt = `You are a system design assistant in a visual diagram editor.

=== CRITICAL RULES ===

1. ARROWS MUST CONNECT COMPONENTS ONLY.
   Every connect_components call: source_id = a COMPONENT label or ID, target_id = a COMPONENT label or ID.
   NEVER pass an arrow/edge as source or target.
   Pattern: [Component A] -> [Component B] -> [Component C]

2. LAYOUT: positions are auto-arranged after every run, so IGNORE coordinates entirely.
   Only decide the topology:
   - Request flow reads left-to-right: ingress -> routing -> compute -> data.
   - Fan out branches where the architecture needs them; do not force one long chain.
   - Put asynchronous or supporting dependencies (queues, workers, monitoring)
     downstream of the components they serve.
   - Connect only logically adjacent components so arrows stay short and never
     cut across unrelated components.

3. CONNECTIONS: Build the complete topology using direct connections between logical neighbors.
   If you create Client, CDN, Load Balancer, and API Server, you MUST create exactly:
   Client -> CDN, CDN -> Load Balancer, Load Balancer -> API Server.
   Never skip an intermediate component with a long edge such as Client -> Load Balancer.
   Do not invent a serial connection just to make a chain: represent independent services as branches.
   Before your final response, inspect the architecture and verify every created component
   belongs to an intended connection path.

4. EXISTING DIAGRAMS: inspect_architecture returns the existing components and edges as JSON.
   Reuse those components by label or ID. Do not create a component with the same label
   unless the user explicitly asks for a separate replica; give replicas distinct labels.
   When the user asks to add or fix arrows, only connect existing components. Do not create components.

5. WORKFLOW:
   a) inspect_architecture first
   b) create only missing components
   c) connect_components for every required logical link, using the labels or IDs from inspection
   d) inspect_architecture again to verify the graph before responding
   e) Do not stop after creating nodes; complete every required connection in this same run
   f) Explain each step

6. DELETE: use delete_by_label with the component's label.

Component types: client, dns, load-balancer, api-gateway, api-server, database, cache, queue, cdn, worker, object-storage, message-broker, search-engine, vector-db, ml-service, monitoring, serverless, cdn-edge.`

const maxIterations = 16

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
	Response string         `json:"response"`
	Actions  []ActionResult `json:"actions"`
}

func (l *Loop) Run(ctx context.Context, userMessage string) (*RunResult, error) {
	messages := []Message{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: userMessage},
	}
	tools := Definitions()
	var allActions []ActionResult
	mutated := false

	for i := 0; i < maxIterations; i++ {
		resp, err := l.client.ChatCompletion(messages, tools)
		if err != nil {
			return nil, fmt.Errorf("model call failed: %w", err)
		}

		if len(resp.ToolCalls) == 0 {
			l.arrange(mutated)
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
				Content:    toolResultContent(result),
				ToolCallID: tc.ID,
			})

			allActions = append(allActions, ActionResult{
				Action: tc.Function.Name,
				Detail: result.Content,
			})

			switch tc.Function.Name {
			case "create_component", "connect_components", "update_component",
				"delete_component", "delete_by_label":
				mutated = true
			}
		}
	}

	l.arrange(mutated)
	return &RunResult{
		Response: "I've made several changes to the architecture. Let me know if you'd like any adjustments.",
		Actions:  allActions,
	}, nil
}

// arrange runs the deterministic layout pass after the agent changes the
// diagram, so components always end up in a clean, non-overlapping arrangement
// regardless of where the model chose to place them.
func (l *Loop) arrange(mutated bool) {
	if !mutated {
		return
	}
	if err := AutoLayout(l.db); err != nil {
		log.Printf("auto-layout failed: %v", err)
	}
}

func toolResultContent(result ToolResult) string {
	if result.Data == nil {
		return result.Content
	}

	data, err := json.Marshal(result.Data)
	if err != nil {
		return result.Content
	}
	return fmt.Sprintf("%s\n%s", result.Content, data)
}
