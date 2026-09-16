# System Design Canvas

A full-stack canvas for drawing system-design diagrams with an AI agent. Components and connections are stored in PostgreSQL. The agent can create, modify, and review architectures via natural language.

## Run with Docker

```bash
docker compose up --build
# or: make up
```

Open [http://localhost:3000](http://localhost:3000). The API is also exposed at [http://localhost:8080/api/architecture](http://localhost:8080/api/architecture).

Useful commands:

```bash
make down       # stop containers; keeps the Postgres volume
make logs       # follow logs from both services
make rebuild    # rebuild images without the Docker build cache
```

## Run without Docker

You need Go 1.22+, Node.js 20+, and a running PostgreSQL instance.

**1. Set up the database**

Create a database (or use an existing one):

```bash
createdb sdxboard
```

**2. Configure environment**

Copy the example env file and fill in your values:

```bash
cd backend
cp .env.example .env
# edit .env with your DATABASE_URL and OPENROUTER_API_KEY
```

**3. Start the backend**

```bash
cd backend
go run .
```

The backend reads `.env` and `.env.local` automatically via [godotenv](https://github.com/joho/godotenv).

**4. Start the frontend**

```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:3000 npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/sdxboard?sslmode=disable` | PostgreSQL connection string |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed CORS origin |
| `OPENROUTER_API_KEY` | _(none)_ | Your OpenRouter API key (required for agent) |
| `OPENROUTER_BASE_URL` | `https://openrouter.ai` | API base URL |
| `AI_MODEL` | `openrouter/free` | Model slug. `openrouter/free` auto-selects a free model |

## AI Agent Setup

The agent uses [OpenRouter](https://openrouter.ai) to access free AI models. No local model installation required.

1. Get a free API key at [openrouter.ai/keys](https://openrouter.ai/keys)
2. Add it to your `.env` file:

```
OPENROUTER_API_KEY=sk-or-v1-xxxxx
```

Without `OPENROUTER_API_KEY`, the agent endpoint is disabled and the app works as a diagram-only tool.

## What Docker Is Doing

- `docker-compose.yml` runs three services: PostgreSQL (`db`), Go backend, and Next.js frontend.
- PostgreSQL stores data in a named volume (`pgdata`) that persists across container restarts.
- The backend connects to Postgres via the `db` service hostname on Docker's private network.
- The frontend proxies browser API requests to the backend via Next.js rewrites.
- Your browser can't resolve `backend` directly, so the Next server acts as a proxy.

## API

- `GET /api/architecture`
- `POST /api/components`
- `PUT /api/components/:id`
- `DELETE /api/components/:id`
- `POST /api/edges`
- `DELETE /api/edges/:id`
- `POST /api/agent/message` — send a natural language prompt to the AI agent

---

## Roadmap

### Phase 0 — Scaffold

- [x] Go backend running with PostgreSQL, CRUD endpoints for components/edges
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

- [x] Pick model via OpenRouter free tier (no local install required)
- [x] Backend endpoint `POST /api/agent/message` that takes a user prompt
- [x] Implement `inspect_architecture` tool (returns current graph as JSON to model)
- [x] Implement `create_component` tool
- [x] Implement `connect_components` tool
- [x] Implement `delete_component` tool
- [x] Implement `update_component` tool
- [x] Basic agent loop: prompt → tool call → execute → feed result back → repeat until model stops
- [x] Frontend: chat sidebar next to canvas
- [x] Canvas updates live as agent creates components (poll after agent turn)
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

- [ ] Local vector store (Chroma or pgvector)
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
