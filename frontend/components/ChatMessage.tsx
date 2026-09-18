import { ChatMessage as ChatMessageType } from "../lib/store";

interface ChatMessageProps {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[85%] px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words ${
          isUser
            ? "bg-blue-500 text-white rounded-2xl rounded-br-md shadow-sm"
            : "bg-slate-100/80 text-slate-700 rounded-2xl rounded-bl-md"
        }`}
      >
        {message.content}
      </div>
      {message.actions && message.actions.length > 0 && (
        <div className="flex flex-wrap gap-1 px-1">
          {message.actions.map((a, j) => (
            <span
              key={j}
              className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 font-medium border border-violet-100"
            >
              {a.action}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
