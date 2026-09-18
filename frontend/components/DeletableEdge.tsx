import {
  BaseEdge,
  EdgeProps,
  useReactFlow,
} from "reactflow";

function wobble(x1: number, y1: number, x2: number, y2: number): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const segments = Math.max(3, Math.floor(len / 30));

  let d = `M ${x1} ${y1}`;
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const mx = x1 + dx * t;
    const my = y1 + dy * t;
    const ox = (Math.sin(t * 12 + x1 * 0.1) * 1.2 + Math.cos(t * 7 + y1 * 0.1) * 0.8);
    const oy = (Math.cos(t * 10 + x1 * 0.1) * 1.0 + Math.sin(t * 9 + y1 * 0.1) * 0.6);
    d += ` L ${mx + ox} ${my + oy}`;
  }
  return d;
}

function HandArrow({
  x,
  y,
  angle,
}: {
  x: number;
  y: number;
  angle: number;
}) {
  const len = 16;
  const spread = 0.5;
  const x1 = x - len * Math.cos(angle - spread);
  const y1 = y - len * Math.sin(angle - spread);
  const x2 = x - len * Math.cos(angle + spread);
  const y2 = y - len * Math.sin(angle + spread);
  return (
    <path
      d={`M ${x1} ${y1} L ${x} ${y} L ${x2} ${y2}`}
      stroke="#1e293b"
      strokeWidth={2}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
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
  const { deleteElements } = useReactFlow();

  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;
  const angle = Math.atan2(targetY - sourceY, targetX - sourceX);

  const edgePath = wobble(sourceX, sourceY, targetX, targetY);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ edges: [{ id }] });
  };

  return (
    <>
      <path
        d={edgePath}
        stroke="#1e293b"
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <HandArrow x={targetX} y={targetY} angle={angle} />
      {label && (
        <foreignObject
          x={midX - 50}
          y={midY - 10}
          width={100}
          height={20}
          requiredExtensions="http://www.w3.org/1999/xhtml"
        >
          <div className="text-[11px] text-slate-600 bg-white px-1.5 py-0.5 rounded shadow-sm border border-slate-100 select-none pointer-events-none text-center whitespace-nowrap">
            {label}
          </div>
        </foreignObject>
      )}
      <foreignObject
        x={midX - 10}
        y={midY - 10}
        width={20}
        height={20}
        className="edge-delete-btn"
        requiredExtensions="http://www.w3.org/1999/xhtml"
      >
        <button
          onClick={handleDelete}
          title="Delete edge"
          className="w-5 h-5 rounded-full bg-slate-700 text-white text-[10px] flex items-center justify-center opacity-0 hover:opacity-100 hover:bg-red-500 transition-all cursor-pointer"
        >
          ✕
        </button>
      </foreignObject>
    </>
  );
}
