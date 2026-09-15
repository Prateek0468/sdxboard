"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactFlow, {
  addEdge,
  Background,
  Connection,
  Controls,
  Edge,
  Node,
  OnConnect,
  ReactFlowInstance,
} from "reactflow";
import {
  useGraphStore,
  useChatStore,
  componentTypes,
  ComponentType,
} from "../lib/store";

export default function CanvasPage() {
  const wrapper = useRef<HTMLDivElement>(null);
  const flow = useRef<ReactFlowInstance>();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [chatOpen, setChatOpen] = useState(true);
  const [input, setInput] = useState("");
  const {
    nodes,
    edges,
    load,
    addComponent,
    connect,
    updatePosition,
    removeNodes,
    removeEdges,
  } = useGraphStore();
  const { messages, sending, status, sendMessage } = useChatStore();
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => timers.current.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(() => {
    if (!input.trim() || sending) return;
    sendMessage(input);
    setInput("");
  }, [input, sending, sendMessage]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow") as ComponentType;
      if (!type || !flow.current) return;
      const position = flow.current.screenToFlowPosition({
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
    <main className="app-shell">
      <aside className="palette">
        <h1>System Design Canvas</h1>
        <p>Drag a component onto the canvas.</p>
        <div className="palette-list">
          {componentTypes.map((item) => (
            <div
              key={item.type}
              className="palette-item"
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData("application/reactflow", item.type);
                event.dataTransfer.effectAllowed = "move";
              }}
            >
              <span style={{ backgroundColor: item.color }} />
              {item.label}
            </div>
          ))}
        </div>
      </aside>
      <section
        className="canvas"
        ref={wrapper}
        onDrop={onDrop}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onInit={(instance) => {
            flow.current = instance;
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
        </ReactFlow>
        <button
          className="chat-toggle"
          onClick={() => setChatOpen((prev) => !prev)}
          title={chatOpen ? "Close chat" : "Open chat"}
        >
          {chatOpen ? "\u2715" : "\uD83D\uDCAC"}
        </button>
      </section>
      {chatOpen && (
        <aside className="chat-panel">
          <div className="chat-header">
            <h2>AI Agent</h2>
          </div>
          <div className="chat-messages">
            {messages.length === 0 && (
              <p className="chat-empty">
                Ask me to design a system architecture, e.g. &ldquo;Design a URL
                shortener&rdquo;
              </p>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`chat-message chat-${msg.role}`}>
                <div className="chat-bubble">{msg.content}</div>
                {msg.actions && msg.actions.length > 0 && (
                  <div className="chat-actions">
                    {msg.actions.map((a, j) => (
                      <span key={j} className="chat-action-tag">
                        {a.action}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          {sending && (
            <div className="chat-status">
              <span className="chat-spinner" />
              {status || "Working..."}
            </div>
          )}
          <form
            className="chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your system..."
              disabled={sending}
            />
            <button type="submit" disabled={sending || !input.trim()}>
              {sending ? "..." : "Send"}
            </button>
          </form>
        </aside>
      )}
    </main>
  );
}
