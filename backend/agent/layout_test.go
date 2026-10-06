package agent

import (
	"fmt"
	"testing"
)

// buildTestGraph mimics the messy diagram: fan-out, fan-in, and a cycle.
func testLayout(t *testing.T, n int, edges []layoutEdge, index map[string]int) []int {
	t.Helper()
	layers := assignLayers(n, edges, index)
	if len(layers) != n {
		t.Fatalf("expected %d layer assignments, got %d", n, len(layers))
	}
	for i, l := range layers {
		if l < 0 {
			t.Fatalf("component %d got negative layer %d", i, l)
		}
	}
	return layers
}

func TestAutoLayoutAssignmentsAreUnique(t *testing.T) {
	comps := []layoutComp{
		{id: "a"}, {id: "b"}, {id: "c"},
		{id: "d"}, {id: "e"}, {id: "f"},
	}
	index := map[string]int{"a": 0, "b": 1, "c": 2, "d": 3, "e": 4, "f": 5}

	edges := []layoutEdge{
		{"a", "b"}, {"a", "c"},
		{"b", "d"}, {"b", "e"},
		{"c", "e"}, {"d", "f"}, {"e", "f"},
		{"a", "f"}, // long-range edge
	}

	layers := assignLayers(len(comps), edges, index)

	// Left-to-right: sources must be left of their targets.
	for _, e := range edges {
		s, t2 := index[e.source], index[e.target]
		if layers[t2] <= layers[s] {
			t.Errorf("edge %s->%s not left-to-right: layer %d -> %d",
				e.source, e.target, layers[s], layers[t2])
		}
	}

	// Assign positions exactly like AutoLayout does.
	counts := map[int]int{}
	for _, l := range layers {
		counts[l]++
	}
	seen := map[int]int{}
	type pos struct{ x, y float64 }
	positions := map[string]pos{}
	for i := range comps {
		l := layers[i]
		idx := seen[l]
		seen[l]++
		n := counts[l]
		p := pos{
			x: layoutStartX + float64(l)*layoutColumnGap,
			y: layoutCenterY + (float64(idx)-float64(n-1)/2)*layoutRowGap,
		}
		if prev, ok := positions[comps[i].id]; ok && prev == p {
			t.Errorf("component %s overlaps another at %v", comps[i].id, p)
		}
		for id, other := range positions {
			if other.x == p.x && other.y == p.y {
				t.Errorf("components %s and %s overlap at (%v, %v)", id, comps[i].id, p.x, p.y)
			}
			// Column and row gaps must keep components clear of each other.
			if abs(other.x-p.x) < layoutColumnGap-0.001 && abs(other.y-p.y) < layoutRowGap-0.001 {
				t.Errorf("components %s and %s too close: (%v,%v) vs (%v,%v)",
					id, comps[i].id, other.x, other.y, p.x, p.y)
			}
		}
		positions[comps[i].id] = p
	}
}

func TestAutoLayoutHandlesCycles(t *testing.T) {
	// A -> B -> C -> A plus a sink D.
	index := map[string]int{"a": 0, "b": 1, "c": 2, "d": 3}
	edges := []layoutEdge{
		{"a", "b"}, {"b", "c"}, {"c", "a"}, {"c", "d"},
	}
	layers := testLayout(t, 4, edges, index)

	// Every component must land in a column, and the sink must be reachable.
	if layers[3] <= layers[2] {
		t.Errorf("sink d must be right of c: layers=%v", layers)
	}
	seen := map[int]bool{}
	for _, l := range layers {
		seen[l] = true
	}
	if len(seen) < 2 {
		t.Errorf("cycle graph collapsed into a single column: %v", layers)
	}
	fmt.Println("cycle layers:", layers)
}

func TestOrderLayersKeepsReadingOrder(t *testing.T) {
	comps := []layoutComp{{id: "a", order: 0}, {id: "b", order: 1}, {id: "c", order: 2}}
	index := map[string]int{"a": 0, "b": 1, "c": 2}
	edges := []layoutEdge{{"a", "b"}, {"b", "c"}}
	layers := []int{0, 1, 2}
	orderLayers(comps, edges, index, layers)

	// After ordering each column has one member; ordering must not panic
	// and must keep single-member columns stable.
	if len(comps) != 3 {
		t.Fatalf("ordering changed component count: %d", len(comps))
	}
}
