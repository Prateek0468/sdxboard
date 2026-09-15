import { ChatMessage as ChatMessageType } from "../lib/store";

interface ChatMessageProps {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex flex-col gap-1 ${
        isUser ? "items-end" : "items-start"
      }`}
    >
      <div
        className={`max-w-[90%] px-3.5 py-2.5 rounded-xl text-[13px] leading-relaxed whitespace-pre-wrap break-words ${
          isUser
            ? "bg-blue-500 text-white rounded-br-sm"
            : "bg-white text-slate-900 border border-slate-200 rounded-bl-sm"
        }`}
      >
        {message.content}
      </div>
      {message.actions && message.actions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {message.actions.map((a, j) => (
            <span
              key={j}
              className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-mono"
            >
              {a.action}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
