import { create } from "zustand";
import { Edge, Node, Position, addEdge } from "reactflow";

// --- History store (undo/redo) ---

type Snapshot = { nodes: Node[]; edges: Edge[] };

const MAX_HISTORY = 50;

export const useHistoryStore = create<{
  past: Snapshot[];
  future: Snapshot[];
  record: (snapshot: Snapshot) => void;
  undo: () => Snapshot | null;
  redo: () => Snapshot | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}>((set, get) => ({
  past: [],
  future: [],
  record: (snapshot) =>
    set((s) => ({
      past: [...s.past.slice(-MAX_HISTORY + 1), snapshot],
      future: [],
    })),
  undo: () => {
    const { past, future } = get();
    if (past.length === 0) return null;
    const prev = past[past.length - 1];
    const current = useGraphStore.getState();
    set({
      past: past.slice(0, -1),
      future: [{ nodes: current.nodes, edges: current.edges }, ...future],
    });
    return prev;
  },
  redo: () => {
    const { past, future } = get();
    if (future.length === 0) return null;
    const next = future[0];
    const current = useGraphStore.getState();
    set({
      past: [...past, { nodes: current.nodes, edges: current.edges }],
      future: future.slice(1),
    });
    return next;
  },
  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
  clear: () => set({ past: [], future: [] }),
}));

function snapshot() {
  const { nodes, edges } = useGraphStore.getState();
  useHistoryStore.getState().record({ nodes, edges });
}

// --- Tool store ---

export type ToolMode = "pointer" | "text" | "arrow";

export const useToolStore = create<{
  mode: ToolMode;
  setMode: (mode: ToolMode) => void;
}>((set) => ({
  mode: "pointer",
  setMode: (mode) => set({ mode }),
}));

// --- Arrow store (independent canvas arrows) ---

export type ArrowData = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  text?: string;
};

export const useArrowStore = create<{
  arrows: ArrowData[];
  addArrow: (arrow: ArrowData) => void;
  updateArrow: (id: string, patch: Partial<ArrowData>) => void;
  removeArrow: (id: string) => void;
}>((set) => ({
  arrows: [],
  addArrow: (arrow) => set((s) => ({ arrows: [...s.arrows, arrow] })),
  updateArrow: (id, patch) =>
    set((s) => ({
      arrows: s.arrows.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    })),
  removeArrow: (id) => set((s) => ({ arrows: s.arrows.filter((a) => a.id !== id) })),
}));

// --- Component types ---

export const componentTypes = [
  { type: "client", label: "Client", color: "#3b82f6", category: "client" },
  { type: "dns", label: "DNS", color: "#8b5cf6", category: "network" },
  { type: "load-balancer", label: "Load Balancer", color: "#ec4899", category: "network" },
  { type: "api-gateway", label: "API Gateway", color: "#d946ef", category: "network" },
  { type: "api-server", label: "API Server", color: "#f97316", category: "compute" },
  { type: "serverless", label: "Serverless", color: "#f97316", category: "compute" },
  { type: "worker", label: "Worker", color: "#6366f1", category: "compute" },
  { type: "ml-service", label: "ML Service", color: "#8b5cf6", category: "compute" },
  { type: "database", label: "Database", color: "#14b8a6", category: "storage" },
  { type: "cache", label: "Cache", color: "#eab308", category: "storage" },
  { type: "object-storage", label: "Object Storage", color: "#22c55e", category: "storage" },
  { type: "search-engine", label: "Search Engine", color: "#06b6d4", category: "storage" },
  { type: "vector-db", label: "Vector DB", color: "#14b8a6", category: "storage" },
  { type: "queue", label: "Queue", color: "#ef4444", category: "messaging" },
  { type: "message-broker", label: "Message Broker", color: "#ef4444", category: "messaging" },
  { type: "cdn", label: "CDN", color: "#06b6d4", category: "edge" },
  { type: "cdn-edge", label: "CDN Edge", color: "#06b6d4", category: "edge" },
  { type: "monitoring", label: "Monitoring", color: "#64748b", category: "ops" },
] as const;
export type ComponentType = typeof componentTypes[number]["type"];

const api = process.env.NEXT_PUBLIC_API_URL || "/api";
const typeInfo = (type: string) => componentTypes.find((item) => item.type === type) || componentTypes[0];
const asNode = (component: ApiComponent): Node => {
  const info = typeInfo(component.type);
  return {
    id: component.id,
    type: "system",
    position: { x: component.x, y: component.y },
    data: { label: component.label, type: component.type, color: info.color },
  };
};
const asEdge = (edge: ApiEdge): Edge => ({ id: edge.id, source: edge.sourceId, target: edge.targetId, label: edge.label || undefined });

