"use client";

import { useState, useEffect } from "react";
import { useGraphStore } from "../lib/store";

interface MetadataPanelProps {
  nodeId: string | null;
  onClose: () => void;
}

export default function MetadataPanel({ nodeId, onClose }: MetadataPanelProps) {
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
    <div className="absolute bottom-4 left-4 z-20 w-72 bg-white/95 backdrop-blur-md border border-slate-200/60 rounded-xl shadow-xl shadow-slate-900/10">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h3 className="text-[13px] font-semibold text-slate-800">Edit Component</h3>
        <button onClick={onClose} className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer">✕</button>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Metadata (JSON)</label>
          <textarea
            value={metaJson}
            onChange={(e) => setMetaJson(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[12px] font-mono text-slate-600 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 resize-none transition-all"
          />
        </div>
        <button
          onClick={handleSave}
          className="w-full py-2 bg-blue-500 text-white text-[13px] font-medium rounded-lg hover:bg-blue-600 transition-all shadow-sm hover:shadow active:scale-[0.98]"
        >
          Save
        </button>
      </div>
    </div>
  );
}
