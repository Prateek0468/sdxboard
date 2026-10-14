import { AlertTriangle, Eye, Link2, Pencil, Plus, Search, Sparkles, Trash2, User, Zap } from "lucide-react";
import { ChatMessage as ChatMessageType } from "../lib/store";
import Markdown from "./Markdown";

interface ChatMessageProps {
  message: ChatMessageType;
}

type ActionMeta = { icon: typeof Zap; label: string; className: string };

const ACTION_META: Record<string, ActionMeta> = {
  create_component: { icon: Plus, label: "created", className: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  connect_components: { icon: Link2, label: "connected", className: "bg-blue-50 text-blue-600 border-blue-100" },
  update_component: { icon: Pencil, label: "updated", className: "bg-amber-50 text-amber-600 border-amber-100" },
  delete_component: { icon: Trash2, label: "deleted", className: "bg-red-50 text-red-600 border-red-100" },
  delete_by_label: { icon: Trash2, label: "deleted", className: "bg-red-50 text-red-600 border-red-100" },
  inspect_architecture: { icon: Eye, label: "inspected", className: "bg-slate-100 text-slate-500 border-slate-200" },
  find_component: { icon: Search, label: "searched", className: "bg-slate-100 text-slate-500 border-slate-200" },
};
const FALLBACK_META: ActionMeta = { icon: Zap, label: "action", className: "bg-slate-100 text-slate-500 border-slate-200" };

function AssistantAvatar() {
  return (
    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-blue-500/20">
      <Sparkles size={12} className="text-white" />
    </div>
  );
}

function UserAvatar() {
  return (
    <div className="w-6 h-6 rounded-lg bg-slate-200 flex items-center justify-center shrink-0 mt-0.5">
      <User size={12} className="text-slate-500" />
    </div>
  );
}

function ActionSummary({ actions }: { actions: NonNullable<ChatMessageType["actions"]> }) {
  const counts = new Map<string, number>();
  for (const a of actions) counts.set(a.action, (counts.get(a.action) ?? 0) + 1);
  return (
    <div className="flex flex-wrap gap-1 px-0.5">
      {Array.from(counts.entries()).map(([action, count]) => {
        const meta = ACTION_META[action] ?? FALLBACK_META;
        const Icon = meta.icon;
        return (
          <span
            key={action}
            className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${meta.className}`}
          >
            <Icon size={10} />
            {count > 1 ? `${count} ${meta.label}` : meta.label}
          </span>
        );
      })}
    </div>
  );
}

export default function ChatMessage({ message }: ChatMessageProps) {
  if (message.error) {
    return (
      <div className="flex items-start gap-2 animate-[msg-in_0.25s_ease-out]">
        <div className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
          <AlertTriangle size={12} className="text-red-500" />
        </div>
        <div className="min-w-0 max-w-[85%] px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-2xl rounded-bl-md">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-red-400 mb-1">Error</p>
          <p className="text-[12px] font-mono leading-relaxed text-red-700 break-words whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  const isUser = message.role === "user";

  return (
    <div className={`flex items-start gap-2 animate-[msg-in_0.25s_ease-out] ${isUser ? "flex-row-reverse" : ""}`}>
      {isUser ? <UserAvatar /> : <AssistantAvatar />}
      <div className={`flex flex-col gap-1.5 min-w-0 max-w-[85%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`px-3.5 py-2.5 text-[13px] leading-relaxed break-words ${
            isUser
              ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-md shadow-sm shadow-blue-500/20 whitespace-pre-wrap"
              : "bg-white text-slate-700 border border-slate-200 rounded-2xl rounded-bl-md shadow-sm"
          }`}
        >
          {isUser ? message.content : <Markdown text={message.content} />}
        </div>
        {message.actions && message.actions.length > 0 && <ActionSummary actions={message.actions} />}
      </div>
    </div>
  );
}
