import { useState, useCallback, useEffect } from "react";
import {
  BaseEdge,
  EdgeProps,
  getStraightPath,
} from "reactflow";
import { useGraphStore } from "../lib/store";

function ArrowHead({
  x,
  y,
  angle,
}: {
  x: number;
  y: number;
  angle: number;
}) {
  const len = 14;
  const spread = 0.45;
  const x1 = x - len * Math.cos(angle - spread);
  const y1 = y - len * Math.sin(angle - spread);
  const x2 = x - len * Math.cos(angle + spread);
  const y2 = y - len * Math.sin(angle + spread);
  return (
    <polygon
      points={`${x1},${y1} ${x},${y} ${x2},${y2}`}
      fill="#1e293b"
    />
  );
}

export default function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  label,
}: EdgeProps) {
  const [selected, setSelected] = useState(false);

  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const angle = Math.atan2(targetY - sourceY, targetX - sourceX);

  const handleDelete = useCallback(() => {
    useGraphStore.getState().removeEdges([id]);
  }, [id]);

  useEffect(() => {
    if (!selected) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const target = e.target as HTMLElement;
        if (target.matches("input, textarea, [contenteditable='true']")) return;
        e.preventDefault();
        handleDelete();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selected, handleDelete]);

  // Deselect when clicking elsewhere
  useEffect(() => {
    if (!selected) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".react-flow__edge")) {
        setSelected(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [selected]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected(true);
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? "#3b82f6" : "#1e293b",
          strokeWidth: 2,
          strokeLinecap: "round",
        }}
      />
      <ArrowHead x={targetX} y={targetY} angle={angle} />
      {/* Invisible hit area on top of everything */}
      <path
        d={edgePath}
        stroke="transparent"
        strokeWidth={20}
        fill="none"
        style={{ cursor: "pointer", pointerEvents: "stroke" }}
        onMouseDown={handleMouseDown}
      />
      {label && (
        <foreignObject
          x={labelX - 50}
          y={labelY - 10}
          width={100}
          height={20}
          requiredExtensions="http://www.w3.org/1999/xhtml"
        >
          <div className="text-[11px] text-slate-600 bg-white px-1.5 py-0.5 rounded shadow-sm border border-slate-100 select-none pointer-events-none text-center whitespace-nowrap">
            {label}
          </div>
        </foreignObject>
      )}
      {selected && (
        <foreignObject
          x={labelX + 40}
          y={labelY - 12}
          width={20}
          height={20}
          requiredExtensions="http://www.w3.org/1999/xhtml"
        >
          <button
            onMouseDown={(e) => { e.stopPropagation(); handleDelete(); }}
            className="w-5 h-5 rounded-full bg-white border border-slate-200 text-slate-400 text-[10px] flex items-center justify-center cursor-pointer hover:bg-red-50 hover:border-red-200 hover:text-red-500 shadow-sm transition-all"
          >
            ✕
          </button>
        </foreignObject>
      )}
    </>
  );
}
