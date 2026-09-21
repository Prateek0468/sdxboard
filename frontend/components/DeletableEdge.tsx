import {
  BaseEdge,
  EdgeProps,
  getStraightPath,
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
  const { deleteElements } = useReactFlow();

  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const angle = Math.atan2(targetY - sourceY, targetX - sourceX);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: "#1e293b",
          strokeWidth: 2,
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
    </>
  );
}
