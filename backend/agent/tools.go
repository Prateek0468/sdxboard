package agent

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/google/uuid"
)

type ToolResult struct {
	ToolCallID string      `json:"tool_call_id"`
	Content    string      `json:"content"`
	Data       interface{} `json:"data,omitempty"`
}

// DB wraps sql.DB with driver info.
type DB struct {
	*sql.DB
	isPostgres bool
}

func NewDB(db *sql.DB, isPostgres bool) *DB {
	return &DB{DB: db, isPostgres: isPostgres}
}

func (d *DB) ph(n int) string {
	if d.isPostgres {
		return fmt.Sprintf("$%d", n)
	}
	return "?"
}

func Definitions() []ToolDef {
	return []ToolDef{
		{
			Type: "function",
			Function: ToolDefFunc{
				Name:        "inspect_architecture",
				Description: "Returns ALL components and edges on the canvas. Always call this first to see what exists.",
				Parameters:  json.RawMessage(`{"type":"object","properties":{},"required":[]}`),
			},
		},
		{
			Type: "function",
			Function: ToolDefFunc{
				Name:        "find_component",
				Description: "Search for components by label or type. Returns matching IDs. Call this to find a component before deleting or updating it.",
				Parameters: json.RawMessage(`{
					"type":"object",
					"properties":{
						"query":{"type":"string","description":"Search term (matches label or type, case-insensitive)"}
					},
					"required":["query"]
				}`),
			},
		},
		{
			Type: "function",
			Function: ToolDefFunc{
				Name:        "create_component",
				Description: "Creates a new component. Types: client, dns, load-balancer, api-gateway, api-server, database, cache, queue, cdn, worker, object-storage, message-broker, search-engine, vector-db, ml-service, monitoring, serverless, cdn-edge.",
				Parameters: json.RawMessage(`{
					"type":"object",
					"properties":{
						"type":{"type":"string","description":"Component type"},
						"label":{"type":"string","description":"Display label"},
						"x":{"type":"number","description":"X position on canvas"},
						"y":{"type":"number","description":"Y position on canvas"},
						"metadata":{"type":"object","description":"Optional metadata"}
					},
					"required":["type","label","x","y"]
				}`),
			},
		},
		{
			Type: "function",
			Function: ToolDefFunc{
				Name:        "connect_components",
				Description: "Creates a connection between two components. Arrows show flow direction from source to target.",
				Parameters: json.RawMessage(`{
					"type":"object",
					"properties":{
						"source_id":{"type":"string","description":"ID of the source component"},
						"target_id":{"type":"string","description":"ID of the target component"},
						"label":{"type":"string","description":"Edge label (e.g. 'HTTPS', 'TCP')"}
					},
					"required":["source_id","target_id"]
				}`),
			},
		},
		{
			Type: "function",
			Function: ToolDefFunc{
				Name:        "delete_component",
				Description: "Deletes a component by its exact ID. Use find_component first if you don't have the ID.",
				Parameters: json.RawMessage(`{
					"type":"object",
					"properties":{
						"id":{"type":"string","description":"Exact component ID to delete"}
					},
					"required":["id"]
				}`),
			},
		},
		{
			Type: "function",
			Function: ToolDefFunc{
				Name:        "delete_by_label",
				Description: "Finds and deletes a component by its label (partial match, case-insensitive). This is the easiest way to remove something.",
				Parameters: json.RawMessage(`{
					"type":"object",
					"properties":{
						"label":{"type":"string","description":"Label to search for and delete"}
					},
					"required":["label"]
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
						"y":{"type":"number","description":"New Y position"},
						"metadata":{"type":"object","description":"New metadata (replaces existing)"}
					},
					"required":["id"]
				}`),
			},
		},
	}
}

func ExecuteTool(db *DB, name string, arguments json.RawMessage, callID string) ToolResult {
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

	case "find_component":
		var args struct {
			Query string `json:"query"`
		}
		if err := json.Unmarshal(arguments, &args); err != nil {
			result.Content = fmt.Sprintf("Error parsing arguments: %v", err)
			return result
		}
		matches, err := findComponent(db, args.Query)
		if err != nil {
			result.Content = fmt.Sprintf("Error: %v", err)
		} else if len(matches) == 0 {
			result.Content = fmt.Sprintf("No components found matching '%s'", args.Query)
		} else {
			result.Content = fmt.Sprintf("Found %d component(s):", len(matches))
			result.Data = matches
		}

	case "create_component":
		var args struct {
			Type     string          `json:"type"`
			Label    string          `json:"label"`
			X        float64         `json:"x"`
			Y        float64         `json:"y"`
			Metadata json.RawMessage `json:"metadata"`
		}
		if err := json.Unmarshal(arguments, &args); err != nil {
			result.Content = fmt.Sprintf("Error parsing arguments: %v", err)
			return result
		}
		id, err := createComponent(db, args.Type, args.Label, args.X, args.Y, args.Metadata)
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
			ID       string          `json:"id"`
			Label    *string         `json:"label"`
			X        *float64        `json:"x"`
			Y        *float64        `json:"y"`
			Metadata json.RawMessage `json:"metadata"`
		}
		if err := json.Unmarshal(arguments, &args); err != nil {
			result.Content = fmt.Sprintf("Error parsing arguments: %v", err)
			return result
		}
		err := updateComponent(db, args.ID, args.Label, args.X, args.Y, args.Metadata)
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

	case "delete_by_label":
		var args struct {
			Label string `json:"label"`
		}
		if err := json.Unmarshal(arguments, &args); err != nil {
			result.Content = fmt.Sprintf("Error parsing arguments: %v", err)
			return result
		}
		matches, err := findComponent(db, args.Label)
		if err != nil {
			result.Content = fmt.Sprintf("Error: %v", err)
		} else if len(matches) == 0 {
			result.Content = fmt.Sprintf("No component found with label '%s'", args.Label)
		} else {
			deleted := 0
			for _, m := range matches {
				if delErr := deleteComponent(db, m.ID); delErr == nil {
					deleted++
				}
			}
			result.Content = fmt.Sprintf("Deleted %d component(s) matching '%s'", deleted, args.Label)
		}

	default:
		result.Content = fmt.Sprintf("Unknown tool: %s", name)
	}

	return result
}

