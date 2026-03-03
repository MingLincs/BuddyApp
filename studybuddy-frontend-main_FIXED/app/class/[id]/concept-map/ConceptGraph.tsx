"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

type Node = {
  id: string;
  label: string;
  importance: string;
  difficulty: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
};

// Make edges tolerant of your upgraded backend output
// (label/type/reason, from/to or source/target, optional fields)
export type Edge = {
  from?: string;
  to?: string;
  source?: string;
  target?: string;

  // semantic fields
  type?: string;   // e.g. "example_of", "causes", "supports", etc.
  label?: string;  // display label if you have one
  reason?: string; // explanation

  weight?: number;
  confidence?: number;
  evidence?: string[] | string;
};

type Props = {
  nodes: Node[];
  edges: Edge[];
  selectedId: string | null;
  onNodeClick: (id: string) => void;
};

function edgeSource(e: Edge) {
  return e.from ?? e.source ?? "";
}
function edgeTarget(e: Edge) {
  return e.to ?? e.target ?? "";
}
function edgeLabel(e: Edge) {
  // Prefer a short label; fall back to type; then reason; then "related"
  return (e.label || e.type || e.reason || "related").toString();
}

export default function ConceptGraph({ nodes, edges, selectedId, onNodeClick }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Clear previous content
    svg.selectAll("*").remove();

    // Add container group for zoom
    const g = svg.append("g");

    // Create graph data
    const graphNodes = nodes.map((n) => ({ ...n }));

    // Filter out any malformed edges so D3 doesn't crash
    const cleanedEdges = (edges || [])
      .map((e) => ({
        source: edgeSource(e),
        target: edgeTarget(e),
        label: edgeLabel(e),
        weight: typeof e.weight === "number" ? e.weight : 1,
        confidence: typeof e.confidence === "number" ? e.confidence : undefined,
      }))
      .filter((e) => e.source && e.target);

    // Force simulation
    const simulation = d3
      .forceSimulation(graphNodes as any)
      .force(
        "link",
        d3
          .forceLink(cleanedEdges as any)
          .id((d: any) => d.id)
          .distance(150)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(60));

    // Zoom behavior
    const zoom = d3
      .zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom as any);

    // Draw links
    const link = g
      .append("g")
      .selectAll("line")
      .data(cleanedEdges)
      .join("line")
      .attr("class", "graph-link")
      .attr("stroke", "#cbd5e1")
      .attr("stroke-width", 2)
      .attr("opacity", 0.6);

    // Draw link labels (show on hover)
    const linkLabel = g
      .append("g")
      .selectAll("text")
      .data(cleanedEdges)
      .join("text")
      .attr("class", "link-label")
      .attr("font-size", 10)
      .attr("fill", "#64748b")
      .attr("text-anchor", "middle")
      .attr("pointer-events", "none")
      .attr("opacity", 0)
      .text((d: any) => d.label);

    // Draw nodes
    const node = g
      .append("g")
      .selectAll("g")
      .data(graphNodes)
      .join("g")
      .attr("class", "graph-node")
      .call(
        d3
          .drag<any, any>()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended) as any
      );

    const defs = svg.append("defs");

    const importanceColors: Record<string, [string, string]> = {
      important: ["#ef4444", "#dc2626"],
      core: ["#f59e0b", "#d97706"],
      advanced: ["#3b82f6", "#2563eb"],
    };

    Object.entries(importanceColors).forEach(([key, [color1, color2]]) => {
      const gradient = defs
        .append("linearGradient")
        .attr("id", `gradient-${key}`)
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "100%");

      gradient.append("stop").attr("offset", "0%").attr("stop-color", color1);
      gradient.append("stop").attr("offset", "100%").attr("stop-color", color2);
    });

    // Node circles
    node
      .append("circle")
      .attr("r", 40)
      .attr("fill", (d: any) => `url(#gradient-${d.importance})`)
      .attr("stroke", (d: any) => (d.id === selectedId ? "#1e293b" : "transparent"))
      .attr("stroke-width", 3)
      .style("filter", "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))")
      .style("cursor", "pointer");

    // Node labels
    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", 5)
      .attr("fill", "white")
      .attr("font-weight", 600)
      .attr("font-size", 12)
      .attr("pointer-events", "none")
      .style("user-select", "none")
      .each(function (d: any) {
        const text = d3.select(this);
        const words = (d.label || "").split(" ");

        if (words.length > 2) {
          text.text("");
          text
            .append("tspan")
            .attr("x", 0)
            .attr("dy", -6)
            .text(words.slice(0, 2).join(" "));
          const rest = words.slice(2).join(" ");
          text
            .append("tspan")
            .attr("x", 0)
            .attr("dy", 12)
            .text(rest.substring(0, 15) + (rest.length > 15 ? "..." : ""));
        } else {
          text.text(d.label);
        }
      });

    // Node click handler
    node.on("click", (event, d: any) => {
      event.stopPropagation();
      onNodeClick(d.id);
    });

    // Node hover (show edge labels connected to this node)
    node.on("mouseenter", function (_event, d: any) {
      d3.select(this)
        .select("circle")
        .transition()
        .duration(200)
        .attr("r", 45)
        .style("filter", "drop-shadow(0 8px 16px rgba(0, 0, 0, 0.2))");

      linkLabel
        .filter((l: any) => l.source.id === d.id || l.target.id === d.id)
        .attr("opacity", 1);
    });

    node.on("mouseleave", function () {
      d3.select(this)
        .select("circle")
        .transition()
        .duration(200)
        .attr("r", 40)
        .style("filter", "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))");

      linkLabel.attr("opacity", 0);
    });

    // Tick updates
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      linkLabel
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [nodes, edges, selectedId, onNodeClick]);

  return (
    <div className="graph-container">
      <svg ref={svgRef} className="concept-graph-svg" />

      <div className="graph-controls">
        <div className="control-hint">
          💡 <strong>Tips:</strong> Drag nodes • Scroll to zoom • Hover nodes to see edge labels • Click to explore
        </div>
      </div>

      <style jsx>{`
        .graph-container {
          position: relative;
          width: 100%;
          height: calc(100vh - 140px);
          background: white;
          overflow: hidden;
        }

        .concept-graph-svg {
          width: 100%;
          height: 100%;
        }

        .graph-controls {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          padding: 12px 20px;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .control-hint {
          font-size: 14px;
          color: #475569;
        }
      `}</style>
    </div>
  );
}