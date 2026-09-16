import {
  BaseEdge,
  EdgeProps,
  getBezierPath,
  useReactFlow,
} from "reactflow";

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
  });

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ edges: [{ id }] });
  };

  return (
    <>
      <BaseEdge id={id} path={edgePath} label={label} markerStart="url(#arrow-reverse)" markerEnd="url(#arrow)" />
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
