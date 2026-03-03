"use client";

import { useState } from "react";
import { API_BASE } from "@/lib/env";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

interface SyllabusUploaderProps {
  classId: string;
  onUploadSuccess?: () => void;
}

export default function SyllabusUploader({ classId, onUploadSuccess }: SyllabusUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);

  async function handleUpload() {
    if (!file) return;

    setUploading(true);
    setResult(null);

    try {
      const supabase = getSupabaseBrowser();
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      if (!token) throw new Error("Not signed in");

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `${API_BASE}/syllabus/upload?class_id=${classId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Upload failed");
      }

      const data = await res.json();
      setResult(data);
      setFile(null);

      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      alert(error.message || "Failed to upload syllabus");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="syllabus-uploader">
      <h3 className="uploader-title">📄 Upload Syllabus</h3>
      <p className="uploader-description">
        Upload your course syllabus PDF and we'll automatically extract assignments,
        due dates, and course information.
      </p>

      <div className="upload-area">
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          disabled={uploading}
          className="file-input"
          id="syllabus-file"
        />
        <label htmlFor="syllabus-file" className="file-label">
          {file ? (
            <>
              <span className="file-icon">📎</span>
              <span className="file-name">{file.name}</span>
            </>
          ) : (
            <>
              <span className="upload-icon">📤</span>
              <span>Choose syllabus PDF</span>
            </>
          )}
        </label>
      </div>

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="upload-btn"
      >
        {uploading ? (
          <>
            <span className="spinner"></span>
            Parsing syllabus...
          </>
        ) : (
          "Upload & Parse"
        )}
      </button>

      {result && (
        <div className="result-box">
          <div className="result-header">✅ Syllabus parsed successfully!</div>
          <div className="result-content">
            <p><strong>Class:</strong> {result.parsed_data?.class_name}</p>
            {result.parsed_data?.subject_area && (
              <p><strong>Subject:</strong> {result.parsed_data.subject_area}</p>
            )}
            {result.parsed_data?.instructor && (
              <p><strong>Instructor:</strong> {result.parsed_data.instructor}</p>
            )}
            <p><strong>Assignments extracted:</strong> {result.assignments_created}</p>
          </div>
        </div>
      )}

      <style jsx>{`
        .syllabus-uploader {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          margin-bottom: 24px;
        }

        .uploader-title {
          font-size: 20px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 8px;
        }

        .uploader-description {
          font-size: 14px;
          color: #64748b;
          margin-bottom: 20px;
        }

        .upload-area {
          margin-bottom: 16px;
        }

        .file-input {
          display: none;
        }

        .file-label {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 20px;
          border: 2px dashed #cbd5e1;
          border-radius: 12px;
          background: #f8fafc;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 16px;
          color: #475569;
        }

        .file-label:hover {
          border-color: #667eea;
          background: #f0f4ff;
        }

        .upload-icon {
          font-size: 24px;
        }

        .file-icon {
          font-size: 20px;
        }

        .file-name {
          font-weight: 500;
          color: #1e293b;
        }

        .upload-btn {
          width: 100%;
          padding: 14px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .upload-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
        }

        .upload-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .result-box {
          margin-top: 20px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 12px;
          overflow: hidden;
        }

        .result-header {
          padding: 12px 16px;
          background: #dcfce7;
          font-weight: 600;
          color: #166534;
        }

        .result-content {
          padding: 16px;
        }

        .result-content p {
          margin: 8px 0;
          font-size: 14px;
          color: #1e293b;
        }

        .result-content strong {
          color: #0f172a;
        }
      `}</style>
    </div>
  );
}
