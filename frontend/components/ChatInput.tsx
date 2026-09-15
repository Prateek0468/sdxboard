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
      className="flex gap-2 p-3 border-t border-slate-200 bg-white"
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
        className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-[13px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={sending || !input.trim()}
        className="px-4 py-2 border-none rounded-md bg-blue-500 text-white text-[13px] font-medium cursor-pointer hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {sending ? "..." : "Send"}
      </button>
    </form>
  );
}
