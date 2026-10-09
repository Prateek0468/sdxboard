package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func newTestServer(t *testing.T) *httptest.Server {
	t.Helper()
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	db.SetMaxOpenConns(1)
	t.Cleanup(func() { db.Close() })
	if err := migrate(db); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	ts := httptest.NewServer(newServer(db, false, "", nil).routes())
	t.Cleanup(ts.Close)
	return ts
}

// doJSON performs a request and decodes the JSON body (nil for 204 responses).
func doJSON(t *testing.T, method, url, body string) (*http.Response, any) {
	t.Helper()
	req, err := http.NewRequest(method, url, strings.NewReader(body))
	if err != nil {
		t.Fatalf("new request: %v", err)
	}
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("%s %s: %v", method, url, err)
	}
	defer res.Body.Close()
	if res.StatusCode == http.StatusNoContent {
		return res, nil
	}
	var payload any
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		t.Fatalf("%s %s: decode response: %v", method, url, err)
	}
	return res, payload
}

func asMap(t *testing.T, v any) map[string]any {
	t.Helper()
	m, ok := v.(map[string]any)
	if !ok {
		t.Fatalf("expected object, got %T (%v)", v, v)
	}
	return m
}

func asArray(t *testing.T, v any) []any {
	t.Helper()
	a, ok := v.([]any)
	if !ok {
		t.Fatalf("expected array, got %T (%v)", v, v)
	}
	return a
}

func TestDiagramLifecycle(t *testing.T) {
	ts := newTestServer(t)

	// Seed the live working table with one component.
	res, _ := doJSON(t, "POST", ts.URL+"/api/components", `{"type":"api-server","label":"Live","x":10,"y":20}`)
	if res.StatusCode != http.StatusCreated {
		t.Fatalf("create component: status %d", res.StatusCode)
	}

	// Save a diagram whose snapshot contains a different component.
	res, created := doJSON(t, "POST", ts.URL+"/api/diagrams", `{
		"name": "checkout",
		"payload": {
			"components": [{"id":"c-saved","type":"database","label":"Saved DB","x":5,"y":6,"metadata":{"tier":"gold"}}],
			"edges": [],
			"textNodes": [{"id":"text-1","x":1,"y":2,"label":"note"}],
			"arrows": [{"id":"arrow-1","x1":0,"y1":0,"x2":10,"y2":10}]
		}
	}`)
	if res.StatusCode != http.StatusCreated {
		t.Fatalf("create diagram: status %d", res.StatusCode)
	}
	id, _ := asMap(t, created)["id"].(string)
	if id == "" {
		t.Fatal("create diagram: missing id")
	}

	// List shows it.
	res, list := doJSON(t, "GET", ts.URL+"/api/diagrams", "")
	if res.StatusCode != http.StatusOK {
		t.Fatalf("list diagrams: status %d", res.StatusCode)
	}
	items := asArray(t, list)
	if len(items) != 1 || asMap(t, items[0])["name"] != "checkout" {
		t.Fatalf("unexpected list: %v", list)
	}

	// Opening replaces the live tables with the snapshot.
	res, openedAny := doJSON(t, "POST", ts.URL+"/api/diagrams/"+id+"/open", "")
	if res.StatusCode != http.StatusOK {
		t.Fatalf("open diagram: status %d", res.StatusCode)
	}
	opened := asMap(t, openedAny)
	components := asArray(t, opened["components"])
	if len(components) != 1 {
		t.Fatalf("open: expected 1 component, got %d", len(components))
	}
	first := asMap(t, components[0])
	if first["id"] != "c-saved" || first["label"] != "Saved DB" {
		t.Fatalf("open: wrong component %v", first)
	}
	meta, _ := first["metadata"].(map[string]any)
	if meta == nil || meta["tier"] != "gold" {
		t.Fatalf("open: metadata not preserved: %v", first["metadata"])
	}
	// Text nodes and arrows round-trip untouched.
	if len(asArray(t, opened["textNodes"])) != 1 || len(asArray(t, opened["arrows"])) != 1 {
		t.Fatalf("open: text/arrows lost: %v", opened)
	}

	// The live working table now matches the snapshot (agent sees it).
	res, live := doJSON(t, "GET", ts.URL+"/api/architecture", "")
	if res.StatusCode != http.StatusOK {
		t.Fatalf("architecture: status %d", res.StatusCode)
	}
	liveComponents := asArray(t, asMap(t, live)["components"])
	if len(liveComponents) != 1 {
		t.Fatalf("live components: expected 1 after open, got %d", len(liveComponents))
	}
	if asMap(t, liveComponents[0])["id"] != "c-saved" {
		t.Fatalf("live table was not replaced: %v", liveComponents[0])
	}

	// Update persists a new payload.
	res, _ = doJSON(t, "PUT", ts.URL+"/api/diagrams/"+id, `{"payload":{"components":[],"edges":[],"textNodes":[],"arrows":[]}}`)
	if res.StatusCode != http.StatusOK {
		t.Fatalf("update diagram: status %d", res.StatusCode)
	}
	res, openedAny = doJSON(t, "POST", ts.URL+"/api/diagrams/"+id+"/open", "")
	if res.StatusCode != http.StatusOK || len(asArray(t, asMap(t, openedAny)["components"])) != 0 {
		t.Fatalf("open after update: status %d payload %v", res.StatusCode, openedAny)
	}

	// Opening a missing diagram is a 404.
	res, _ = doJSON(t, "POST", ts.URL+"/api/diagrams/nope/open", "")
	if res.StatusCode != http.StatusNotFound {
		t.Fatalf("open missing: status %d", res.StatusCode)
	}

	// Delete: 204 then 404.
	res, _ = doJSON(t, "DELETE", ts.URL+"/api/diagrams/"+id, "")
	if res.StatusCode != http.StatusNoContent {
		t.Fatalf("delete diagram: status %d", res.StatusCode)
	}
	res, _ = doJSON(t, "DELETE", ts.URL+"/api/diagrams/"+id, "")
	if res.StatusCode != http.StatusNotFound {
		t.Fatalf("delete missing: status %d", res.StatusCode)
	}
	_, remaining := doJSON(t, "GET", ts.URL+"/api/diagrams", "")
	if len(asArray(t, remaining)) != 0 {
		t.Fatalf("list after delete should be empty: %v", remaining)
	}
}

func TestOpenDiagramRestoresEdges(t *testing.T) {
	ts := newTestServer(t)

	res, created := doJSON(t, "POST", ts.URL+"/api/diagrams", `{
		"name": "with-edges",
		"payload": {
			"components": [
				{"id":"a","type":"client","label":"A","x":0,"y":0},
				{"id":"b","type":"database","label":"B","x":100,"y":0}
			],
			"edges": [{"id":"e1","sourceId":"a","targetId":"b","label":"calls"}],
			"textNodes": [],
			"arrows": []
		}
	}`)
	if res.StatusCode != http.StatusCreated {
		t.Fatalf("create: status %d", res.StatusCode)
	}
	id := asMap(t, created)["id"].(string)

	res, opened := doJSON(t, "POST", ts.URL+"/api/diagrams/"+id+"/open", "")
	if res.StatusCode != http.StatusOK {
		t.Fatalf("open: status %d", res.StatusCode)
	}
	edges := asArray(t, asMap(t, opened)["edges"])
	if len(edges) != 1 || asMap(t, edges[0])["label"] != "calls" {
		t.Fatalf("edges not restored: %v", edges)
	}
}
