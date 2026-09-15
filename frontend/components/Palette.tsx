import { componentTypes, ComponentType } from "../lib/store";

export default function Palette() {
  return (
    <aside className="w-[220px] flex-shrink-0 border-r border-slate-300 bg-slate-50 p-5 overflow-y-auto">
      <h1 className="text-lg font-bold mb-2">System Design Canvas</h1>
      <p className="text-slate-500 text-[13px] leading-relaxed mb-5">
        Drag a component onto the canvas.
      </p>
      <div className="grid gap-2">
        {componentTypes.map((item) => (
          <PaletteItem key={item.type} {...item} />
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
      className="flex items-center gap-2.5 p-2.5 border border-slate-300 rounded bg-white cursor-grab text-sm active:cursor-grabbing"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("application/reactflow", type);
        event.dataTransfer.effectAllowed = "move";
      }}
    >
      <span
        className="w-3 h-3 flex-shrink-0 rounded-sm"
        style={{ backgroundColor: color }}
      />
      {label}
    </div>
  );
}
