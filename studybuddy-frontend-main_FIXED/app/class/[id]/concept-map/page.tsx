"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import ConceptGraph from "./ConceptGraph";
import ConceptDetail from "./ConceptDetail";
import MapHeader from "./MapHeader";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Node = {
  id: string;
  label: string;
  importance: string;
  difficulty: string;
};

type Edge = {
  from: string;
  to: string;

  type?: string;         // coarse: prereq|related|part_of|example_of|causes
  label?: string;        // rich meaning
  reason?: string;       // legacy field (now should carry label or type)
  weight?: number;

  confidence?: number;
  evidence?: string[];
};

type ConceptDetail = {
  id: string;
  class_id: string;
  name: string;
  definition?: string | null;
  example?: string | null;
  application?: string | null;
  importance_score?: number | null;
  difficulty_level?: number | null;
  document_frequency?: number | null;
  has_details: boolean;
};

type ConnectionGroup = {
  outgoing: Array<{
    edge_id: string;
    other_concept_id: string;
    other_label: string;
    label: string;
    weight?: number | null;
    confidence?: number | null;
    has_details: boolean;
  }>;
  incoming: Array<{
    edge_id: string;
    other_concept_id: string;
    other_label: string;
    label: string;
    weight?: number | null;
    confidence?: number | null;
    has_details: boolean;
  }>;
};

export default function ConceptMapPage() {
  const { id } = useParams();
  const classId = id as string;

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConceptDetail | null>(null);
  const [connections, setConnections] = useState<Record<string, ConnectionGroup>>({});
  
  // UI State
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');
  const [filterImportance, setFilterImportance] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [loadingMap, setLoadingMap] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function getToken(): Promise<string | null> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  useEffect(() => {
    async function loadMap() {
      setLoadingMap(true);

      const token = await getToken();
      if (!token) {
        console.error("No session found.");
        setLoadingMap(false);
        return;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/classes/${classId}/concept-map`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        console.error("Failed:", await res.text());
        setLoadingMap(false);
        return;
      }

      const data = await res.json();
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
      setLoadingMap(false);
    }

    if (classId) loadMap();
  }, [classId]);

  async function loadConcept(conceptId: string) {
    setSelectedId(conceptId);
    setLoadingDetail(true);
    setDetail(null);
    setConnections({});

    const token = await getToken();
    if (!token) {
      console.error("No session found.");
      setLoadingDetail(false);
      return;
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/concepts/${conceptId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) {
      console.error("Failed:", await res.text());
      setLoadingDetail(false);
      return;
    }

    const data = await res.json();
    setDetail(data.concept);
    setConnections(data.connections || {});
    setLoadingDetail(false);
  }

  async function generateConceptDetails(conceptId: string) {
    setGenerating(true);
    const token = await getToken();
    if (!token) {
      console.error("No session found.");
      setGenerating(false);
      return;
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/concepts/${conceptId}/generate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ force: false }),
      }
    );

    if (!res.ok) {
      console.error("Generate failed:", await res.text());
      setGenerating(false);
      return;
    }

    await loadConcept(conceptId);
    setGenerating(false);
  }

  const filteredNodes = useMemo(() => {
    let filtered = nodes;
    
    // Filter by importance
    if (filterImportance !== 'all') {
      filtered = filtered.filter(n => n.importance === filterImportance);
    }
    
    // Filter by search
    if (searchTerm) {
      filtered = filtered.filter(n => 
        n.label.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [nodes, filterImportance, searchTerm]);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedId) || null,
    [nodes, selectedId]
  );

  const connectedNodes = useMemo(() => {
    if (!selectedId) return [];
    const setIds = new Set<string>();
    for (const e of edges) {
      if (e.from === selectedId) setIds.add(e.to);
      if (e.to === selectedId) setIds.add(e.from);
    }
    return nodes.filter((n) => setIds.has(n.id));
  }, [nodes, edges, selectedId]);

  const filteredEdges = useMemo(() => {
  const allowedIds = new Set(filteredNodes.map(n => n.id));

  return edges.filter(e =>
    allowedIds.has(e.from) && allowedIds.has(e.to)
  );
}, [edges, filteredNodes]);

  return (
    <div className="concept-map-container">
      <MapHeader
        conceptCount={nodes.length}
        connectionCount={edges.length}
        viewMode={viewMode}
        setViewMode={setViewMode}
        filterImportance={filterImportance}
        setFilterImportance={setFilterImportance}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      {loadingMap ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Building your knowledge graph...</p>
        </div>
      ) : (
        <div className="map-content">
          {viewMode === 'graph' ? (
            <ConceptGraph
              nodes={filteredNodes}
              edges={filteredEdges}
              selectedId={selectedId}
              onNodeClick={loadConcept}
            />
          ) : (
            <div className="list-view">
              {filteredNodes.map((node) => (
                <div
                  key={node.id}
                  onClick={() => loadConcept(node.id)}
                  className={`concept-card ${selectedId === node.id ? 'selected' : ''}`}
                >
                  <h3>{node.label}</h3>
                  <div className="concept-meta">
                    <span className={`badge badge-${node.importance}`}>
                      {node.importance}
                    </span>
                    <span className="difficulty">{node.difficulty}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Expanded Detail Modal */}
      {selectedId && detail && (
        <ConceptDetail
          detail={detail}
          selectedNode={selectedNode}
          connectedNodes={connectedNodes}
          connections={connections}
          loadingDetail={loadingDetail}
          generating={generating}
          onClose={() => setSelectedId(null)}
          onGenerate={() => generateConceptDetails(detail.id)}
        />
      )}

      <style jsx>{`
        .concept-map-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          gap: 20px;
        }

        .loading-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .map-content {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .list-view {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .concept-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          border: 2px solid transparent;
        }

        .concept-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
        }

        .concept-card.selected {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .concept-card h3 {
          margin: 0 0 12px 0;
          font-size: 18px;
          font-weight: 600;
          color: #0f172a;
        }

        .concept-meta {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        .badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .badge-important {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
        }

        .badge-core {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
        }

        .badge-advanced {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
        }

        .difficulty {
          font-size: 12px;
          color: #64748b;
        }
      `}</style>
    </div>
  );
}