"use client";

import { useState, useRef, useEffect } from "react";
import { NodeProps } from "reactflow";
import { useGraphStore } from "../lib/store";

export default function TextNode({ id, data, selected }: NodeProps) {
  const [editing, setEditing] = useState(!data.label);
  const [text, setText] = useState(data.label || "");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const save = () => {
    setEditing(false);
    const trimmed = text.trim();
    if (!trimmed) {
      useGraphStore.getState().removeTextNode(id);
    } else {
      useGraphStore.getState().updateTextNode(id, trimmed);
    }
  };

  if (editing) {
    return (
      <div>
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              save();
            }
            if (e.key === "Escape") save();
          }}
          className="min-w-[80px] max-w-[300px] min-h-[28px] bg-white border border-blue-300 rounded px-1.5 py-0.5 text-sm text-slate-700 resize-none outline-none"
          rows={1}
        />
      </div>
    );
  }

  return (
    <div
      onDoubleClick={() => setEditing(true)}
      className={`px-1.5 py-0.5 text-sm text-slate-700 whitespace-pre-wrap break-words max-w-[300px] select-none ${selected ? "ring-2 ring-blue-400 ring-offset-1 rounded" : ""}`}
    >
      {data.label || "Type something..."}
    </div>
  );
}
