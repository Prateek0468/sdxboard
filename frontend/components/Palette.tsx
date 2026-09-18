"use client";

import { componentTypes, ComponentType } from "../lib/store";
import ComponentIcon from "./ComponentIcon";

const categories = [
  { key: "client", label: "Client" },
  { key: "network", label: "Network" },
  { key: "compute", label: "Compute" },
  { key: "storage", label: "Storage" },
  { key: "messaging", label: "Messaging" },
  { key: "edge", label: "Edge" },
  { key: "ops", label: "Operations" },
] as const;

export default function Palette() {
  const grouped = categories
    .map((cat) => ({
      ...cat,
      items: componentTypes.filter((t) => t.category === cat.key),
    }))
    .filter((cat) => cat.items.length > 0);

  return (
    <aside className="w-[220px] flex-shrink-0 border-r border-slate-200/80 bg-slate-50/50 backdrop-blur-sm flex flex-col">
      <div className="p-5 pb-3">
        <h1 className="text-sm font-semibold text-slate-800 mb-0.5 tracking-tight">System Design Canvas</h1>
        <p className="text-slate-400 text-[11px] leading-relaxed">
          Drag components onto the canvas
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {grouped.map((cat) => (
          <div key={cat.key} className="mb-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2 py-1.5">
              {cat.label}
            </div>
            <div className="grid gap-0.5">
              {cat.items.map((item) => (
                <PaletteItem key={item.type} {...item} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function PaletteItem({
  type,
  label,
  color,
}: {
  type: ComponentType;
  label: string;
  color: string;
}) {
  return (
    <div
      className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-grab hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200/80 transition-all duration-150 active:cursor-grabbing group"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("application/reactflow", type);
        event.dataTransfer.effectAllowed = "move";
      }}
    >
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
        style={{ backgroundColor: `${color}12` }}
      >
        <ComponentIcon type={type} size={16} style={{ color }} />
      </div>
      <span className="text-[12px] text-slate-600 font-medium leading-none">{label}</span>
    </div>
  );
}
