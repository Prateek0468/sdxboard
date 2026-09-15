"use client";

import { useEffect, useRef } from "react";
import { useChatStore } from "../lib/store";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";

export default function ChatPanel() {
  const endRef = useRef<HTMLDivElement>(null);
  const { messages, sending, status } = useChatStore();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <aside className="w-[340px] flex-shrink-0 flex flex-col border-l border-slate-300 bg-slate-50">
      <div className="px-4 py-3.5 border-b border-slate-200">
        <h2 className="text-[15px] font-semibold m-0">AI Agent</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <p className="text-slate-400 text-[13px] text-center my-10 leading-relaxed">
            Ask me to design a system architecture, e.g. &ldquo;Design a URL
            shortener&rdquo;
          </p>
        )}
        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}
        <div ref={endRef} />
      </div>

      {sending && (
        <div className="flex items-center gap-2 px-4 py-2 text-xs text-slate-500 bg-slate-100 border-t border-slate-200">
          <span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-blue-500 rounded-full animate-[spin_0.7s_linear_infinite]" />
          {status || "Working..."}
        </div>
      )}

      <ChatInput />
    </aside>
  );
}
