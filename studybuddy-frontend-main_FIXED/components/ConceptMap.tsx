"use client";

import { useRef } from "react";
import ForceGraph2D from "react-force-graph-2d";

type Node = {
  id: string;
  name: string;
  importance?: "core" | "important" | "advanced";
};

type Link = {
  source: string;
  target: string;
  type?: string;
};

type Props = {
  nodes: Node[];
  links: Link[];
  onNodeClick?: (node: Node) => void;
  onLinkClick?: (link: Link) => void;
};

export default function ConceptMap({
  nodes,
  links,
  onNodeClick,
  onLinkClick,
}: Props) {
  const fgRef = useRef<any>(null);

  const getNodeColor = (node: Node) => {
    switch (node.importance) {
      case "core":
        return "#ef4444"; // red
      case "important":
        return "#f59e0b"; // amber
      case "advanced":
        return "#3b82f6"; // blue
      default:
        return "#64748b"; // slate
    }
  };

  return (
    <div className="w-full h-[75vh] bg-white rounded-2xl shadow-lg">
      <ForceGraph2D
        ref={fgRef}
        graphData={{ nodes, links }}
        nodeAutoColorBy="importance"
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={1}
        linkCurvature={0.15}
        onNodeClick={(node: any) => onNodeClick?.(node)}
        onLinkClick={(link: any) => onLinkClick?.(link)}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const label = node.name;
          const fontSize = 14 / globalScale;
          ctx.font = `${fontSize}px Inter, sans-serif`;

          const textWidth = ctx.measureText(label).width;
          const padding = 8;
          const boxWidth = textWidth + padding * 2;
          const boxHeight = fontSize + padding * 2;

          ctx.fillStyle = getNodeColor(node);
          ctx.beginPath();
          ctx.roundRect(
            node.x - boxWidth / 2,
            node.y - boxHeight / 2,
            boxWidth,
            boxHeight,
            12
          );
          ctx.fill();

          ctx.fillStyle = "white";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(label, node.x, node.y);
        }}
      />
    </div>
  );
}