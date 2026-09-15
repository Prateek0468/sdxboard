"use client";

import { useEffect, useState } from "react";
import { useGraphStore } from "../lib/store";
import Palette from "../components/Palette";
import Canvas from "../components/Canvas";
import ChatPanel from "../components/ChatPanel";

export default function CanvasPage() {
  const [chatOpen, setChatOpen] = useState(true);
  const load = useGraphStore((s) => s.load);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="flex h-screen text-slate-900">
      <Palette />
      <Canvas chatOpen={chatOpen} onToggleChat={() => setChatOpen((p) => !p)} />
      {chatOpen && <ChatPanel />}
    </main>
  );
}
