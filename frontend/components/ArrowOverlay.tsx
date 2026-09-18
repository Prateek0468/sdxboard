"use client";

import { useEffect, useRef, useState } from "react";
import { ReactFlowInstance, Viewport } from "reactflow";
import { ArrowData, useArrowStore, useToolStore } from "../lib/store";

interface Props {
  flowRef: React.MutableRefObject<ReactFlowInstance | undefined>;
  viewport: Viewport;
}

type DragTarget = "body" | "start" | "end";
type PointerDrag = { id: string; target: DragTarget; lastPosition: { x: number; y: number } };
const MIN_ARROW_LENGTH = 8;

export default function ArrowOverlay({ flowRef, viewport }: Props) {
  const arrows = useArrowStore((state) => state.arrows);
  const addArrow = useArrowStore((state) => state.addArrow);
  const updateArrow = useArrowStore((state) => state.updateArrow);
  const removeArrow = useArrowStore((state) => state.removeArrow);
  const toolMode = useToolStore((state) => state.mode);
  const setToolMode = useToolStore((state) => state.setMode);
  const [draft, setDraft] = useState<ArrowData | null>(null);
  const [selectedArrow, setSelectedArrow] = useState<string | null>(null);
  const drag = useRef<PointerDrag | null>(null);

  const toFlowPosition = (event: React.PointerEvent<SVGSVGElement>) =>
    flowRef.current?.screenToFlowPosition({ x: event.clientX, y: event.clientY }) ?? {
      x: event.clientX,
      y: event.clientY,
    };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.matches("input, textarea, [contenteditable='true']")) return;
      if ((event.key === "Delete" || event.key === "Backspace") && selectedArrow) {
        event.preventDefault();
        removeArrow(selectedArrow);
        setSelectedArrow(null);
      }
      if (event.key === "Escape") {
        setDraft(null);
        setSelectedArrow(null);
        setToolMode("pointer");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [removeArrow, selectedArrow, setToolMode]);

  const startArrow = (event: React.PointerEvent<SVGSVGElement>) => {
    if (toolMode !== "arrow") return;
    event.preventDefault();
    const position = toFlowPosition(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedArrow(null);
    setDraft({ id: "draft", x1: position.x, y1: position.y, x2: position.x, y2: position.y });
  };

  const movePointer = (event: React.PointerEvent<SVGSVGElement>) => {
    const position = toFlowPosition(event);
    if (draft) {
      setDraft((current) => current && { ...current, x2: position.x, y2: position.y });
      return;
    }
    if (!drag.current) return;

    const { id, target, lastPosition } = drag.current;
    const deltaX = position.x - lastPosition.x;
    const deltaY = position.y - lastPosition.y;
    const arrow = arrows.find((item) => item.id === id);
    if (!arrow) return;
    if (target === "body") {
      updateArrow(id, { x1: arrow.x1 + deltaX, y1: arrow.y1 + deltaY, x2: arrow.x2 + deltaX, y2: arrow.y2 + deltaY });
    } else if (target === "start") {
      updateArrow(id, { x1: position.x, y1: position.y });
    } else {
      updateArrow(id, { x2: position.x, y2: position.y });
    }
    drag.current = { ...drag.current, lastPosition: position };
  };

  const finishPointer = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (draft) {
      const length = Math.hypot(draft.x2 - draft.x1, draft.y2 - draft.y1);
      if (length >= MIN_ARROW_LENGTH) {
        const id = crypto.randomUUID();
        addArrow({ ...draft, id });
      }
      setDraft(null);
      setToolMode("pointer");
    }
    drag.current = null;
  };

  const beginArrowDrag = (event: React.PointerEvent<SVGElement>, arrow: ArrowData, target: DragTarget) => {
    if (toolMode !== "pointer") return;
    event.stopPropagation();
    const svg = event.currentTarget.ownerSVGElement;
    if (svg) svg.setPointerCapture(event.pointerId);
    drag.current = { id: arrow.id, target, lastPosition: toFlowPosition(event as React.PointerEvent<SVGSVGElement>) };
    setSelectedArrow(arrow.id);
  };

  const arrowHead = (arrow: ArrowData) => {
    const angle = Math.atan2(arrow.y2 - arrow.y1, arrow.x2 - arrow.x1);
    const length = 13;
    const spread = 0.45;
    const firstX = arrow.x2 - length * Math.cos(angle - spread);
    const firstY = arrow.y2 - length * Math.sin(angle - spread);
    const secondX = arrow.x2 - length * Math.cos(angle + spread);
    const secondY = arrow.y2 - length * Math.sin(angle + spread);
    return `${firstX},${firstY} ${arrow.x2},${arrow.y2} ${secondX},${secondY}`;
  };

  const renderArrow = (arrow: ArrowData, isDraft = false) => {
    const selected = selectedArrow === arrow.id && !isDraft;
    return <g key={arrow.id}>
      {!isDraft && <line x1={arrow.x1} y1={arrow.y1} x2={arrow.x2} y2={arrow.y2} stroke="transparent" strokeWidth={10}
        pointerEvents="stroke" style={{ cursor: "move" }} onPointerDown={(event) => beginArrowDrag(event, arrow, "body")} />}
      <line x1={arrow.x1} y1={arrow.y1} x2={arrow.x2} y2={arrow.y2} stroke={isDraft ? "#3b82f6" : "#1e293b"} strokeWidth={2}
        strokeLinecap="round" strokeDasharray={isDraft ? "6 3" : undefined} pointerEvents="none" />
      {!isDraft && <polygon points={arrowHead(arrow)} fill="#1e293b" pointerEvents="none" />}
      {selected && <>
        <circle cx={arrow.x1} cy={arrow.y1} r={2.5} fill="white" stroke="#3b82f6" strokeWidth={1.5} pointerEvents="all"
          style={{ cursor: "move" }} onPointerDown={(event) => beginArrowDrag(event, arrow, "start")} />
        <circle cx={arrow.x2} cy={arrow.y2} r={2.5} fill="white" stroke="#3b82f6" strokeWidth={1.5} pointerEvents="all"
          style={{ cursor: "move" }} onPointerDown={(event) => beginArrowDrag(event, arrow, "end")} />
      </>}
    </g>;
  };

  return <svg className="absolute inset-0 h-full w-full" style={{ zIndex: 5, pointerEvents: toolMode === "arrow" ? "auto" : "none", overflow: "hidden" }}
    onPointerDown={startArrow} onPointerMove={movePointer} onPointerUp={finishPointer} onPointerCancel={finishPointer}>
    <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.zoom})`}>
      {arrows.map((arrow) => renderArrow(arrow))}
      {draft && renderArrow(draft, true)}
    </g>
  </svg>;
}
