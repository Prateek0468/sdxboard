import { componentTypes, ComponentType } from "../lib/store";
import ComponentIcon from "./ComponentIcon";

export default function Palette() {
  return (
    <aside className="w-[220px] flex-shrink-0 border-r border-slate-300 bg-slate-50 p-5 overflow-y-auto">
      <h1 className="text-lg font-bold mb-2">System Design Canvas</h1>
      <p className="text-slate-500 text-[13px] leading-relaxed mb-5">
        Drag a component onto the canvas.
      </p>
      <div className="grid gap-1.5">
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
}: {
  type: ComponentType;
  label: string;
  color: string;
}) {
  return (
    <div
      className="flex items-center gap-3 p-2 border border-transparent rounded-md cursor-grab hover:bg-slate-200/60 hover:border-slate-300 transition-all active:cursor-grabbing"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("application/reactflow", type);
        event.dataTransfer.effectAllowed = "move";
      }}
    >
      <ComponentIcon type={type} size={22} className="text-slate-600 flex-shrink-0" />
      <span className="text-[12px] text-slate-500 leading-none">{label}</span>
    </div>
  );
}
