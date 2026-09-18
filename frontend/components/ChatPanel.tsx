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
    <aside className="w-[340px] flex-shrink-0 flex flex-col border-l border-slate-200/80 bg-white/80 backdrop-blur-sm">
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <h2 className="text-[13px] font-semibold text-slate-800 tracking-tight">AI Agent</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-slate-400 text-[13px] leading-relaxed">
              Ask me to design a system, e.g.<br />
              <span className="text-slate-500 font-medium">&ldquo;Design a URL shortener&rdquo;</span>
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}
        <div ref={endRef} />
      </div>

      {sending && (
        <div className="flex items-center gap-2.5 px-5 py-2.5 text-[11px] text-slate-500 bg-slate-50/80 border-t border-slate-100">
          <span className="w-3.5 h-3.5 border-[1.5px] border-slate-200 border-t-blue-500 rounded-full animate-[spin_0.7s_linear_infinite]" />
          {status || "Thinking..."}
        </div>
      )}

      <ChatInput />
    </aside>
  );
}
