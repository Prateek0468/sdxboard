"use client";

import { Handle, Position, NodeProps, useReactFlow } from "reactflow";
import ComponentIcon from "./ComponentIcon";
import { ComponentType, useSelectionStore } from "../lib/store";

export interface SystemNodeData {
  label: string;
  type: ComponentType;
  color: string;
}

const handleStyle = { width: 1, height: 1, minWidth: 0, minHeight: 0, opacity: 0 };

export default function SystemNode({ id, data }: NodeProps<SystemNodeData>) {
  const { deleteElements } = useReactFlow();
  const selectNode = useSelectionStore((s) => s.selectNode);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  return (
    <div
      className="group relative flex flex-col items-center gap-1.5 cursor-pointer px-3 py-2 rounded-xl transition-shadow hover:shadow-md"
      onClick={(e) => { e.stopPropagation(); selectNode(id); }}
    >
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <Handle type="target" position={Position.Left} style={handleStyle} />
      <Handle type="target" position={Position.Bottom} style={handleStyle} />
      <Handle type="target" position={Position.Right} style={handleStyle} />
      <Handle type="source" position={Position.Top} style={handleStyle} />
      <Handle type="source" position={Position.Left} style={handleStyle} />
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
      <Handle type="source" position={Position.Right} style={handleStyle} />
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
        style={{ backgroundColor: `${data.color}15` }}
      >
        <ComponentIcon type={data.type} size={24} style={{ color: data.color }} />
      </div>
      <span className="text-[11px] font-medium text-slate-600 whitespace-nowrap select-none">{data.label}</span>
      <button
        onClick={handleDelete}
        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white border border-slate-200 text-slate-400 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer hover:bg-red-50 hover:border-red-200 hover:text-red-500 shadow-sm"
        title="Delete"
      >
        ✕
      </button>
    </div>
  );
}
