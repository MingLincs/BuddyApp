"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { API_BASE } from "@/lib/env";

type ClassRow = { id: string; name: string; created_at: string };
type Status = "idle" | "uploading" | "processing" | "done" | "error";

const STAGE_LABELS: Record<string, string> = {
  queued: "Queued…",
  classifying: "Classifying document…",
  extracting_concepts: "Extracting concepts…",
  generating_summary: "Generating summary…",
  building_materials: "Building study materials…",
  finalizing: "Finalising…",
  completed: "Done!",
};

export default function IntelligentUploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classId, setClassId] = useState<string>("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [newClassName, setNewClassName] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [stage, setStage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const canUpload = !!file && !!classId && status !== "uploading" && status !== "processing";

  const loadClasses = useMemo(
    () => async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;
      const { data, error } = await supabase
        .from("classes")
        .select("id,name,created_at")
        .order("created_at", { ascending: false });
      if (!error) {
        const rows = (data || []) as ClassRow[];
        setClasses(rows);
        if (!classId && rows.length) setClassId(rows[0].id);
      }
    },
    [classId]
  );

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  // Clear polling interval on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (pollingRef.current !== null) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const createClass = async () => {
    const name = newClassName.trim();
    if (!name) return;
    setError(null);
    try {
      const { data: s } = await supabase.auth.getSession();
      const token = s.session?.access_token;
      if (!token) throw new Error("Not signed in");

      const res = await fetch(`${API_BASE}/classes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to create class");

      await loadClasses();
      const created = await res.json();
      setClassId(created.id);
      setNewClassName("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create class");
    }
  };

  const handleIntelligentUpload = async () => {
    if (!file || !classId) return;
    setStatus("uploading");
    setStage("uploading");
    setError(null);

    let token: string;
    try {
      const { data: session } = await supabase.auth.getSession();
      token = session.session?.access_token ?? "";
      if (!token) throw new Error("Please sign in first");
    } catch (e: unknown) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Auth error");
      return;
    }

    // POST the file – this returns quickly with document_id
    let documentId: string;
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(`${API_BASE}/intelligent/process-document/${classId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Upload failed");
      }

      const data = await res.json();
      documentId = data.document_id;
    } catch (e: unknown) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Upload failed");
      return;
    }

    // Poll the status endpoint until processing finishes
    setStatus("processing");
    setStage("queued");

    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE}/intelligent/status/${documentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return false;

        const job = await res.json();
        setStage(job.stage ?? "");

        if (job.status === "completed") {
          setStatus("done");
          if (pollingRef.current !== null) clearInterval(pollingRef.current);
          router.push(`/doc/${documentId}`);
          return true;
        }
        if (job.status === "failed") {
          setStatus("error");
          setError(job.error || "Processing failed");
          if (pollingRef.current !== null) clearInterval(pollingRef.current);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    };

    pollingRef.current = setInterval(async () => {
      await poll();
    }, 2000);
  };

  const progressLabel = () => {
    if (status === "uploading") return "Uploading file…";
    if (status === "processing") return STAGE_LABELS[stage] ?? "Processing…";
    return "";
  };

  return (
    <>
      <div className="upload-container">
        <header className="upload-header">
          <h1>🚀 Upload Document</h1>
          <p className="subtitle">
            Upload any document and I'll automatically extract concepts, create flashcards, and generate study materials!
          </p>
        </header>

        <div className="upload-card">
          {/* Class Selection */}
          <section className="form-section">
            <label>Select Class</label>
            <div className="class-selector">
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="class-select"
              >
                <option value="">Choose a class...</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="or-divider">or create new</div>

            <div className="new-class-form">
              <input
                type="text"
                placeholder="New class name..."
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createClass()}
                className="new-class-input"
              />
              <button
                onClick={createClass}
                disabled={!newClassName.trim()}
                className="create-class-button"
              >
                Create
              </button>
            </div>
          </section>

          {/* File Upload */}
          <section className="form-section">
            <label>Choose Document</label>
            <div
              className={`file-dropzone ${file ? "has-file" : ""}`}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              {file ? (
                <div className="file-info">
                  <div className="file-icon">📄</div>
                  <div>
                    <div className="file-name">{file.name}</div>
                    <div className="file-size">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                  <button
                    className="remove-file"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="dropzone-content">
                  <div className="dropzone-icon">📁</div>
                  <div className="dropzone-text">
                    <strong>Click to upload</strong> or drag and drop
                  </div>
                  <div className="dropzone-hint">
                    PDF, up to 50MB
                  </div>
                </div>
              )}
            </div>
            <input
              id="file-input"
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              style={{ display: "none" }}
            />
          </section>

          {/* Info Box */}
          <div className="info-box">
            <div className="info-icon">✨</div>
            <div className="info-content">
              <strong>What happens after upload:</strong>
              <ul>
                <li>AI automatically detects if this is STEM, Humanities, etc.</li>
                <li>Extracts concepts in subject-appropriate way</li>
                <li>Generates flashcards, quizzes, and study guides</li>
                <li>Updates your concept map</li>
                <li>If it's a syllabus, creates your entire semester plan!</li>
              </ul>
            </div>
          </div>

          {/* Upload Button */}
          <button
            onClick={handleIntelligentUpload}
            disabled={!canUpload}
            className="upload-button"
          >
            {status === "uploading" || status === "processing" ? (
              <>
                <span className="button-spinner"></span>
                {progressLabel()}
              </>
            ) : (
              "🚀 Upload & Process"
            )}
          </button>

          {/* Progress stages */}
          {status === "processing" && (
            <div className="progress-stages">
              {[
                { key: "classifying", label: "Classifying document" },
                { key: "extracting_concepts", label: "Extracting concepts" },
                { key: "generating_summary", label: "Generating summary" },
                { key: "building_materials", label: "Building study materials" },
                { key: "finalizing", label: "Finalising" },
              ].map(({ key, label }) => {
                const stageOrder = [
                  "queued", "classifying", "extracting_concepts",
                  "generating_summary", "building_materials", "finalizing", "completed",
                ];
                const currentIdx = stageOrder.indexOf(stage);
                const itemIdx = stageOrder.indexOf(key);
                const isDone = currentIdx > itemIdx;
                const isActive = stage === key;
                return (
                  <div key={key} className={`stage-item ${isDone ? "done" : isActive ? "active" : "pending"}`}>
                    <span className="stage-icon">{isDone ? "✅" : isActive ? "⏳" : "○"}</span>
                    <span className="stage-label">{label}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="error-message">
              <span>❌</span> {error}
            </div>
          )}
        </div>

        {/* Feature Info */}
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🧠</div>
            <h3>Smart Classification</h3>
            <p>Automatically detects STEM, Humanities, Social Science, etc.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🎴</div>
            <h3>Auto Flashcards</h3>
            <p>Generates subject-appropriate flashcards instantly</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📝</div>
            <h3>Practice Quizzes</h3>
            <p>Creates quizzes tailored to your subject</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📅</div>
            <h3>Semester Timeline</h3>
            <p>Upload syllabus → Get complete study plan</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .upload-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          padding: 24px;
          max-width: 800px;
          margin: 0 auto;
        }

        .upload-header {
          margin-bottom: 32px;
        }

        .upload-header h1 {
          margin: 0 0 12px 0;
          font-size: 32px;
          font-weight: 700;
          color: #0f172a;
        }

        .subtitle {
          margin: 0;
          color: #64748b;
          font-size: 16px;
          line-height: 1.6;
        }

        .upload-card {
          background: white;
          border-radius: 20px;
          padding: 32px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          margin-bottom: 24px;
        }

        .form-section {
          margin-bottom: 24px;
        }

        label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #0f172a;
        }

        .class-select {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 15px;
          transition: all 0.2s;
        }

        .class-select:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .or-divider {
          text-align: center;
          color: #94a3b8;
          font-size: 14px;
          margin: 16px 0;
          position: relative;
        }

        .or-divider::before,
        .or-divider::after {
          content: "";
          position: absolute;
          top: 50%;
          width: 40%;
          height: 1px;
          background: #e2e8f0;
        }

        .or-divider::before {
          left: 0;
        }

        .or-divider::after {
          right: 0;
        }

        .new-class-form {
          display: flex;
          gap: 8px;
        }

        .new-class-input {
          flex: 1;
          padding: 12px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 15px;
          transition: all 0.2s;
        }

        .new-class-input:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .create-class-button {
          padding: 12px 20px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .create-class-button:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .create-class-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .file-dropzone {
          border: 3px dashed #e2e8f0;
          border-radius: 16px;
          padding: 40px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .file-dropzone:hover {
          border-color: #3b82f6;
          background: #f8fafc;
        }

        .file-dropzone.has-file {
          border-style: solid;
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .dropzone-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .dropzone-icon {
          font-size: 48px;
        }

        .dropzone-text strong {
          color: #3b82f6;
        }

        .dropzone-hint {
          font-size: 14px;
          color: #94a3b8;
        }

        .file-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .file-icon {
          font-size: 40px;
        }

        .file-name {
          font-weight: 600;
          color: #0f172a;
        }

        .file-size {
          font-size: 14px;
          color: #64748b;
        }

        .remove-file {
          margin-left: auto;
          width: 32px;
          height: 32px;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 50%;
          cursor: pointer;
          color: #64748b;
          transition: all 0.2s;
        }

        .remove-file:hover {
          border-color: #ef4444;
          color: #ef4444;
        }

        .info-box {
          display: flex;
          gap: 16px;
          padding: 20px;
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border-radius: 12px;
          border-left: 4px solid #f59e0b;
          margin-bottom: 24px;
        }

        .info-icon {
          font-size: 32px;
        }

        .info-content strong {
          display: block;
          margin-bottom: 8px;
          color: #78350f;
        }

        .info-content ul {
          margin: 0;
          padding-left: 20px;
          color: #78350f;
        }

        .info-content li {
          margin-bottom: 4px;
        }

        .upload-button {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .upload-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3);
        }

        .upload-button:disabled {
          opacity: 0.5;
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

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .progress-stages {
          margin-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 16px;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .stage-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
        }

        .stage-item.done .stage-label {
          color: #15803d;
          text-decoration: line-through;
        }

        .stage-item.active .stage-label {
          color: #1d4ed8;
          font-weight: 600;
        }

        .stage-item.pending .stage-label {
          color: #94a3b8;
        }

        .stage-icon {
          width: 20px;
          text-align: center;
        }

        .error-message {
          padding: 16px;
          background: #fee2e2;
          border: 2px solid #ef4444;
          border-radius: 12px;
          color: #991b1b;
          margin-top: 16px;
          display: flex;
          gap: 8px;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
        }

        .feature-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        .feature-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }

        .feature-card h3 {
          margin: 0 0 8px 0;
          font-size: 16px;
          color: #0f172a;
        }

        .feature-card p {
          margin: 0;
          font-size: 14px;
          color: #64748b;
        }

        @media (max-width: 768px) {
          .features-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
