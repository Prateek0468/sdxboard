"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Connection,
  Controls,
  Edge,
  Node,
  OnConnect,
  ReactFlowInstance,
} from "reactflow";
import { useGraphStore, useHistoryStore, ComponentType } from "../lib/store";
import SystemNode from "./SystemNode";
import DeletableEdge from "./DeletableEdge";

const nodeTypes = { system: SystemNode };
const edgeTypes = { default: DeletableEdge };

interface CanvasProps {
  chatOpen: boolean;
  onToggleChat: () => void;
}

export default function Canvas({ chatOpen, onToggleChat }: CanvasProps) {
  const flowRef = useRef<ReactFlowInstance>();
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [selectedCount, setSelectedCount] = useState(0);
  const {
    nodes,
    edges,
    addComponent,
    connect,
    updatePosition,
    removeNodes,
    removeEdges,
  } = useGraphStore();

  // Undo/redo
  const handleUndo = useCallback(() => {
    const snapshot = useHistoryStore.getState().undo();
    if (snapshot) {
      useGraphStore.setState({ nodes: snapshot.nodes, edges: snapshot.edges });
    }
  }, []);

  const handleRedo = useCallback(() => {
    const snapshot = useHistoryStore.getState().redo();
    if (snapshot) {
      useGraphStore.setState({ nodes: snapshot.nodes, edges: snapshot.edges });
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if (isMod && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      }
      if (isMod && e.key === "y") {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo, handleRedo]);

  // Track selection count
  const onSelectionChange = useCallback(
    ({ nodes: selected }: { nodes: Node[] }) => {
      setSelectedCount(selected.filter((n) => n.selected).length);
    },
    [],
  );

  // Batch delete selected nodes
  const onNodesDelete = useCallback(
    (deleted: Node[]) => removeNodes(deleted.map((node) => node.id)),
    [removeNodes],
  );

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => removeEdges(deleted.map((edge) => edge.id)),
    [removeEdges],
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData(
        "application/reactflow",
      ) as ComponentType;
      if (!type || !flowRef.current) return;
      const position = flowRef.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      addComponent(type, position);
    },
    [addComponent],
  );

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const existing = timers.current.get(node.id);
      if (existing) clearTimeout(existing);
      timers.current.set(
        node.id,
        setTimeout(() => updatePosition(node.id, node.position), 250),
      );
    },
    [updatePosition],
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target)
        connect(connection.source, connection.target);
    },
    [connect],
  );

  const canUndo = useHistoryStore((s) => s.past.length > 0);
  const canRedo = useHistoryStore((s) => s.future.length > 0);

  return (
    <section
      className="min-w-0 flex-1 relative"
      onDrop={onDrop}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: "default", markerEnd: "arrow" }}
        onInit={(instance) => {
          flowRef.current = instance;
        }}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onSelectionChange={onSelectionChange}
        selectionOnDrag
        panOnScroll
        multiSelectionKeyCode="Meta"
        deleteKeyCode="Delete"
        fitView
      >
        <Background gap={20} size={1} />
        <Controls />
        <svg style={{ position: "absolute", width: 0, height: 0 }}>
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 12 12"
              refX="11"
              refY="6"
              markerWidth="8"
              markerHeight="8"
              orient="auto"
            >
              <path d="M 0 1 L 10 6 L 0 11 z" fill="#94a3b8" />
            </marker>
            <marker
              id="arrow-reverse"
              viewBox="0 0 12 12"
              refX="1"
              refY="6"
              markerWidth="8"
              markerHeight="8"
              orient="auto"
            >
              <path d="M 12 1 L 2 6 L 12 11 z" fill="#94a3b8" />
            </marker>
          </defs>
        </svg>
      </ReactFlow>

      {/* Undo / Redo buttons */}
      <div className="absolute top-3 left-3 z-10 flex gap-1">
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          className="w-8 h-8 border border-slate-300 rounded-md bg-white cursor-pointer text-sm flex items-center justify-center shadow-sm hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Undo (Ctrl+Z)"
        >
          ↶
        </button>
        <button
          onClick={handleRedo}
          disabled={!canRedo}
          className="w-8 h-8 border border-slate-300 rounded-md bg-white cursor-pointer text-sm flex items-center justify-center shadow-sm hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Redo (Ctrl+Shift+Z)"
        >
          ↷
        </button>
      </div>

      {/* Selection info bar */}
      {selectedCount > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg shadow-lg flex items-center gap-3">
          <span>{selectedCount} selected</span>
          <button
            onClick={() => {
              const selected = useGraphStore
                .getState()
                .nodes.filter((n) => n.selected);
              if (selected.length) removeNodes(selected.map((n) => n.id));
            }}
            className="text-red-400 hover:text-red-300 underline cursor-pointer"
          >
            Delete
          </button>
          <button
            onClick={() => {
              setSelectedCount(0);
              flowRef.current?.fitView();
            }}
            className="text-slate-300 hover:text-white underline cursor-pointer"
          >
            Deselect
          </button>
        </div>
      )}

      {/* Chat toggle */}
      <button
        className="absolute top-3 right-3 z-10 w-9 h-9 border border-slate-300 rounded-md bg-white cursor-pointer text-base flex items-center justify-center shadow-sm hover:bg-slate-100"
        onClick={onToggleChat}
        title={chatOpen ? "Close chat" : "Open chat"}
      >
        {chatOpen ? "\u2715" : "\uD83D\uDCAC"}
      </button>
    </section>
  );
}
