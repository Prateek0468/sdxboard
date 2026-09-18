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
  Viewport,
} from "reactflow";
import {
  useGraphStore,
  useHistoryStore,
  useToolStore,
  useArrowStore,
  ComponentType,
} from "../lib/store";
import SystemNode from "./SystemNode";
import TextNode from "./TextNode";
import DeletableEdge from "./DeletableEdge";
import ArrowOverlay from "./ArrowOverlay";

const nodeTypes = { system: SystemNode, text: TextNode };
const edgeTypes = { default: DeletableEdge };

interface CanvasProps {
  chatOpen: boolean;
  onToggleChat: () => void;
}

export default function Canvas({ chatOpen, onToggleChat }: CanvasProps) {
  const flowRef = useRef<ReactFlowInstance>();
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [selectedCount, setSelectedCount] = useState(0);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const toolMode = useToolStore((s) => s.mode);
  const setToolMode = useToolStore((s) => s.setMode);
  const textNodes = useGraphStore((s) => s.textNodes);
  const {
    nodes,
    edges,
    addComponent,
    connect,
    updatePosition,
    removeNodes,
    removeEdges,
    addTextNode,
  } = useGraphStore();

  const allNodes = [...nodes, ...textNodes];

  const handleUndo = useCallback(() => {
    const snap = useHistoryStore.getState().undo();
    if (snap) {
      useGraphStore.setState({ nodes: snap.nodes, edges: snap.edges });
    }
  }, []);

  const handleRedo = useCallback(() => {
    const snap = useHistoryStore.getState().redo();
    if (snap) {
      useGraphStore.setState({ nodes: snap.nodes, edges: snap.edges });
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key === "z" && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if (isMod && e.key === "z" && e.shiftKey) { e.preventDefault(); handleRedo(); }
      if (isMod && e.key === "y") { e.preventDefault(); handleRedo(); }
      if (e.key === "v" && !isMod && !e.altKey) setToolMode("pointer");
      if (e.key === "t" && !isMod && !e.altKey) setToolMode("text");
      if (e.key === "a" && !isMod && !e.altKey) setToolMode("arrow");
      if (e.key === "Escape") setToolMode("pointer");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo, handleRedo, setToolMode]);

  const onSelectionChange = useCallback(
    ({ nodes: selected }: { nodes: Node[] }) => {
      setSelectedCount(selected.filter((n) => n.selected).length);
    },
    [],
  );

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
      const type = event.dataTransfer.getData("application/reactflow") as ComponentType;
      if (!type || !flowRef.current) return;
      const position = flowRef.current.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addComponent(type, position);
    },
    [addComponent],
  );

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const existing = timers.current.get(node.id);
      if (existing) clearTimeout(existing);
      timers.current.set(node.id, setTimeout(() => updatePosition(node.id, node.position), 250));
    },
    [updatePosition],
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) connect(connection.source, connection.target);
    },
    [connect],
  );

  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (toolMode !== "text" || !flowRef.current) return;
      const position = flowRef.current.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addTextNode(position);
      setToolMode("pointer");
    },
    [toolMode, addTextNode, setToolMode],
  );

  const canUndo = useHistoryStore((s) => s.past.length > 0);
  const canRedo = useHistoryStore((s) => s.future.length > 0);

  const isArrowMode = toolMode === "arrow";

  return (
    <section
      className="min-w-0 flex-1 relative"
      onDrop={onDrop}
      onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
    >
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg shadow-sm px-1 py-0.5">
        <button onClick={() => setToolMode("pointer")} title="Select (V)"
          className={`w-8 h-8 rounded-md text-sm flex items-center justify-center cursor-pointer transition-colors ${toolMode === "pointer" ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-100"}`}>
          ↖
        </button>
        <button onClick={() => setToolMode("text")} title="Text (T)"
          className={`w-8 h-8 rounded-md text-sm font-medium flex items-center justify-center cursor-pointer transition-colors ${toolMode === "text" ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-100"}`}>
          T
        </button>
        <button onClick={() => setToolMode("arrow")} title="Arrow (A)"
          className={`w-8 h-8 rounded-md text-sm flex items-center justify-center cursor-pointer transition-colors ${toolMode === "arrow" ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-100"}`}>
          →
        </button>
        <div className="w-px h-5 bg-slate-200 mx-1" />
        <button onClick={handleUndo} disabled={!canUndo} title="Undo (Ctrl+Z)"
          className="w-8 h-8 rounded-md text-sm flex items-center justify-center cursor-pointer text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed">
          ↶
        </button>
        <button onClick={handleRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)"
          className="w-8 h-8 rounded-md text-sm flex items-center justify-center cursor-pointer text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed">
          ↷
        </button>
      </div>

      <ReactFlow
        nodes={allNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: "default" }}
        onInit={(instance) => { flowRef.current = instance; }}
        onMove={(_, nextViewport) => setViewport(nextViewport)}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onSelectionChange={onSelectionChange}
        onPaneClick={onPaneClick}
        selectionOnDrag={!isArrowMode}
        panOnScroll={!isArrowMode}
        panOnDrag={!isArrowMode}
        nodesDraggable={!isArrowMode}
        nodesConnectable={!isArrowMode}
        multiSelectionKeyCode="Meta"
        deleteKeyCode="Delete"
        fitView
      >
        <Background gap={20} size={1} />
        <Controls />
      </ReactFlow>

      <ArrowOverlay flowRef={flowRef} viewport={viewport} />

      {selectedCount > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg shadow-lg flex items-center gap-3">
          <span>{selectedCount} selected</span>
          <button onClick={() => { const s = useGraphStore.getState().nodes.filter((n) => n.selected); if (s.length) removeNodes(s.map((n) => n.id)); }}
            className="text-red-400 hover:text-red-300 underline cursor-pointer">Delete</button>
          <button onClick={() => { setSelectedCount(0); flowRef.current?.fitView(); }}
            className="text-slate-300 hover:text-white underline cursor-pointer">Deselect</button>
        </div>
      )}

      <button className="absolute top-3 right-3 z-10 w-9 h-9 border border-slate-300 rounded-md bg-white cursor-pointer text-base flex items-center justify-center shadow-sm hover:bg-slate-100"
        onClick={onToggleChat} title={chatOpen ? "Close chat" : "Open chat"}>
        {chatOpen ? "\u2715" : "\uD83D\uDCAC"}
      </button>
    </section>
  );
}
