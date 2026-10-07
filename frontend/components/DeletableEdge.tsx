import { useState, useCallback, useEffect } from "react";
import {
  BaseEdge,
  EdgeProps,
  Node,
  Position,
  getStraightPath,
  useReactFlow,
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

type Side = "left" | "right" | "top" | "bottom";
type Box = { x: number; y: number; width: number; height: number };
type Anchor = { x: number; y: number; side: Side | null };

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const OUTWARD: Record<Side, { x: number; y: number }> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
};

const sideOf = (position?: Position): Side | null => {
  if (position === Position.Left) return "left";
  if (position === Position.Right) return "right";
  if (position === Position.Top) return "top";
  if (position === Position.Bottom) return "bottom";
  return null;
};

function nodeBox(node: Node | undefined): Box | null {
  if (!node || typeof node.width !== "number" || typeof node.height !== "number") {
    return null;
  }
  const x = node.positionAbsolute?.x ?? node.position.x;
  const y = node.positionAbsolute?.y ?? node.position.y;
  return { x, y, width: node.width, height: node.height };
}

// Anchors the line on the side of the box that faces the other node, so a
// target below the source connects through the top/bottom instead of the
// left/right handle. The landing point is clamped to that side.
function anchorFor(
  node: Node | undefined,
  towardX: number,
  towardY: number,
  fallbackX: number,
  fallbackY: number,
  fallbackSide: Side | null,
): Anchor {
  const box = nodeBox(node);
  if (!box) return { x: fallbackX, y: fallbackY, side: fallbackSide };
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  const dx = towardX - centerX;
  const dy = towardY - centerY;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { x: box.x + box.width, y: clamp(towardY, box.y, box.y + box.height), side: "right" }
      : { x: box.x, y: clamp(towardY, box.y, box.y + box.height), side: "left" };
  }
  return dy >= 0
    ? { x: clamp(towardX, box.x, box.x + box.width), y: box.y + box.height, side: "bottom" }
    : { x: clamp(towardX, box.x, box.x + box.width), y: box.y, side: "top" };
}

function buildPath(from: Anchor, to: Anchor) {
  if (!from.side || !to.side) {
    const [path, labelX, labelY] = getStraightPath({
      sourceX: from.x,
      sourceY: from.y,
      targetX: to.x,
      targetY: to.y,
    });
    return {
      path,
      labelX,
      labelY,
      angle: Math.atan2(to.y - from.y, to.x - from.x),
    };
  }
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const strength = clamp(dist * 0.4, 30, 150);
  const outFrom = OUTWARD[from.side];
  const outTo = OUTWARD[to.side];
  const c1 = { x: from.x + outFrom.x * strength, y: from.y + outFrom.y * strength };
  const c2 = { x: to.x + outTo.x * strength, y: to.y + outTo.y * strength };
  const path = `M ${from.x},${from.y} C ${c1.x},${c1.y} ${c2.x},${c2.y} ${to.x},${to.y}`;
  const labelX = (from.x + 3 * c1.x + 3 * c2.x + to.x) / 8;
  const labelY = (from.y + 3 * c1.y + 3 * c2.y + to.y) / 8;
  const tdx = to.x - c2.x;
  const tdy = to.y - c2.y;
  const angle =
    tdx === 0 && tdy === 0
      ? Math.atan2(to.y - from.y, to.x - from.x)
      : Math.atan2(tdy, tdx);
  return { path, labelX, labelY, angle };
}

export default function DeletableEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  label,
}: EdgeProps) {
  const [selected, setSelected] = useState(false);
  const getNode = useReactFlow().getNode;

  const sourceNode = getNode(source);
  const targetNode = getNode(target);
  const sourceBox = nodeBox(sourceNode);
  const targetBox = nodeBox(targetNode);
  const sourceCenter = sourceBox
    ? { x: sourceBox.x + sourceBox.width / 2, y: sourceBox.y + sourceBox.height / 2 }
    : { x: sourceX, y: sourceY };
  const targetCenter = targetBox
    ? { x: targetBox.x + targetBox.width / 2, y: targetBox.y + targetBox.height / 2 }
    : { x: targetX, y: targetY };

  const from: Anchor =
    source === target
      ? { x: sourceX, y: sourceY, side: null }
      : anchorFor(sourceNode, targetCenter.x, targetCenter.y, sourceX, sourceY, sideOf(sourcePosition));
  const to: Anchor =
    source === target
      ? { x: targetX, y: targetY, side: null }
      : anchorFor(targetNode, sourceCenter.x, sourceCenter.y, targetX, targetY, sideOf(targetPosition));

  const { path, labelX, labelY, angle } = buildPath(from, to);

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
        path={path}
        style={{
          stroke: selected ? "#3b82f6" : "#1e293b",
          strokeWidth: 2,
          strokeLinecap: "round",
        }}
      />
      <ArrowHead x={to.x} y={to.y} angle={angle} />
      {/* Invisible hit area on top of everything */}
      <path
        d={path}
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
            className="w-5 h-5 rounded-full bg-white border border-slate-200 text-[10px] flex items-center justify-center cursor-pointer hover:bg-red-50 hover:border-red-200 hover:text-red-500 shadow-sm transition-all"
          >
            ✕
          </button>
        </foreignObject>
      )}
    </>
  );
}
