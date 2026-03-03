"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { API_BASE } from "@/lib/env";

type ClassRow = {
  id: string;
  name: string;
  created_at: string;
  subject_area?: string;
  has_syllabus?: boolean;
};

export default function ClassesPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewClassModal, setShowNewClassModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [classToDelete, setClassToDelete] = useState<ClassRow | null>(null);
  const [newClassName, setNewClassName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadClasses();
  }, []);

  async function loadClasses() {
    setLoading(true);
    const { data } = await supabase
      .from("classes")
      .select("id,name,created_at,subject_area,has_syllabus")
      .order("created_at", { ascending: false });
    
    setClasses((data as ClassRow[]) || []);
    setLoading(false);
  }

  async function createClass() {
    if (!newClassName.trim()) return;
    
    setCreating(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error("Not signed in");

      const res = await fetch(`${API_BASE}/classes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newClassName }),
      });

      if (!res.ok) throw new Error("Failed to create class");

      await loadClasses();
      setNewClassName("");
      setShowNewClassModal(false);
    } catch (error) {
      console.error("Error creating class:", error);
    } finally {
      setCreating(false);
    }
  }

  async function deleteClass() {
    if (!classToDelete) return;

    setDeleting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error("Not signed in");

      const res = await fetch(`${API_BASE}/classes/${classToDelete.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to delete class");

      await loadClasses();
      setShowDeleteModal(false);
      setClassToDelete(null);
    } catch (error) {
      console.error("Error deleting class:", error);
      alert("Failed to delete class. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  function confirmDelete(cls: ClassRow, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setClassToDelete(cls);
    setShowDeleteModal(true);
  }

  const getClassColor = (index: number) => {
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading classes...</p>
        
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

  return (
    <div className="classes-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">My Classes</h1>
          <p className="page-subtitle">Manage and organize your study materials by class</p>
        </div>
        <button
          className="create-class-btn"
          onClick={() => setShowNewClassModal(true)}
        >
          <span>+</span> New Class
        </button>
      </div>

      {/* Classes Grid */}
      {classes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <h2>No classes yet</h2>
          <p>Create your first class to get started organizing your study materials</p>
          <button
            className="empty-action-btn"
            onClick={() => setShowNewClassModal(true)}
          >
            Create Your First Class
          </button>
        </div>
      ) : (
        <div className="classes-grid">
          {classes.map((cls, index) => (
            <div key={cls.id} className="class-card-container">
              <Link
                href={`/class/${cls.id}`}
                className="class-card"
              >
                <div 
                  className="class-card-header"
                  style={{ background: getClassColor(index) }}
                >
                  <div className="class-icon">📖</div>
                  {cls.has_syllabus && (
                    <div className="syllabus-badge">✓ Syllabus</div>
                  )}
                </div>

                <div className="class-card-body">
                  <h3 className="class-name">{cls.name}</h3>
                  {cls.subject_area && (
                    <div className="class-subject">{cls.subject_area}</div>
                  )}
                  <div className="class-meta">
                    Created {new Date(cls.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="class-card-footer">
                  <span className="view-link">View Class →</span>
                </div>
              </Link>

              {/* DELETE BUTTON */}
              <button
                className="delete-btn"
                onClick={(e) => confirmDelete(cls, e)}
                title="Delete class"
                aria-label="Delete class"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* New Class Modal */}
      {showNewClassModal && (
        <div 
          className="modal-overlay"
          onClick={() => setShowNewClassModal(false)}
        >
          <div 
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="modal-title">Create New Class</h2>
            <p className="modal-subtitle">Give your class a name to get started</p>

            <input
              type="text"
              placeholder="e.g. Biology 101"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createClass()}
              className="modal-input"
              autoFocus
            />

            <div className="modal-actions">
              <button
                className="modal-btn modal-btn-secondary"
                onClick={() => setShowNewClassModal(false)}
              >
                Cancel
              </button>
              <button
                className="modal-btn modal-btn-primary"
                onClick={createClass}
                disabled={!newClassName.trim() || creating}
              >
                {creating ? 'Creating...' : 'Create Class'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && classToDelete && (
        <div 
          className="modal-overlay"
          onClick={() => setShowDeleteModal(false)}
        >
          <div 
            className="modal-content delete-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="warning-icon">⚠️</div>
            <h2 className="modal-title">Delete "{classToDelete.name}"?</h2>
            <p className="modal-subtitle">
              This will permanently delete all documents, concept maps, flashcards, 
              and materials for this class. This action cannot be undone.
            </p>

            <div className="modal-actions">
              <button
                className="modal-btn modal-btn-secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                className="modal-btn modal-btn-danger"
                onClick={deleteClass}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Class'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .classes-page {
          max-width: 1400px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
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
          font-size: 16px;
          color: #64748b;
        }

        .create-class-btn {
          padding: 14px 28px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .create-class-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
        }

        .create-class-btn span {
          font-size: 20px;
        }

        .classes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 24px;
        }

        /* Container for card + delete button */
        .class-card-container {
          position: relative;
        }

        .class-card {
          background: white;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          transition: all 0.3s;
          text-decoration: none;
          color: inherit;
          display: flex;
          flex-direction: column;
          position: relative;
        }

        .class-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
        }

        /* DELETE BUTTON - positioned over card */
        .delete-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 36px;
          height: 36px;
          background: rgba(239, 68, 68, 0.95);
          border: none;
          border-radius: 50%;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          opacity: 0;
          z-index: 10;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .class-card-container:hover .delete-btn {
          opacity: 1;
        }

        .delete-btn:hover {
          background: rgba(220, 38, 38, 1);
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
        }

        .class-card-header {
          height: 140px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          color: white;
        }

        .class-icon {
          font-size: 64px;
        }

        .syllabus-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(255, 255, 255, 0.3);
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          backdrop-filter: blur(10px);
        }

        .class-card-body {
          padding: 24px;
          flex: 1;
        }

        .class-name {
          font-size: 20px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 8px;
        }

        .class-subject {
          display: inline-block;
          padding: 4px 12px;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          color: #0369a1;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .class-meta {
          font-size: 14px;
          color: #94a3b8;
        }

        .class-card-footer {
          padding: 16px 24px;
          border-top: 1px solid #f1f5f9;
        }

        .view-link {
          color: #667eea;
          font-weight: 600;
          font-size: 14px;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 80px 20px;
          background: white;
          border-radius: 20px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .empty-icon {
          font-size: 80px;
          margin-bottom: 24px;
        }

        .empty-state h2 {
          font-size: 28px;
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
          padding: 16px 32px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          transition: all 0.2s;
        }

        .empty-action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          backdrop-filter: blur(4px);
        }

        .modal-content {
          background: white;
          border-radius: 20px;
          padding: 32px;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .delete-modal {
          text-align: center;
        }

        .warning-icon {
          font-size: 56px;
          margin-bottom: 16px;
        }

        .modal-title {
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 12px;
        }

        .modal-subtitle {
          font-size: 15px;
          color: #64748b;
          margin-bottom: 24px;
          line-height: 1.6;
        }

        .modal-input {
          width: 100%;
          padding: 14px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 16px;
          margin-bottom: 24px;
          transition: all 0.2s;
        }

        .modal-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }

        .modal-actions {
          display: flex;
          gap: 12px;
        }

        .modal-btn {
          flex: 1;
          padding: 14px 24px;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .modal-btn-secondary {
          background: #f1f5f9;
          color: #475569;
        }

        .modal-btn-secondary:hover {
          background: #e2e8f0;
        }

        .modal-btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .modal-btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
        }

        .modal-btn-danger {
          background: #ef4444;
          color: white;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        .modal-btn-danger:hover:not(:disabled) {
          background: #dc2626;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
        }

        .modal-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .page-title {
            font-size: 28px;
          }

          .classes-grid {
            grid-template-columns: 1fr;
          }

          .page-header {
            flex-direction: column;
            align-items: stretch;
          }

          .create-class-btn {
            justify-content: center;
          }

          /* Show delete button on mobile */
          .delete-btn {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
