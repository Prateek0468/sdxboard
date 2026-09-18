"use client";

import { useState, useCallback } from "react";
import { useChatStore } from "../lib/store";

export default function ChatInput() {
  const [input, setInput] = useState("");
  const { sending, sendMessage } = useChatStore();

  const handleSend = useCallback(() => {
    if (!input.trim() || sending) return;
    sendMessage(input);
    setInput("");
  }, [input, sending, sendMessage]);

  return (
    <form
      className="flex gap-2 p-3 border-t border-slate-100 bg-white/80 backdrop-blur-sm"
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
        className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={sending || !input.trim()}
        className="px-4 py-2 rounded-xl bg-blue-500 text-white text-[13px] font-medium cursor-pointer hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow active:scale-95"
      >
        {sending ? "..." : "Send"}
      </button>
    </form>
  );
}
