package agent

import (
	"log"
	"sort"
)

const (
	layoutColumnGap = 360.0 // horizontal distance between columns
	layoutRowGap    = 200.0 // vertical distance between components in a column
	layoutStartX    = 150.0 // x of the first column
	layoutCenterY   = 300.0 // vertical center of the diagram
	layoutEpsilon   = 1.0   // ignore position changes smaller than this
)

type layoutComp struct {
	id    string
	label string
	x, y  float64
	order int
}

type layoutEdge struct{ source, target string }

// AutoLayout repositions every component into a clean layered left-to-right
// arrangement. Components are grouped into columns by graph depth, siblings in
// a column are evenly spaced, and each component gets a unique slot, so two
// components can never overlap.
func AutoLayout(db *DB) error {
	comps, err := loadLayoutComps(db)
	if err != nil {
		return err
	}
	if len(comps) < 2 {
		return nil
	}

	edges, err := loadLayoutEdges(db)
	if err != nil {
		return err
	}

	index := map[string]int{}
	for i, c := range comps {
		index[c.id] = i
	}

	layers := assignLayers(len(comps), edges, index)
	orderLayers(comps, edges, index, layers)

	// Assign one unique slot per component: column = layer, row = index.
	counts := map[int]int{}
	for _, l := range layers {
		counts[l]++
	}
	seen := map[int]int{}
	for i := range comps {
		l := layers[i]
		idx := seen[l]
		seen[l]++
		n := counts[l]
		comps[i].x = layoutStartX + float64(l)*layoutColumnGap
		comps[i].y = layoutCenterY + (float64(idx)-float64(n-1)/2)*layoutRowGap
	}

	return saveLayoutPositions(db, comps)
}

