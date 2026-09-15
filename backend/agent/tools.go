package agent

import (
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
)

func Definitions() []ToolDef {
	return []ToolDef{
		{
			Type: "function",
			Function: ToolDefFunc{
				Name:        "inspect_architecture",
				Description: "Returns the current system architecture as JSON with all components and edges. Use this to understand the current state before making changes.",
				Parameters:  json.RawMessage(`{"type":"object","properties":{},"required":[]}`),
			},
		},
		{
			Type: "function",
			Function: ToolDefFunc{
				Name:        "create_component",
				Description: "Creates a new component on the diagram. Types: client, dns, load-balancer, api-server, database, cache, queue, cdn, worker, object-storage.",
				Parameters: json.RawMessage(`{
					"type":"object",
					"properties":{
						"type":{"type":"string","description":"Component type"},
						"label":{"type":"string","description":"Display label for the component"},
						"x":{"type":"number","description":"X position on canvas"},
						"y":{"type":"number","description":"Y position on canvas"}
					},
					"required":["type","label","x","y"]
				}`),
			},
		},
		{
			Type: "function",
			Function: ToolDefFunc{
				Name:        "connect_components",
				Description: "Creates a directional edge (connection) between two components. The edge represents data flow from source to target.",
				Parameters: json.RawMessage(`{
					"type":"object",
					"properties":{
						"source_id":{"type":"string","description":"ID of the source component"},
						"target_id":{"type":"string","description":"ID of the target component"},
						"label":{"type":"string","description":"Optional label for the edge (e.g. 'HTTPS', 'TCP')"}
					},
					"required":["source_id","target_id"]
				}`),
			},
		},
		{
			Type: "function",
			Function: ToolDefFunc{
				Name:        "update_component",
				Description: "Updates an existing component's label, position, or metadata. Only provided fields are changed.",
				Parameters: json.RawMessage(`{
					"type":"object",
					"properties":{
						"id":{"type":"string","description":"ID of the component to update"},
						"label":{"type":"string","description":"New label"},
						"x":{"type":"number","description":"New X position"},
						"y":{"type":"number","description":"New Y position"}
					},
					"required":["id"]
				}`),
			},
		},
		{
			Type: "function",
			Function: ToolDefFunc{
				Name:        "delete_component",
				Description: "Deletes a component and all its connected edges from the diagram.",
				Parameters: json.RawMessage(`{
					"type":"object",
					"properties":{
						"id":{"type":"string","description":"ID of the component to delete"}
					},
					"required":["id"]
				}`),
			},
		},
	}
}

type ToolResult struct {
	ToolCallID string      `json:"tool_call_id"`
	Content    string      `json:"content"`
	Data       interface{} `json:"data,omitempty"`
}

func ExecuteTool(db *sql.DB, name string, arguments json.RawMessage, callID string) ToolResult {
	var result ToolResult
	result.ToolCallID = callID

	switch name {
	case "inspect_architecture":
		data, err := inspectArchitecture(db)
		if err != nil {
			result.Content = fmt.Sprintf("Error: %v", err)
		} else {
			result.Content = "Current architecture:"
			result.Data = data
		}

	case "create_component":
		var args struct {
			Type  string  `json:"type"`
			Label string  `json:"label"`
			X     float64 `json:"x"`
			Y     float64 `json:"y"`
		}
		if err := json.Unmarshal(arguments, &args); err != nil {
			result.Content = fmt.Sprintf("Error parsing arguments: %v", err)
			return result
		}
		id, err := createComponent(db, args.Type, args.Label, args.X, args.Y)
		if err != nil {
			result.Content = fmt.Sprintf("Error creating component: %v", err)
		} else {
			result.Content = fmt.Sprintf("Created %s '%s' with id %s", args.Type, args.Label, id)
		}

	case "connect_components":
		var args struct {
			SourceID string  `json:"source_id"`
			TargetID string  `json:"target_id"`
			Label    *string `json:"label"`
		}
		if err := json.Unmarshal(arguments, &args); err != nil {
			result.Content = fmt.Sprintf("Error parsing arguments: %v", err)
			return result
		}
		id, err := createEdge(db, args.SourceID, args.TargetID, args.Label)
		if err != nil {
			result.Content = fmt.Sprintf("Error creating edge: %v", err)
		} else {
			result.Content = fmt.Sprintf("Connected components with edge id %s", id)
		}

	case "update_component":
		var args struct {
			ID    string  `json:"id"`
			Label *string `json:"label"`
			X     *float64 `json:"x"`
			Y     *float64 `json:"y"`
		}
		if err := json.Unmarshal(arguments, &args); err != nil {
			result.Content = fmt.Sprintf("Error parsing arguments: %v", err)
			return result
		}
		err := updateComponent(db, args.ID, args.Label, args.X, args.Y)
		if err != nil {
			result.Content = fmt.Sprintf("Error updating component: %v", err)
		} else {
			result.Content = fmt.Sprintf("Updated component %s", args.ID)
		}

	case "delete_component":
		var args struct {
			ID string `json:"id"`
		}
		if err := json.Unmarshal(arguments, &args); err != nil {
			result.Content = fmt.Sprintf("Error parsing arguments: %v", err)
			return result
		}
		err := deleteComponent(db, args.ID)
		if err != nil {
			result.Content = fmt.Sprintf("Error deleting component: %v", err)
		} else {
			result.Content = fmt.Sprintf("Deleted component %s", args.ID)
		}

	default:
		result.Content = fmt.Sprintf("Unknown tool: %s", name)
	}

	return result
}

