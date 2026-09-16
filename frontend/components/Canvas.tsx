"use client";

import { useCallback, useRef } from "react";
import ReactFlow, {
  Background,
  Connection,
  Controls,
  Edge,
  Node,
  OnConnect,
  ReactFlowInstance,
} from "reactflow";
import { useGraphStore, ComponentType } from "../lib/store";
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
  const {
    nodes,
    edges,
    addComponent,
    connect,
    updatePosition,
    removeNodes,
    removeEdges,
  } = useGraphStore();

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

  const onNodesDelete = useCallback(
    (deleted: Node[]) => removeNodes(deleted.map((node) => node.id)),
    [removeNodes],
  );

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => removeEdges(deleted.map((edge) => edge.id)),
    [removeEdges],
  );

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
        fitView
        deleteKeyCode="Delete"
      >
        <Background gap={20} size={1} />
        <Controls />
        <svg style={{ position: "absolute", width: 0, height: 0 }}>
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              markerWidth="8"
              markerHeight="8"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
            </marker>
          </defs>
        </svg>
      </ReactFlow>
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
