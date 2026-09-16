import { Handle, Position, NodeProps, useReactFlow } from "reactflow";
import ComponentIcon from "./ComponentIcon";
import { ComponentType, useSelectionStore } from "../lib/store";

export interface SystemNodeData {
  label: string;
  type: ComponentType;
  color: string;
}

export default function SystemNode({ id, data }: NodeProps<SystemNodeData>) {
  const { deleteElements } = useReactFlow();
  const selectNode = useSelectionStore((s) => s.selectNode);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  return (
    <div
      className="group relative flex flex-col items-center gap-1 cursor-pointer"
      onClick={(e) => { e.stopPropagation(); selectNode(id); }}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-slate-400" />
      <ComponentIcon type={data.type} size={32} className="text-slate-700" />
      <span className="text-[11px] text-slate-500 whitespace-nowrap">{data.label}</span>
      <button
        onClick={handleDelete}
        className="absolute -top-3 -right-3 w-5 h-5 rounded-full bg-slate-700 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-red-500"
        title="Delete"
      >
        ✕
      </button>
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-slate-400" />
    </div>
  );
}
