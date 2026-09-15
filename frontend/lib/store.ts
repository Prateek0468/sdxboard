import { create } from "zustand";
import { Edge, Node, Position, addEdge } from "reactflow";

export const componentTypes = [
  { type: "client", label: "Client", color: "#3b82f6" },
  { type: "dns", label: "DNS", color: "#8b5cf6" },
  { type: "load-balancer", label: "Load Balancer", color: "#ec4899" },
  { type: "api-server", label: "API Server", color: "#f97316" },
  { type: "database", label: "Database", color: "#14b8a6" },
  { type: "cache", label: "Cache", color: "#eab308" },
  { type: "queue", label: "Queue", color: "#ef4444" },
  { type: "cdn", label: "CDN", color: "#06b6d4" },
  { type: "worker", label: "Worker", color: "#6366f1" },
  { type: "object-storage", label: "Object Storage", color: "#22c55e" },
] as const;
export type ComponentType = typeof componentTypes[number]["type"];

const api = process.env.NEXT_PUBLIC_API_URL || "/api";
const typeInfo = (type: string) => componentTypes.find((item) => item.type === type) || componentTypes[0];
const asNode = (component: ApiComponent): Node => ({ id: component.id, position: { x: component.x, y: component.y }, data: { label: component.label }, sourcePosition: Position.Right, targetPosition: Position.Left, style: { background: typeInfo(component.type).color, color: "#fff", border: "1px solid #334155", borderRadius: 3, padding: "10px 14px", minWidth: 110, textAlign: "center" } });
const asEdge = (edge: ApiEdge): Edge => ({ id: edge.id, source: edge.sourceId, target: edge.targetId, label: edge.label || undefined });

type ApiComponent = { id: string; type: string; label: string; x: number; y: number; metadata?: unknown };
type ApiEdge = { id: string; sourceId: string; targetId: string; label?: string };
type GraphStore = {
  nodes: Node[]; edges: Edge[];
  load: () => Promise<void>;
  addComponent: (type: ComponentType, position: { x: number; y: number }) => Promise<void>;
  connect: (sourceId: string, targetId: string) => Promise<void>;
  updatePosition: (id: string, position: { x: number; y: number }) => Promise<void>;
  removeNodes: (ids: string[]) => Promise<void>;
  removeEdges: (ids: string[]) => Promise<void>;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${api}${path}`, { headers: { "Content-Type": "application/json" }, ...options });
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  return response.status === 204 ? undefined as T : response.json();
}

export const useGraphStore = create<GraphStore>((set, get) => ({
  nodes: [], edges: [],
  load: async () => { const graph = await request<{ components: ApiComponent[]; edges: ApiEdge[] }>("/architecture"); set({ nodes: graph.components.map(asNode), edges: graph.edges.map(asEdge) }); },
  addComponent: async (type, position) => { const { label } = typeInfo(type); const component = await request<ApiComponent>("/components", { method: "POST", body: JSON.stringify({ type, label, x: position.x, y: position.y }) }); set((state) => ({ nodes: [...state.nodes, asNode(component)] })); },
  connect: async (sourceId, targetId) => { const edge = await request<ApiEdge>("/edges", { method: "POST", body: JSON.stringify({ sourceId, targetId }) }); set((state) => ({ edges: addEdge(asEdge(edge), state.edges) })); },
  updatePosition: async (id, position) => { const node = get().nodes.find((item) => item.id === id); if (!node) return; set((state) => ({ nodes: state.nodes.map((item) => item.id === id ? { ...item, position } : item) })); await request(`/components/${id}`, { method: "PUT", body: JSON.stringify({ label: String(node.data.label), x: position.x, y: position.y, metadata: null }) }); },
  removeNodes: async (ids) => { set((state) => ({ nodes: state.nodes.filter((node) => !ids.includes(node.id)), edges: state.edges.filter((edge) => !ids.includes(edge.source) && !ids.includes(edge.target)) })); await Promise.all(ids.map((id) => request(`/components/${id}`, { method: "DELETE" }))); },
  removeEdges: async (ids) => { set((state) => ({ edges: state.edges.filter((edge) => !ids.includes(edge.id)) })); await Promise.all(ids.map((id) => request(`/edges/${id}`, { method: "DELETE" }))); },
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