type architectureData struct {
	Components []componentJSON `json:"components"`
	Edges      []edgeJSON      `json:"edges"`
}

type componentJSON struct {
	ID    string  `json:"id"`
	Type  string  `json:"type"`
	Label string  `json:"label"`
	X     float64 `json:"x"`
	Y     float64 `json:"y"`
}

type edgeJSON struct {
	ID       string  `json:"id"`
	SourceID string  `json:"source_id"`
	TargetID string  `json:"target_id"`
	Label    *string `json:"label,omitempty"`
}

func inspectArchitecture(db *sql.DB) (architectureData, error) {
	var data architectureData

	rows, err := db.Query(`SELECT id, type, label, x, y FROM components ORDER BY created_at`)
	if err != nil {
		return data, err
	}
	defer rows.Close()
	for rows.Next() {
		var c componentJSON
		if err := rows.Scan(&c.ID, &c.Type, &c.Label, &c.X, &c.Y); err != nil {
			return data, err
		}
		data.Components = append(data.Components, c)
	}
	if err := rows.Err(); err != nil {
		return data, err
	}

	edges, err := db.Query(`SELECT id, source_id, target_id, label FROM edges ORDER BY created_at`)
	if err != nil {
		return data, err
	}
	defer edges.Close()
	for edges.Next() {
		var e edgeJSON
		if err := edges.Scan(&e.ID, &e.SourceID, &e.TargetID, &e.Label); err != nil {
			return data, err
		}
		data.Edges = append(data.Edges, e)
	}

	return data, edges.Err()
}

func createComponent(db *sql.DB, compType, label string, x, y float64) (string, error) {
	id := uuid.NewString()
	_, err := db.Exec(
		`INSERT INTO components (id, type, label, x, y) VALUES (?, ?, ?, ?, ?)`,
		id, compType, label, x, y,
	)
	return id, err
}

func createEdge(db *sql.DB, sourceID, targetID string, label *string) (string, error) {
	id := uuid.NewString()
	_, err := db.Exec(
		`INSERT INTO edges (id, source_id, target_id, label) VALUES (?, ?, ?, ?)`,
		id, sourceID, targetID, label,
	)
	return id, err
}

func updateComponent(db *sql.DB, id string, label *string, x, y *float64) error {
	// Fetch current values first
	var currentLabel string
	var currentX, currentY float64
	err := db.QueryRow(`SELECT label, x, y FROM components WHERE id = ?`, id).Scan(&currentLabel, &currentX, &currentY)
	if err != nil {
		return fmt.Errorf("component not found: %s", id)
	}

	if label != nil {
		currentLabel = *label
	}
	if x != nil {
		currentX = *x
	}
	if y != nil {
		currentY = *y
	}

	_, err = db.Exec(
		`UPDATE components SET label = ?, x = ?, y = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
		currentLabel, currentX, currentY, id,
	)
	return err
}

func deleteComponent(db *sql.DB, id string) error {
	result, err := db.Exec(`DELETE FROM components WHERE id = ?`, id)
	if err != nil {
		return err
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		return fmt.Errorf("component not found: %s", id)
	}
	return nil
}