// --- Query helpers ---

type architectureData struct {
	Components []componentJSON `json:"components"`
	Edges      []edgeJSON      `json:"edges"`
}

type componentJSON struct {
	ID       string          `json:"id"`
	Type     string          `json:"type"`
	Label    string          `json:"label"`
	X        float64         `json:"x"`
	Y        float64         `json:"y"`
	Metadata json.RawMessage `json:"metadata,omitempty"`
}

type edgeJSON struct {
	ID       string  `json:"id"`
	SourceID string  `json:"source_id"`
	TargetID string  `json:"target_id"`
	Label    *string `json:"label,omitempty"`
}

type foundComponent struct {
	ID    string `json:"id"`
	Type  string `json:"type"`
	Label string `json:"label"`
}

func inspectArchitecture(db *DB) (architectureData, error) {
	var data architectureData

	rows, err := db.Query(`SELECT id, type, label, x, y, metadata FROM components ORDER BY created_at`)
	if err != nil {
		return data, err
	}
	defer rows.Close()
	for rows.Next() {
		var c componentJSON
		if err := rows.Scan(&c.ID, &c.Type, &c.Label, &c.X, &c.Y, &c.Metadata); err != nil {
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

func findComponent(db *DB, query string) ([]foundComponent, error) {
	q := "%" + strings.ToLower(query) + "%"
	var matches []foundComponent

	var rows *sql.Rows
	var err error
	if db.isPostgres {
		rows, err = db.Query(`SELECT id, type, label FROM components WHERE LOWER(type) LIKE $1 OR LOWER(label) LIKE $1 ORDER BY created_at`, q)
	} else {
		rows, err = db.Query(`SELECT id, type, label FROM components WHERE LOWER(type) LIKE ? OR LOWER(label) LIKE ? ORDER BY created_at`, q, q)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var c foundComponent
		if err := rows.Scan(&c.ID, &c.Type, &c.Label); err != nil {
			return nil, err
		}
		matches = append(matches, c)
	}
	return matches, rows.Err()
}

func createComponent(db *DB, compType, label string, x, y float64, metadata json.RawMessage) (string, error) {
	id := uuid.NewString()
	meta := nullableJSON(metadata)
	if db.isPostgres {
		_, err := db.Exec(`INSERT INTO components (id, type, label, x, y, metadata) VALUES ($1, $2, $3, $4, $5, $6)`, id, compType, label, x, y, meta)
		return id, err
	}
	_, err := db.Exec(`INSERT INTO components (id, type, label, x, y, metadata) VALUES (?, ?, ?, ?, ?, ?)`, id, compType, label, x, y, meta)
	return id, err
}

func createEdge(db *DB, sourceID, targetID string, label *string) (string, error) {
	id := uuid.NewString()
	if db.isPostgres {
		_, err := db.Exec(`INSERT INTO edges (id, source_id, target_id, label) VALUES ($1, $2, $3, $4)`, id, sourceID, targetID, label)
		return id, err
	}
	_, err := db.Exec(`INSERT INTO edges (id, source_id, target_id, label) VALUES (?, ?, ?, ?)`, id, sourceID, targetID, label)
	return id, err
}

func updateComponent(db *DB, id string, label *string, x, y *float64, metadata json.RawMessage) error {
	var currentLabel string
	var currentX, currentY float64
	var currentMeta sql.NullString

	scanRow := func() error {
		if db.isPostgres {
			return db.QueryRow(`SELECT label, x, y, metadata FROM components WHERE id = $1`, id).Scan(&currentLabel, &currentX, &currentY, &currentMeta)
		}
		return db.QueryRow(`SELECT label, x, y, metadata FROM components WHERE id = ?`, id).Scan(&currentLabel, &currentX, &currentY, &currentMeta)
	}
	if err := scanRow(); err != nil {
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
	meta := nullableJSON(metadata)
	if meta == nil && currentMeta.Valid {
		meta = currentMeta.String
	}

	if db.isPostgres {
		_, err := db.Exec(`UPDATE components SET label = $1, x = $2, y = $3, metadata = $4, updated_at = NOW() WHERE id = $5`, currentLabel, currentX, currentY, meta, id)
		return err
	}
	_, err := db.Exec(`UPDATE components SET label = ?, x = ?, y = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, currentLabel, currentX, currentY, meta, id)
	return err
}

func deleteComponent(db *DB, id string) error {
	var result sql.Result
	var err error
	if db.isPostgres {
		result, err = db.Exec(`DELETE FROM components WHERE id = $1`, id)
	} else {
		result, err = db.Exec(`DELETE FROM components WHERE id = ?`, id)
	}
	if err != nil {
		return err
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		return fmt.Errorf("component not found: %s", id)
	}
	return nil
}

func nullableJSON(value json.RawMessage) interface{} {
	if len(value) == 0 || string(value) == "null" {
		return nil
	}
	return string(value)
}
