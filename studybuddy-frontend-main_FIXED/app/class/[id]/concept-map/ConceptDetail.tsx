"use client";

import { useState } from "react";

type Node = {
  id: string;
  label: string;
  importance: string;
  difficulty: string;
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
  has_details: boolean;
};

type ConnectionGroup = {
  outgoing: Array<{
    edge_id: string;
    other_concept_id: string;
    other_label: string;
    label: string;
  }>;
  incoming: Array<{
    edge_id: string;
    other_concept_id: string;
    other_label: string;
    label: string;
  }>;
};

type Props = {
  detail: ConceptDetail;
  selectedNode: Node | null;
  connectedNodes: Node[];
  connections: Record<string, ConnectionGroup>;
  loadingDetail: boolean;
  generating: boolean;
  onClose: () => void;
  onGenerate: () => void;
};

export default function ConceptDetail({
  detail,
  selectedNode,
  connectedNodes,
  connections,
  loadingDetail,
  generating,
  onClose,
  onGenerate
}: Props) {
  const [activeTab, setActiveTab] = useState<'simple' | 'detailed' | 'technical'>('simple');

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <header className="modal-header">
            <button className="back-button" onClick={onClose}>
              ← Back to map
            </button>
            <h1 className="modal-title">{selectedNode?.label || "Concept"}</h1>
            <button className="close-button" onClick={onClose}>✕</button>
          </header>

          {/* Meta Info */}
          <div className="modal-meta">
            {selectedNode && (
              <>
                <span className={`badge badge-${selectedNode.importance}`}>
                  {selectedNode.importance === 'important' ? '⭐ Important' : 
                   selectedNode.importance === 'core' ? '⭐ Core' : 
                   '◆ Advanced'}
                </span>
                <span className="meta-text">•</span>
                <span className="meta-text">{selectedNode.difficulty}</span>
                <span className="meta-text">•</span>
                <span className="meta-text">5 min read</span>
              </>
            )}
          </div>

          {loadingDetail ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading concept details...</p>
            </div>
          ) : (
            <div className="modal-content">
              {/* Generate Button if no details */}
              {!detail.has_details && (
                <div className="generate-notice">
                  <div className="notice-content">
                    <p>💡 This concept doesn't have detailed explanations yet.</p>
                    <button 
                      className="generate-button"
                      onClick={onGenerate}
                      disabled={generating}
                    >
                      {generating ? (
                        <>
                          <span className="button-spinner"></span>
                          Generating...
                        </>
                      ) : (
                        '✨ Generate Definition, Example & Application'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Explanation Tabs */}
              {detail.has_details && (
                <div className="tabs-container">
                  <button 
                    className={`tab ${activeTab === 'simple' ? 'active' : ''}`}
                    onClick={() => setActiveTab('simple')}
                  >
                    Simple
                  </button>
                  <button 
                    className={`tab ${activeTab === 'detailed' ? 'active' : ''}`}
                    onClick={() => setActiveTab('detailed')}
                  >
                    Detailed
                  </button>
                  <button 
                    className={`tab ${activeTab === 'technical' ? 'active' : ''}`}
                    onClick={() => setActiveTab('technical')}
                  >
                    Technical
                  </button>
                </div>
              )}

              {/* Definition Section */}
              <section className="content-section">
                <div className="section-header">
                  <span className="section-icon">📖</span>
                  <h3>Definition</h3>
                </div>
                <div className="section-content">
                  {detail.definition ? (
                    <p>{detail.definition}</p>
                  ) : (
                    <p className="empty-state">No definition available yet</p>
                  )}
                </div>
              </section>

              {/* Example Section */}
              <section className="content-section">
                <div className="section-header">
                  <span className="section-icon">💡</span>
                  <h3>Real-World Example</h3>
                </div>
                <div className="section-content">
                  {detail.example ? (
                    <p>{detail.example}</p>
                  ) : (
                    <p className="empty-state">No example available yet</p>
                  )}
                </div>
              </section>

              {/* Application Section */}
              <section className="content-section">
                <div className="section-header">
                  <span className="section-icon">🎯</span>
                  <h3>Practical Application</h3>
                </div>
                <div className="section-content">
                  {detail.application ? (
                    <p>{detail.application}</p>
                  ) : (
                    <p className="empty-state">No application details available yet</p>
                  )}
                </div>
              </section>

              {/* Connected Concepts */}
              {connectedNodes.length > 0 && (
                <section className="content-section">
                  <div className="section-header">
                    <span className="section-icon">🔗</span>
                    <h3>Connected Concepts</h3>
                  </div>
                  <div className="connections-grid">
                    {connectedNodes.map((node) => (
                      <div key={node.id} className="connection-card">
                        <div className="connection-name">{node.label}</div>
                        <div className={`connection-badge badge-${node.importance}`}>
                          {node.importance}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Relationships by Type */}
              {Object.keys(connections).length > 0 && (
                <section className="content-section">
                  <div className="section-header">
                    <span className="section-icon">↔️</span>
                    <h3>Relationships</h3>
                  </div>
                  {Object.entries(connections).map(([type, group]) => (
                    <div key={type} className="relationship-group">
                      <div className="relationship-type">{type}</div>
                      
                      {group.outgoing.length > 0 && (
                        <div className="relationship-section">
                          <div className="relationship-label">Outgoing</div>
                          <ul className="relationship-list">
                            {group.outgoing.map((c) => (
                              <li key={c.edge_id}>
                                {c.label} → {c.other_label}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {group.incoming.length > 0 && (
                        <div className="relationship-section">
                          <div className="relationship-label">Incoming</div>
                          <ul className="relationship-list">
                            {group.incoming.map((c) => (
                              <li key={c.edge_id}>
                                {c.other_label} → {c.label}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </section>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <footer className="modal-footer">
            <button className="action-button">
              🎴 Create Flashcard
            </button>
            <button className="action-button">
              📝 Take Quiz
            </button>
            <button className="action-button primary">
              ✓ Mark as Mastered
            </button>
          </footer>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease;
          padding: 20px;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-container {
          background: white;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
          max-width: 800px;
          max-height: 90vh;
          overflow-y: auto;
          animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          width: 100%;
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 32px;
          border-bottom: 1px solid #e2e8f0;
        }

        .back-button, .close-button {
          background: none;
          border: none;
          font-size: 16px;
          color: #64748b;
          cursor: pointer;
          padding: 8px;
          transition: color 0.2s;
        }

        .back-button:hover, .close-button:hover {
          color: #0f172a;
        }

        .modal-title {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          color: #0f172a;
        }

        .modal-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 32px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .badge {
          padding: 6px 12px;
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

        .meta-text {
          font-size: 14px;
          color: #64748b;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 32px;
          gap: 16px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .modal-content {
          padding: 32px;
        }

        .generate-notice {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border: 2px solid #3b82f6;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .notice-content p {
          margin: 0 0 16px 0;
          color: #1e40af;
          font-weight: 500;
        }

        .generate-button {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .generate-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3);
        }

        .generate-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .button-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .tabs-container {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          padding: 4px;
          background: #f1f5f9;
          border-radius: 12px;
        }

        .tab {
          flex: 1;
          padding: 12px 24px;
          border: none;
          background: transparent;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          color: #64748b;
        }

        .tab.active {
          background: white;
          color: #3b82f6;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .content-section {
          background: #f8fafc;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 16px;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .section-icon {
          font-size: 24px;
        }

        .section-header h3 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: #0f172a;
        }

        .section-content p {
          margin: 0;
          line-height: 1.6;
          color: #475569;
          white-space: pre-wrap;
        }

        .empty-state {
          color: #94a3b8 !important;
          font-style: italic;
        }

        .connections-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
        }

        .connection-card {
          background: white;
          border-radius: 8px;
          padding: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .connection-name {
          font-weight: 500;
          color: #0f172a;
          font-size: 14px;
        }

        .connection-badge {
          font-size: 10px;
          padding: 4px 8px;
          border-radius: 6px;
        }

        .relationship-group {
          margin-bottom: 16px;
        }

        .relationship-type {
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 8px;
        }

        .relationship-section {
          margin-top: 8px;
        }

        .relationship-label {
          font-size: 12px;
          color: #64748b;
          margin-bottom: 4px;
        }

        .relationship-list {
          margin: 0;
          padding-left: 20px;
          color: #475569;
        }

        .relationship-list li {
          margin-bottom: 4px;
        }

        .modal-footer {
          display: flex;
          gap: 12px;
          padding: 24px 32px;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .action-button {
          flex: 1;
          padding: 12px 20px;
          border: 2px solid #e2e8f0;
          background: white;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          color: #475569;
        }

        .action-button:hover {
          border-color: #3b82f6;
          color: #3b82f6;
          transform: translateY(-2px);
        }

        .action-button.primary {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border-color: transparent;
        }

        .action-button.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(16, 185, 129, 0.3);
        }
      `}</style>
    </>
  );
}