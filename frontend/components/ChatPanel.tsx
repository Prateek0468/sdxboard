"use client";

import { useEffect, useRef } from "react";
import { Database, Rocket, ShieldAlert, Sparkles } from "lucide-react";
import { useChatStore } from "../lib/store";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";

const SUGGESTIONS = [
  { icon: Rocket, text: "Design a URL shortener" },
  { icon: Database, text: "Add a cache in front of the database" },
  { icon: ShieldAlert, text: "Review my design for bottlenecks" },
];

export default function ChatPanel() {
  const endRef = useRef<HTMLDivElement>(null);
  const { messages, sending, status, sendMessage } = useChatStore();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const ask = (text: string) => {
    if (!sending) sendMessage(text);
  };

  return (
    <aside className="w-[360px] flex-shrink-0 flex flex-col border-l border-slate-200/80 bg-white/80 backdrop-blur-sm">
      <div className="px-4 py-3.5 border-b border-slate-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shadow-sm shadow-blue-500/20">
          <Sparkles size={16} className="text-white" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-[13px] font-semibold text-slate-800 tracking-tight">AI Assistant</h2>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </div>
          <p className="text-[11px] text-slate-400 truncate">Designs and edits your canvas</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto chat-scroll p-4 flex flex-col gap-3.5">
        {messages.length === 0 && !sending && (
          <div className="flex flex-col items-center justify-center h-full text-center px-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center mb-3 shadow-md shadow-blue-500/20">
              <Sparkles size={20} className="text-white" />
            </div>
            <h3 className="text-[14px] font-semibold text-slate-800 mb-1">Design with AI</h3>
            <p className="text-[12px] text-slate-400 leading-relaxed mb-5">
              Describe a system and I&apos;ll build it on the canvas.
            </p>
            <div className="w-full flex flex-col gap-2">
              {SUGGESTIONS.map(({ icon: Icon, text }) => (
                <button
                  key={text}
                  onClick={() => ask(text)}
                  className="group flex items-center gap-2.5 w-full text-left px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-[12px] text-slate-600 cursor-pointer hover:border-blue-300 hover:bg-blue-50/40 hover:text-slate-800 transition-all"
                >
                  <span className="w-6 h-6 rounded-lg bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center shrink-0 transition-colors">
                    <Icon size={13} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                  </span>
                  {text}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}

        {sending && (
          <div className="flex items-start gap-2 animate-[msg-in_0.25s_ease-out]">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-blue-500/20">
              <Sparkles size={12} className="text-white" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1 px-3.5 py-3 bg-white border border-slate-200 rounded-2xl rounded-bl-md shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-[dot-bounce_1s_ease-in-out_infinite]" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-[dot-bounce_1s_ease-in-out_0.15s_infinite]" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-[dot-bounce_1s_ease-in-out_0.3s_infinite]" />
              </div>
              {status && <span className="text-[11px] text-slate-400 px-1">{status}</span>}
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      <ChatInput />
    </aside>
  );
}
