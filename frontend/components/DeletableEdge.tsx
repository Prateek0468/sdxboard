import {
  BaseEdge,
  EdgeProps,
  getBezierPath,
  useReactFlow,
} from "reactflow";

function ArrowHead({
  x,
  y,
  angle,
}: {
  x: number;
  y: number;
  angle: number;
}) {
  const len = 12;
  const spread = 0.45;
  const x1 = x - len * Math.cos(angle - spread);
  const y1 = y - len * Math.sin(angle - spread);
  const x2 = x - len * Math.cos(angle + spread);
  const y2 = y - len * Math.sin(angle + spread);
  return (
    <path
      d={`M ${x1} ${y1} L ${x} ${y} L ${x2} ${y2}`}
      stroke="#64748b"
      strokeWidth={1.5}
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
  sourcePosition,
  targetPosition,
  label,
}: EdgeProps) {
  const { deleteElements } = useReactFlow();

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.25,
  });

  const angle = Math.atan2(targetY - sourceY, targetX - sourceX);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ edges: [{ id }] });
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: "#94a3b8",
          strokeWidth: 1.5,
          strokeLinecap: "round",
        }}
      />
      <ArrowHead x={targetX} y={targetY} angle={angle} />
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
      <foreignObject
        x={labelX - 10}
        y={labelY - 10}
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
