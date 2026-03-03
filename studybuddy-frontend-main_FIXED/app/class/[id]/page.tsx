"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type ClassRow = {
  id: string;
  name: string;
  created_at: string;
  subject_area?: string;
  has_syllabus?: boolean;
};

type Doc = {
  id: string;
  title: string;
  created_at: string;
};

export default function EnhancedClassPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [cls, setCls] = useState<ClassRow | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      const [{ data: c }, { data: d }] = await Promise.all([
        supabase
          .from("classes")
          .select("id,name,created_at,subject_area,has_syllabus")
          .eq("id", id)
          .maybeSingle(),

        supabase
          .from("documents")
          .select("id,title,created_at")
          .eq("class_id", id)
          .order("created_at", { ascending: false }),
      ]);

      if (!alive) return;

      setCls((c as ClassRow) || null);
      setDocs((d as Doc[]) || []);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [id, supabase]);

  if (loading) {
    return (
      <div className="class-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading class...</p>
        </div>
      </div>
    );
  }

  if (!cls) {
    return (
      <div className="class-container">
        <div className="error">Class not found</div>
      </div>
    );
  }

  return (
    <>
      <div className="class-container">
        {/* Header */}
        <header className="class-header">
          <div className="header-content">
            <div className="class-info">
              <Link href="/library" className="back-link">
                ← Back to Library
              </Link>
              <h1>{cls.name}</h1>
              {cls.subject_area && (
                <span className="subject-badge">{cls.subject_area}</span>
              )}
            </div>
          </div>
        </header>

        {/* Smart Features Menu */}
        <section className="features-menu">
          <h2 className="section-title">🚀 Smart Study Tools</h2>
          
          <div className="features-grid">
            <Link href={`/class/${id}/dashboard`} className="feature-card">
              <div className="feature-icon">📚</div>
              <h3>Dashboard</h3>
              <p>See what to study today</p>
              {cls.has_syllabus && <span className="feature-badge">Ready!</span>}
            </Link>

            <Link href={`/class/${id}/concept-map`} className="feature-card">
              <div className="feature-icon">🗺️</div>
              <h3>Concept Map</h3>
              <p>Visual knowledge graph</p>
            </Link>

            <Link href={`/class/${id}/flashcards`} className="feature-card">
              <div className="feature-icon">🎴</div>
              <h3>Flashcards</h3>
              <p>Auto-generated cards</p>
            </Link>

            <Link href={`/class/${id}/quiz`} className="feature-card">
              <div className="feature-icon">📝</div>
              <h3>Practice Quiz</h3>
              <p>Test your knowledge</p>
            </Link>

            <Link href={`/class/${id}/help`} className="feature-card">
              <div className="feature-icon">🆘</div>
              <h3>Get Help</h3>
              <p>Assignment guidance</p>
            </Link>

            <Link href="/upload-intelligent" className="feature-card upload-card">
              <div className="feature-icon">📤</div>
              <h3>Upload Document</h3>
              <p>Add materials</p>
            </Link>
          </div>
        </section>

        {/* Syllabus CTA */}
        {!cls.has_syllabus && (
          <section className="syllabus-cta">
            <div className="cta-content">
              <div className="cta-icon">💡</div>
              <div>
                <h3>Get the Most Out of This Class</h3>
                <p>
                  Upload your syllabus and I'll create a personalized study plan for the entire semester!
                  I'll extract deadlines, create a timeline, and tell you what to study each week.
                </p>
                <button
                  onClick={() => router.push('/upload-intelligent')}
                  className="cta-button"
                >
                  Upload Syllabus Now →
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Documents */}
        <section className="documents-section">
          <h2 className="section-title">📄 Uploaded Documents ({docs.length})</h2>
          
          {docs.length === 0 ? (
            <div className="empty-documents">
              <p>No documents yet. Upload your first document to get started!</p>
              <Link href="/upload-intelligent" className="upload-link">
                Upload Document
              </Link>
            </div>
          ) : (
            <div className="documents-list">
              {docs.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/doc/${doc.id}`}
                  className="document-card"
                >
                  <div className="doc-icon">📄</div>
                  <div className="doc-info">
                    <h4>{doc.title}</h4>
                    <p className="doc-date">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="doc-arrow">→</div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Quick Stats */}
        {docs.length > 0 && (
          <section className="stats-section">
            <h2 className="section-title">📊 Quick Stats</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-number">{docs.length}</div>
                <div className="stat-label">Documents</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">
                  {cls.has_syllabus ? '✓' : '—'}
                </div>
                <div className="stat-label">Syllabus</div>
              </div>
            </div>
          </section>
        )}
      </div>

      <style jsx>{`
        .class-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          padding: 24px;
        }

        .loading, .error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          gap: 20px;
        }

        .spinner {
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

        .class-header {
          background: white;
          border-radius: 20px;
          padding: 32px;
          margin-bottom: 24px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          max-width: 1200px;
          margin-left: auto;
          margin-right: auto;
          margin-bottom: 24px;
        }

        .header-content {
          max-width: 1200px;
        }

        .back-link {
          display: inline-block;
          color: #64748b;
          text-decoration: none;
          margin-bottom: 16px;
          transition: color 0.2s;
        }

        .back-link:hover {
          color: #3b82f6;
        }

        .class-info h1 {
          margin: 0 0 12px 0;
          font-size: 32px;
          font-weight: 700;
          color: #0f172a;
        }

        .subject-badge {
          display: inline-block;
          padding: 6px 12px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          text-transform: capitalize;
        }

        section {
          max-width: 1200px;
          margin: 0 auto 24px;
        }

        .section-title {
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 20px;
        }

        .features-menu {
          background: white;
          border-radius: 20px;
          padding: 32px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
        }

        .feature-card {
          position: relative;
          padding: 24px;
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border: 2px solid #e2e8f0;
          border-radius: 16px;
          text-decoration: none;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .feature-card:hover {
          transform: translateY(-4px);
          border-color: #3b82f6;
          box-shadow: 0 8px 16px rgba(59, 130, 246, 0.2);
        }

        .upload-card {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border-color: #3b82f6;
        }

        .feature-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }

        .feature-card h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
          font-weight: 600;
          color: #0f172a;
        }

        .feature-card p {
          margin: 0;
          font-size: 14px;
          color: #64748b;
        }

        .feature-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          padding: 4px 8px;
          background: #10b981;
          color: white;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
        }

        .syllabus-cta {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border-radius: 20px;
          padding: 32px;
          border: 2px solid #f59e0b;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        .cta-content {
          display: flex;
          gap: 20px;
          align-items: flex-start;
        }

        .cta-icon {
          font-size: 48px;
        }

        .cta-content h3 {
          margin: 0 0 12px 0;
          font-size: 20px;
          font-weight: 700;
          color: #78350f;
        }

        .cta-content p {
          margin: 0 0 16px 0;
          color: #78350f;
          line-height: 1.6;
        }

        .cta-button {
          padding: 12px 24px;
          background: #f59e0b;
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cta-button:hover {
          background: #d97706;
          transform: translateY(-2px);
        }

        .documents-section {
          background: white;
          border-radius: 20px;
          padding: 32px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        .empty-documents {
          text-align: center;
          padding: 40px;
          color: #64748b;
        }

        .empty-documents p {
          margin-bottom: 16px;
        }

        .upload-link {
          display: inline-block;
          padding: 12px 24px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          text-decoration: none;
          border-radius: 12px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .upload-link:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3);
        }

        .documents-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .document-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: #f8fafc;
          border-radius: 12px;
          text-decoration: none;
          transition: all 0.2s;
          border: 2px solid transparent;
        }

        .document-card:hover {
          background: #eff6ff;
          border-color: #3b82f6;
          transform: translateX(4px);
        }

        .doc-icon {
          font-size: 32px;
        }

        .doc-info {
          flex: 1;
        }

        .doc-info h4 {
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 600;
          color: #0f172a;
        }

        .doc-date {
          margin: 0;
          font-size: 14px;
          color: #64748b;
        }

        .doc-arrow {
          color: #94a3b8;
          font-size: 20px;
        }

        .stats-section {
          background: white;
          border-radius: 20px;
          padding: 32px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
        }

        .stat-card {
          padding: 24px;
          background: #f8fafc;
          border-radius: 12px;
          text-align: center;
        }

        .stat-number {
          font-size: 36px;
          font-weight: 700;
          color: #3b82f6;
          margin-bottom: 8px;
        }

        .stat-label {
          font-size: 14px;
          color: #64748b;
        }

        @media (max-width: 768px) {
          .features-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .cta-content {
            flex-direction: column;
          }

          .stats-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </>
  );
}
