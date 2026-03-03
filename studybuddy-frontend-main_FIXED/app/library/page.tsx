"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type Document = {
  id: string;
  title?: string;
  class_id: string;
  created_at: string;
  className?: string;
};

type GroupedDocs = {
  [className: string]: Document[];
};

export default function LibraryPage() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClass, setFilterClass] = useState<string>("all");
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const { data: docs, error: docsError } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (docsError) throw docsError;

      const { data: classList, error: classError } = await supabase
        .from("classes")
        .select("id, name")
        .order("name");

      if (classError) console.error("Classes error:", classError);

      const classMap = new Map(
        (classList || []).map(c => [c.id, c.name])
      );

      const docsWithClasses = (docs || []).map(doc => ({
        ...doc,
        className: classMap.get(doc.class_id) || "Uncategorized"
      }));

      setDocuments(docsWithClasses);
      setClasses(classList || []);
      setError(null);

    } catch (err: any) {
      console.error("Error loading library:", err);
      setError(err.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }

  const filteredDocuments = documents.filter((doc) => {
    const searchText = doc.title || doc.id || "";
    const matchesSearch = searchText.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = filterClass === "all" || doc.class_id === filterClass;
    return matchesSearch && matchesClass;
  });

  // Group documents by class
  const groupedDocs: GroupedDocs = filteredDocuments.reduce((acc, doc) => {
    const className = doc.className || "Uncategorized";
    if (!acc[className]) {
      acc[className] = [];
    }
    acc[className].push(doc);
    return acc;
  }, {} as GroupedDocs);

  const getDocumentIcon = (title?: string) => {
    if (!title) return "📄";
    const lower = title.toLowerCase();
    if (lower.includes("syllabus")) return "📋";
    if (lower.includes("note")) return "📝";
    if (lower.includes("lecture")) return "🎓";
    if (lower.includes("exam") || lower.includes("test")) return "📝";
    if (lower.includes("assignment")) return "✏️";
    return "📄";
  };

  const getDocumentName = (doc: Document) => {
    return doc.title || `Document ${doc.id.slice(0, 8)}`;
  };

  const getClassColor = (className: string) => {
    const colors = [
      "from-purple-500 to-pink-500",
      "from-blue-500 to-cyan-500",
      "from-green-500 to-teal-500",
      "from-orange-500 to-red-500",
      "from-indigo-500 to-purple-500",
      "from-pink-500 to-rose-500",
    ];
    const index = className.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading library...</p>
        <style jsx>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
          }
          .spinner {
            width: 48px;
            height: 48px;
            border: 4px solid #e2e8f0;
            border-top-color: #667eea;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .loading-container p {
            margin-top: 16px;
            color: #64748b;
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-icon">⚠️</div>
        <h2>Error Loading Library</h2>
        <p>{error}</p>
        <button onClick={loadData} className="retry-button">
          Try Again
        </button>
        <style jsx>{`
          .error-container {
            text-align: center;
            padding: 80px 20px;
          }
          .error-icon {
            font-size: 64px;
            margin-bottom: 20px;
          }
          .error-container h2 {
            font-size: 24px;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 12px;
          }
          .error-container p {
            color: #64748b;
            margin-bottom: 24px;
          }
          .retry-button {
            padding: 12px 24px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="library-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Library</h1>
          <p className="page-subtitle">{documents.length} documents across {Object.keys(groupedDocs).length} classes</p>
        </div>
        <Link href="/upload" className="upload-btn">
          <span>+</span> Upload Document
        </Link>
      </div>

      {/* Controls */}
      <div className="controls-row">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Classes</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name}
            </option>
          ))}
        </select>

        <div className="view-toggle">
          <button
            className={viewMode === "grid" ? "active" : ""}
            onClick={() => setViewMode("grid")}
          >
            ⊞
          </button>
          <button
            className={viewMode === "list" ? "active" : ""}
            onClick={() => setViewMode("list")}
          >
            ☰
          </button>
        </div>
      </div>

      {/* Documents Grouped by Class */}
      {Object.keys(groupedDocs).length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <h2>No documents found</h2>
          <p>
            {searchQuery || filterClass !== "all"
              ? "Try adjusting your search or filter"
              : "Upload your first document to get started"}
          </p>
          {!searchQuery && filterClass === "all" && (
            <Link href="/upload" className="empty-action-btn">
              Upload Your First Document
            </Link>
          )}
        </div>
      ) : (
        <div className="classes-container">
          {Object.entries(groupedDocs).map(([className, docs]) => (
            <div key={className} className="class-section">
              <div className={`class-header bg-gradient-to-r ${getClassColor(className)}`}>
                <div className="class-info">
                  <h2 className="class-name">{className}</h2>
                  <span className="doc-count">{docs.length} document{docs.length !== 1 ? 's' : ''}</span>
                </div>
              </div>

              <div className={`documents-${viewMode}`}>
                {docs.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/doc/${doc.id}`}
                    className="document-card"
                  >
                    <div className="card-header">
                      <div className="document-icon">{getDocumentIcon(doc.title)}</div>
                      <div className="document-meta">
                        <h3 className="document-name">{getDocumentName(doc)}</h3>
                        <span className="document-date">
                          {new Date(doc.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="card-arrow">→</div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .library-page {
          width: 100%;
          max-width: 1400px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
          flex-wrap: wrap;
          gap: 20px;
        }

        .page-title {
          font-size: 36px;
          font-weight: 800;
          color: #1e293b;
          margin-bottom: 8px;
        }

        .page-subtitle {
          font-size: 14px;
          color: #64748b;
        }

        .upload-btn {
          padding: 14px 28px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          text-decoration: none;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .upload-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
        }

        .upload-btn span {
          font-size: 20px;
        }

        .controls-row {
          display: flex;
          gap: 12px;
          margin-bottom: 32px;
          flex-wrap: wrap;
        }

        .search-box {
          flex: 1;
          min-width: 280px;
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 18px;
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: 14px 16px 14px 48px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 16px;
          transition: all 0.2s;
          background: white;
        }

        .search-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }

        .filter-select {
          padding: 14px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 16px;
          background: white;
          cursor: pointer;
          min-width: 180px;
        }

        .view-toggle {
          display: flex;
          gap: 4px;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          padding: 4px;
        }

        .view-toggle button {
          padding: 10px 16px;
          background: none;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 18px;
          transition: all 0.2s;
        }

        .view-toggle button.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .classes-container {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .class-section {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        .class-header {
          padding: 20px 24px;
          color: white;
        }

        .class-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .class-name {
          font-size: 20px;
          font-weight: 700;
          margin: 0;
        }

        .doc-count {
          font-size: 14px;
          opacity: 0.9;
        }

        .documents-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
          padding: 24px;
        }

        .documents-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 24px;
        }

        .document-card {
          background: white;
          border: 2px solid #f1f5f9;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          text-decoration: none;
          color: inherit;
          transition: all 0.2s;
        }

        .document-card:hover {
          border-color: #667eea;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .document-icon {
          font-size: 32px;
          flex-shrink: 0;
        }

        .document-meta {
          flex: 1;
          min-width: 0;
        }

        .document-name {
          font-size: 15px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 4px 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .document-date {
          font-size: 13px;
          color: #94a3b8;
        }

        .card-arrow {
          font-size: 20px;
          color: #cbd5e1;
          margin-left: 12px;
        }

        .empty-state {
          text-align: center;
          padding: 80px 20px;
          background: white;
          border-radius: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        .empty-icon {
          font-size: 80px;
          margin-bottom: 24px;
        }

        .empty-state h2 {
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 12px;
        }

        .empty-state p {
          font-size: 16px;
          color: #64748b;
          margin-bottom: 32px;
        }

        .empty-action-btn {
          display: inline-block;
          padding: 14px 28px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 12px;
          text-decoration: none;
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .page-title {
            font-size: 28px;
          }

          .controls-row {
            flex-direction: column;
          }

          .search-box,
          .filter-select {
            min-width: 100%;
          }

          .documents-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
