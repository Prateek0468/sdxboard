"use client";

import { useEffect, useState } from "react";
import { useGraphStore, useSelectionStore } from "../lib/store";
import Palette from "../components/Palette";
import Canvas from "../components/Canvas";
import ChatPanel from "../components/ChatPanel";
import MetadataPanel from "../components/MetadataPanel";

export default function CanvasPage() {
  const [chatOpen, setChatOpen] = useState(true);
  const selectedNodeId = useSelectionStore((s) => s.selectedNodeId);
  const selectNode = useSelectionStore((s) => s.selectNode);
  const load = useGraphStore((s) => s.load);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="flex h-screen text-slate-900">
      <Palette />
      <Canvas chatOpen={chatOpen} onToggleChat={() => setChatOpen((p) => !p)} />
      {chatOpen && <ChatPanel />}
      {selectedNodeId && (
        <MetadataPanel nodeId={selectedNodeId} onClose={() => selectNode(null)} />
      )}
    </main>
  );
}
