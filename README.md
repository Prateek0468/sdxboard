# System Design Canvas

A full-stack canvas for drawing system-design diagrams with an AI agent. Components and connections are stored in SQLite. The agent can create, modify, and review architectures via natural language.

## Run with Docker

```bash
docker compose up --build
# or: make up
```

Open [http://localhost:3000](http://localhost:3000). The API is also exposed at [http://localhost:8080/api/architecture](http://localhost:8080/api/architecture).

Useful commands:

```bash
make down       # stop containers; keeps the SQLite named volume
make logs       # follow logs from both services
make rebuild    # rebuild images without the Docker build cache
```

## Run without Docker

Use two terminals. You need Go 1.22+ and Node.js 20+.

```bash
cd backend
DB_PATH=./data/app.db go run .
```

```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8080 npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## What Docker Is Doing

- `backend/Dockerfile` first uses a Go builder image, which contains the compiler and CGO tools needed by `go-sqlite3`.
- Its second stage starts from Alpine and copies in only the compiled server binary, making the final backend image smaller.
- `frontend/Dockerfile` first installs Node packages and runs `next build`.
- Its final stage copies Next's standalone server and static assets, without development dependencies or source files.
- `docker-compose.yml` builds both images, publishes ports 3000 and 8080 to your machine, and gives the services a shared private Docker network.
- On that private network, Compose creates DNS entries from service names, so `frontend` can reach `http://backend:8080`.
- Your browser is outside that network, so it cannot resolve `backend`; the Next server proxies browser requests from `/api/*` to the backend service.
- The `canvas-data` named volume is mounted at `/data` in the backend, so SQLite data persists when containers are stopped and started again.

## API

- `GET /api/architecture`
- `POST /api/components`
- `PUT /api/components/:id`
- `DELETE /api/components/:id`
- `POST /api/edges`
- `DELETE /api/edges/:id`

---

## Roadmap

### Phase 0 — Scaffold

- [x] Go backend running with SQLite, CRUD endpoints for components/edges
- [x] Next.js frontend with reactflow rendering an empty canvas
- [x] Drag palette item onto canvas → creates component (persisted)
- [x] Connect two nodes → creates edge (persisted)
- [x] Move node → position persists on refresh
- [x] Delete node/edge → removed from canvas and DB
- [x] Page load → fetches and renders existing graph from API
- [x] `docker compose up` runs both services and they can talk to each other
- [x] Data survives `docker compose down / up` (volume works)
- [x] README covers both Docker and native run instructions

> **Milestone:** You can draw a diagram, refresh the page, and it's still there.

### Phase 1 — Minimal Agent Loop

- [ ] Pick local model via Ollama (e.g. Qwen2.5) + define a swap-in interface for hosted models later
- [ ] Backend endpoint `POST /api/agent/message` that takes a user prompt
- [ ] Implement `inspect_architecture` tool (returns current graph as JSON to model)
- [ ] Implement `create_component` tool
- [ ] Implement `connect_components` tool
- [ ] Implement `delete_component` tool
- [ ] Basic agent loop: prompt → tool call → execute → feed result back → repeat until model stops
- [ ] Frontend: simple chat input box next to canvas
- [ ] Canvas updates live as agent creates components (poll or websocket)
- [ ] Test: "Design a URL shortener" produces a sensible starter architecture
- [ ] Test: "Add caching" correctly modifies existing graph, not a fresh one

> **Milestone:** You type a prompt, watch nodes appear one by one, then give one follow-up instruction that correctly edits the existing diagram.

### Phase 2 — Full Component Model

- [ ] Expand palette to full component list (DNS, CDN, Kafka, Vector DB, LLM, etc.)
- [ ] Add structured metadata fields per component type (capacity, latency, replication, etc.)
- [ ] Metadata edit panel in UI (click node → side panel with fields)
- [ ] `update_component` tool (agent can modify metadata, not just create/delete)
- [ ] `move_component` tool
- [ ] `find_component` tool (agent can locate by type/label without full graph dump)
- [ ] Test: "Replace PostgreSQL with DynamoDB" works via update/delete/create combo

### Phase 3 — Canvas Polish

- [ ] Undo/redo
- [ ] Multi-select
- [ ] Copy/paste
- [ ] Grouping
- [ ] Save/load named diagrams (not just one live graph)
- [ ] Export diagram as PNG/SVG
- [ ] Keyboard shortcuts (delete, escape, etc.)

### Phase 4 — Architecture Reviewer

- [ ] Define rule set: SPOF detection, missing replication, no caching layer, obvious bottlenecks
- [ ] `validate_architecture` tool
- [ ] Reviewer prompt template that reasons over the graph + rules
- [ ] Visual highlighting on canvas (red border on flagged nodes/edges)
- [ ] "Review my architecture" chat command wired end-to-end
- [ ] Test against 2-3 intentionally bad sample architectures

### Phase 5 — Traffic Simulation

- [ ] Requirements input form (DAU, req/s, read/write ratio, latency target, availability)
- [ ] Simple per-node capacity/throughput math (queueing approximation, not full sim)
- [ ] `run_simulation` tool
- [ ] Bottleneck detection based on simulated load vs. component capacity
- [ ] Visualize traffic flow + metrics on canvas (numbers on edges/nodes)

### Phase 6 — Failure Simulation

- [ ] `simulate_failure` tool (kill component by id)
- [ ] Propagation logic (what depends on the killed node, what happens downstream)
- [ ] Canvas visualization of failure state (greyed out / red node)
- [ ] Agent explains impact in plain language
- [ ] Agent suggests fixes (chat follow-up)

### Phase 7 — Cost Estimation

- [ ] Pricing table per component type (rough $/month estimates)
- [ ] `estimate_cost` tool
- [ ] Cost breakdown panel in UI
- [ ] "Reduce cost by 30%" → agent proposes architecture changes + tradeoff explanation

### Phase 8 — Versioning

- [ ] Snapshot/save current graph as a named version
- [ ] Version list UI (v1, v2, v3...)
- [ ] Diff view between two versions (what was added/removed/changed)
- [ ] Revert to a previous version
- [ ] "Explain what changed between v2 and v3" via agent

### Phase 9 — Interview Mode

- [ ] Interview prompt bank (Design Twitter, YouTube, Uber, etc.)
- [ ] Interview session state (question asked, user's diagram, follow-ups)
- [ ] Agent follow-up question generation based on current diagram
- [ ] Scoring rubric (Requirements, Architecture, Scalability, etc.)
- [ ] End-of-session evaluation output

### Phase 10 — Agent Memory

- [ ] Local vector store (Chroma or SQLite+FAISS)
- [ ] Store past decisions, preferences, interview sessions as embeddings
- [ ] Retrieval step in agent loop (pull relevant memory into context)
- [ ] Test: agent references a decision/preference from an earlier session

### Phase 11 — Observability

- [ ] Log every agent step (reasoning, tool selected, tool result, decision)
- [ ] Execution trace UI (timeline view of a single agent run)
- [ ] Track token usage, latency per call, error rate
- [ ] Basic dashboard (even just a table view is fine to start)

### Phase 12 — Evaluation Framework

- [ ] Define eval task set (Design Twitter/YouTube/Uber/Netflix/WhatsApp/URL Shortener)
- [ ] Automated scoring criteria (valid architecture, appropriate components, no obvious SPOFs, etc.)
- [ ] Eval runner script (run all tasks against current agent, record scores)
- [ ] Score tracking across model/prompt versions over time
- [ ] Simple report/leaderboard view