type ApiComponent = { id: string; type: string; label: string; x: number; y: number; metadata?: unknown };
type ApiEdge = { id: string; sourceId: string; targetId: string; label?: string };
type GraphStore = {
  nodes: Node[]; edges: Edge[];
  textNodes: Node[];
  load: () => Promise<void>;
  addComponent: (type: ComponentType, position: { x: number; y: number }) => Promise<void>;
  connect: (sourceId: string, targetId: string) => Promise<void>;
  updatePosition: (id: string, position: { x: number; y: number }) => Promise<void>;
  removeNodes: (ids: string[]) => Promise<void>;
  removeEdges: (ids: string[]) => Promise<void>;
  addTextNode: (position: { x: number; y: number }) => string;
  updateTextNode: (id: string, label: string) => void;
  removeTextNode: (id: string) => void;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${api}${path}`, { headers: { "Content-Type": "application/json" }, ...options });
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  return response.status === 204 ? undefined as T : response.json();
}

export const useGraphStore = create<GraphStore>((set, get) => ({
  nodes: [], edges: [], textNodes: [],
  load: async () => { const graph = await request<{ components: ApiComponent[]; edges: ApiEdge[] }>("/architecture"); set({ nodes: graph.components.map(asNode), edges: graph.edges.map(asEdge) }); useHistoryStore.getState().clear(); },
  addComponent: async (type, position) => { snapshot(); const { label } = typeInfo(type); const component = await request<ApiComponent>("/components", { method: "POST", body: JSON.stringify({ type, label, x: position.x, y: position.y }) }); set((state) => ({ nodes: [...state.nodes, asNode(component)] })); },
  connect: async (sourceId, targetId) => { snapshot(); const edge = await request<ApiEdge>("/edges", { method: "POST", body: JSON.stringify({ sourceId, targetId }) }); set((state) => ({ edges: addEdge(asEdge(edge), state.edges) })); },
  updatePosition: async (id, position) => { snapshot(); const node = get().nodes.find((item) => item.id === id); if (!node) return; set((state) => ({ nodes: state.nodes.map((item) => item.id === id ? { ...item, position } : item) })); await request(`/components/${id}`, { method: "PUT", body: JSON.stringify({ label: String(node.data.label), x: position.x, y: position.y, metadata: null }) }); },
  removeNodes: async (ids) => { snapshot(); set((state) => ({ nodes: state.nodes.filter((node) => !ids.includes(node.id)), edges: state.edges.filter((edge) => !ids.includes(edge.source) && !ids.includes(edge.target)) })); await Promise.all(ids.map((id) => request(`/components/${id}`, { method: "DELETE" }))); },
  removeEdges: async (ids) => { snapshot(); set((state) => ({ edges: state.edges.filter((edge) => !ids.includes(edge.id)) })); await Promise.all(ids.map((id) => request(`/edges/${id}`, { method: "DELETE" }))); },
  addTextNode: (position) => {
    const id = `text-${Date.now()}`;
    const node: Node = { id, type: "text", position, draggable: true, data: { label: "" } };
    set((state) => ({ textNodes: [...state.textNodes, node] }));
    return id;
  },
  updateTextNode: (id, label) => {
    set((state) => ({
      textNodes: state.textNodes.map((n) => n.id === id ? { ...n, data: { ...n.data, label } } : n),
    }));
  },
  removeTextNode: (id) => {
    set((state) => ({ textNodes: state.textNodes.filter((n) => n.id !== id) }));
  },
}));

// --- Selection store ---

export const useSelectionStore = create<{
  selectedNodeId: string | null;
  selectNode: (id: string | null) => void;
}>((set) => ({
  selectedNodeId: null,
  selectNode: (id) => set({ selectedNodeId: id }),
}));

// --- Chat store ---

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  actions?: { action: string; detail: string }[];
};

type ChatStore = {
  messages: ChatMessage[];
  sending: boolean;
  status: string;
  sendMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
};

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  sending: false,
  status: "",
  sendMessage: async (text: string) => {
    if (!text.trim() || get().sending) return;
    set((state) => ({
      messages: [...state.messages, { role: "user", content: text }],
      sending: true,
      status: "Thinking...",
    }));
    try {
      const res = await request<{ response: string; actions?: { action: string; detail: string }[] }>("/agent/message", {
        method: "POST",
        body: JSON.stringify({ message: text }),
      });
      set((state) => ({
        messages: [...state.messages, { role: "assistant", content: res.response, actions: res.actions }],
        status: "",
      }));
      useGraphStore.getState().load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      set((state) => ({
        messages: [...state.messages, { role: "assistant", content: `Sorry, something went wrong: ${msg}` }],
        status: "",
      }));
    } finally {
      set({ sending: false });
    }
  },
  clearMessages: () => set({ messages: [], status: "" }),
}));