func loadLayoutComps(db *DB) ([]layoutComp, error) {
	rows, err := db.Query(`SELECT id, label, x, y FROM components ORDER BY created_at`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comps []layoutComp
	for rows.Next() {
		var c layoutComp
		if err := rows.Scan(&c.id, &c.label, &c.x, &c.y); err != nil {
			return nil, err
		}
		c.order = len(comps)
		comps = append(comps, c)
	}
	return comps, rows.Err()
}

func loadLayoutEdges(db *DB) ([]layoutEdge, error) {
	rows, err := db.Query(`SELECT source_id, target_id FROM edges ORDER BY created_at`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var edges []layoutEdge
	for rows.Next() {
		var e layoutEdge
		if err := rows.Scan(&e.source, &e.target); err != nil {
			return nil, err
		}
		edges = append(edges, e)
	}
	return edges, rows.Err()
}

// assignLayers computes the column index of every component using Kahn's
// algorithm: a component sits one column right of its deepest predecessor.
// Nodes caught in cycles are placed after the last column.
func assignLayers(n int, edges []layoutEdge, index map[string]int) []int {
	preds := make([][]int, n)
	succs := make([][]int, n)
	indeg := make([]int, n)

	for _, e := range edges {
		s, okS := index[e.source]
		t, okT := index[e.target]
		if !okS || !okT || s == t {
			continue
		}
		succs[s] = append(succs[s], t)
		preds[t] = append(preds[t], s)
		indeg[t]++
	}

	layers := make([]int, n)
	done := make([]bool, n)
	queue := []int{}
	for i := 0; i < n; i++ {
		if indeg[i] == 0 {
			queue = append(queue, i)
		}
	}
	for len(queue) > 0 {
		u := queue[0]
		queue = queue[1:]
		if done[u] {
			continue
		}
		done[u] = true
		for _, v := range succs[u] {
			if layers[v] < layers[u]+1 {
				layers[v] = layers[u] + 1
			}
			indeg[v]--
			if indeg[v] == 0 {
				queue = append(queue, v)
			}
		}
	}

	// Components inside cycles (or behind one): place each one extra column
	// to the right so the flow still reads left-to-right.
	next := 0
	for i := 0; i < n; i++ {
		if layers[i] > next {
			next = layers[i]
		}
	}
	for i := 0; i < n; i++ {
		if !done[i] {
			next++
			layers[i] = next
			done[i] = true
		}
	}
	return layers
}

// orderLayers reduces arrow crossings by repeatedly sorting each column
// (barycenter heuristic): a component is placed near the average row of the
// components it connects to.
func orderLayers(comps []layoutComp, edges []layoutEdge, index map[string]int, layers []int) {
	n := len(comps)
	preds := make([][]int, n)
	succs := make([][]int, n)
	for _, e := range edges {
		s, okS := index[e.source]
		t, okT := index[e.target]
		if !okS || !okT || s == t || layers[s] == layers[t] {
			continue
		}
		succs[s] = append(succs[s], t)
		preds[t] = append(preds[t], s)
	}

	// Group component indices by layer, keeping them in a mutable order.
	byLayer := map[int][]int{}
	layerIDs := []int{}
	for i := range comps {
		l := layers[i]
		if _, ok := byLayer[l]; !ok {
			layerIDs = append(layerIDs, l)
		}
		byLayer[l] = append(byLayer[l], i)
	}
	sort.Ints(layerIDs)

	row := make([]int, n) // current row of each component within its column
	syncRows := func() {
		for _, l := range layerIDs {
			for r, i := range byLayer[l] {
				row[i] = r
			}
		}
	}
	syncRows()

	barycenter := func(node int, links []int) float64 {
		if len(links) == 0 {
			return float64(row[node])
		}
		sum := 0.0
		for _, l := range links {
			sum += float64(row[l])
		}
		return sum / float64(len(links))
	}

	// Alternate forward and backward sweeps to settle the ordering.
	for pass := 0; pass < 4; pass++ {
		if pass%2 == 0 {
			for _, l := range layerIDs {
				sort.SliceStable(byLayer[l], func(a, b int) bool {
					ia, ib := byLayer[l][a], byLayer[l][b]
					ba, bb := barycenter(ia, preds[ia]), barycenter(ib, preds[ib])
					if ba == bb {
						return comps[ia].order < comps[ib].order
					}
					return ba < bb
				})
			}
		} else {
			for i := len(layerIDs) - 1; i >= 0; i-- {
				l := layerIDs[i]
				sort.SliceStable(byLayer[l], func(a, b int) bool {
					ia, ib := byLayer[l][a], byLayer[l][b]
					ba, bb := barycenter(ia, succs[ia]), barycenter(ib, succs[ib])
					if ba == bb {
						return comps[ia].order < comps[ib].order
					}
					return ba < bb
				})
			}
		}
		syncRows()
	}
}

// saveLayoutPositions writes the computed coordinates back to the database,
// skipping components that already sit at their target position.
func saveLayoutPositions(db *DB, comps []layoutComp) error {
	updated := 0
	for _, c := range comps {
		query := `UPDATE components SET x = ?, y = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
		args := []any{c.x, c.y, c.id}
		if db.isPostgres {
			query = `UPDATE components SET x = $1, y = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`
		}
		// Only write when the position actually changed.
		var oldX, oldY float64
		scanQuery := `SELECT x, y FROM components WHERE id = ?`
		if db.isPostgres {
			scanQuery = `SELECT x, y FROM components WHERE id = $1`
		}
		if err := db.QueryRow(scanQuery, c.id).Scan(&oldX, &oldY); err != nil {
			continue
		}
		if abs(oldX-c.x) < layoutEpsilon && abs(oldY-c.y) < layoutEpsilon {
			continue
		}
		if _, err := db.Exec(query, args...); err != nil {
			log.Printf("auto-layout update %s: %v", c.id, err)
			continue
		}
		updated++
	}
	if updated > 0 {
		log.Printf("auto-layout repositioned %d component(s)", updated)
	}
	return nil
}

func abs(v float64) float64 {
	if v < 0 {
		return -v
	}
	return v
}
