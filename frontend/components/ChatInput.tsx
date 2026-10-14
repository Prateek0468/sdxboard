"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { useChatStore } from "../lib/store";

const MAX_HEIGHT = 120;

export default function ChatInput() {
  const [input, setInput] = useState("");
  const { sending, sendMessage } = useChatStore();
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [input, resize]);

  const handleSend = useCallback(() => {
    if (!input.trim() || sending) return;
    sendMessage(input);
    setInput("");
  }, [input, sending, sendMessage]);

  return (
    <form
      className="p-3 border-t border-slate-100 bg-white/80 backdrop-blur-sm"
      onSubmit={(e) => {
        e.preventDefault();
        handleSend();
      }}
    >
      <div className="flex items-end gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-2xl focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
        <textarea
          ref={ref}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Describe your system..."
          disabled={sending}
          className="flex-1 resize-none bg-transparent text-[13px] leading-relaxed text-slate-700 placeholder:text-slate-400 outline-none disabled:opacity-50 py-1.5 max-h-[120px]"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          title="Send (Enter)"
          className="mb-1 w-8 h-8 shrink-0 rounded-full bg-blue-600 text-white flex items-center justify-center cursor-pointer hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm shadow-blue-500/20"
        >
          {sending ? <Loader2 size={15} className="animate-spin" /> : <ArrowUp size={15} />}
        </button>
      </div>
      <p className="mt-1.5 px-1 text-[10px] text-slate-400">Enter to send · Shift+Enter for a new line</p>
    </form>
  );
}
