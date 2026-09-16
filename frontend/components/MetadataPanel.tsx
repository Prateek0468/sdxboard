"use client";

import { useState, useEffect } from "react";
import { useReactFlow } from "reactflow";
import { useGraphStore } from "../lib/store";

interface MetadataPanelProps {
  nodeId: string | null;
  onClose: () => void;
}

export default function MetadataPanel({ nodeId, onClose }: MetadataPanelProps) {
  const { getNode, setNodes } = useGraphStore((s) => ({ getNode: undefined, setNodes: undefined }));
  const node = useGraphStore((s) => s.nodes.find((n) => n.id === nodeId));
  const [label, setLabel] = useState("");
  const [metaJson, setMetaJson] = useState("{}");

  useEffect(() => {
    if (node) {
      setLabel(String(node.data.label));
      setMetaJson(JSON.stringify((node.data as Record<string, unknown>).metadata || {}, null, 2));
    }
  }, [node]);

  if (!node) return null;

  const handleSave = async () => {
    const metadata = JSON.parse(metaJson);
    await fetch(`/api/components/${node.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label,
        x: node.position.x,
        y: node.position.y,
        metadata,
      }),
    });
    useGraphStore.setState((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === node.id
          ? { ...n, data: { ...n.data, label, metadata } }
          : n
      ),
    }));
    onClose();
  };

  return (
    <div className="absolute bottom-4 left-4 z-20 w-72 bg-white border border-slate-200 rounded-lg shadow-lg">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-700">Edit Component</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
      </div>
      <div className="p-3 space-y-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Metadata (JSON)</label>
          <textarea
            value={metaJson}
            onChange={(e) => setMetaJson(e.target.value)}
            rows={4}
            className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs font-mono outline-none focus:border-blue-500 resize-none"
          />
        </div>
        <button
          onClick={handleSave}
          className="w-full py-1.5 bg-blue-500 text-white text-sm font-medium rounded hover:bg-blue-600"
        >
          Save
        </button>
      </div>
    </div>
  );
}
