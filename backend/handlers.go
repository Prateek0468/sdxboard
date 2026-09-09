package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
)

type component struct {
	ID        string          `json:"id"`
	Type      string          `json:"type"`
	Label     string          `json:"label"`
	X         float64         `json:"x"`
	Y         float64         `json:"y"`
	Metadata  json.RawMessage `json:"metadata,omitempty"`
	CreatedAt time.Time       `json:"createdAt"`
	UpdatedAt time.Time       `json:"updatedAt"`
}

type edge struct {
	ID        string    `json:"id"`
	SourceID  string    `json:"sourceId"`
	TargetID  string    `json:"targetId"`
	Label     *string   `json:"label,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
}

type server struct {
	db         *sql.DB
	corsOrigin string
}

func newServer(db *sql.DB, corsOrigin string) *server {
	if corsOrigin == "" {
		corsOrigin = "http://localhost:3000"
	}
	return &server{db: db, corsOrigin: corsOrigin}
}

func (s *server) routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/architecture", s.getArchitecture)
	mux.HandleFunc("POST /api/components", s.createComponent)
	mux.HandleFunc("PUT /api/components/{id}", s.updateComponent)
	mux.HandleFunc("DELETE /api/components/{id}", s.deleteComponent)
	mux.HandleFunc("POST /api/edges", s.createEdge)
	mux.HandleFunc("DELETE /api/edges/{id}", s.deleteEdge)
	return s.withCORS(mux)
}

func (s *server) withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", s.corsOrigin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *server) getArchitecture(w http.ResponseWriter, r *http.Request) {
	components, err := s.listComponents()
	if err != nil {
		internalError(w, err)
		return
	}
	edges, err := s.listEdges()
	if err != nil {
		internalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"components": components,
		"edges":      edges,
	})
}

func (s *server) createComponent(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Type, Label string
		X, Y        float64
		Metadata    json.RawMessage
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	if input.Type == "" || input.Label == "" {
		writeError(w, http.StatusBadRequest, "type and label are required")
		return
	}
	c := component{
		ID:       uuid.NewString(),
		Type:     input.Type,
		Label:    input.Label,
		X:        input.X,
		Y:        input.Y,
		Metadata: input.Metadata,
	}
	_, err := s.db.Exec(
		`INSERT INTO components (id, type, label, x, y, metadata) VALUES (?, ?, ?, ?, ?, ?)`,
		c.ID, c.Type, c.Label, c.X, c.Y, nullableJSON(c.Metadata),
	)
	if err != nil {
		internalError(w, err)
		return
	}
	row := s.db.QueryRow(`SELECT id, type, label, x, y, metadata, created_at, updated_at FROM components WHERE id = ?`, c.ID)
	if err := scanComponent(row, &c); err != nil {
		internalError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, c)
}

func (s *server) updateComponent(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Label    string
		X, Y     float64
		Metadata json.RawMessage
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	id := r.PathValue("id")
	result, err := s.db.Exec(
		`UPDATE components SET label = ?, x = ?, y = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
		input.Label, input.X, input.Y, nullableJSON(input.Metadata), id,
	)
	if err != nil {
		internalError(w, err)
		return
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		writeError(w, http.StatusNotFound, "component not found")
		return
	}
	var c component
	row := s.db.QueryRow(
		`SELECT id, type, label, x, y, metadata, created_at, updated_at FROM components WHERE id = ?`,
		id,
	)
	if err := scanComponent(row, &c); err != nil {
		internalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (s *server) deleteComponent(w http.ResponseWriter, r *http.Request) {
	result, err := s.db.Exec(`DELETE FROM components WHERE id = ?`, r.PathValue("id"))
	if err != nil {
		internalError(w, err)
		return
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		writeError(w, http.StatusNotFound, "component not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) createEdge(w http.ResponseWriter, r *http.Request) {
	var input struct {
		SourceID, TargetID string
		Label              *string
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	if input.SourceID == "" || input.TargetID == "" {
		writeError(w, http.StatusBadRequest, "sourceId and targetId are required")
		return
	}
	e := edge{
		ID:       uuid.NewString(),
		SourceID: input.SourceID,
		TargetID: input.TargetID,
		Label:    input.Label,
	}
	_, err := s.db.Exec(
		`INSERT INTO edges (id, source_id, target_id, label) VALUES (?, ?, ?, ?)`,
		e.ID, e.SourceID, e.TargetID, e.Label,
	)
	if err != nil {
		writeError(w, http.StatusBadRequest, "source and target components must exist")
		return
	}
	row := s.db.QueryRow(
		`SELECT id, source_id, target_id, label, created_at FROM edges WHERE id = ?`,
		e.ID,
	)
	if err := scanEdge(row, &e); err != nil {
		internalError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, e)
}

func (s *server) deleteEdge(w http.ResponseWriter, r *http.Request) {
	result, err := s.db.Exec(`DELETE FROM edges WHERE id = ?`, r.PathValue("id"))
	if err != nil {
		internalError(w, err)
		return
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		writeError(w, http.StatusNotFound, "edge not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) listComponents() ([]component, error) {
	rows, err := s.db.Query(
		`SELECT id, type, label, x, y, metadata, created_at, updated_at FROM components ORDER BY created_at`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []component{}
	for rows.Next() {
		var c component
		if err := scanComponent(rows, &c); err != nil {
			return nil, err
		}
		items = append(items, c)
	}
	return items, rows.Err()
}

func (s *server) listEdges() ([]edge, error) {
	rows, err := s.db.Query(
		`SELECT id, source_id, target_id, label, created_at FROM edges ORDER BY created_at`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []edge{}
	for rows.Next() {
		var e edge
		if err := scanEdge(rows, &e); err != nil {
			return nil, err
		}
		items = append(items, e)
	}
	return items, rows.Err()
}

type scanner interface{ Scan(...any) error }

func scanComponent(row scanner, c *component) error {
	var metadata sql.NullString
	if err := row.Scan(&c.ID, &c.Type, &c.Label, &c.X, &c.Y, &metadata, &c.CreatedAt, &c.UpdatedAt); err != nil {
		return err
	}
	if metadata.Valid {
		c.Metadata = json.RawMessage(metadata.String)
	}
	return nil
}

func scanEdge(row scanner, e *edge) error {
	return row.Scan(&e.ID, &e.SourceID, &e.TargetID, &e.Label, &e.CreatedAt)
}

func nullableJSON(value json.RawMessage) any {
	if len(value) == 0 || string(value) == "null" {
		return nil
	}
	return string(value)
}

func decodeJSON(w http.ResponseWriter, r *http.Request, value any) bool {
	defer r.Body.Close()
	if err := json.NewDecoder(r.Body).Decode(value); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return false
	}
	return true
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(value)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func internalError(w http.ResponseWriter, err error) {
	writeError(w, http.StatusInternalServerError, "internal server error")
}

func pathID(r *http.Request) string {
	return strings.TrimSpace(r.PathValue("id"))
}
