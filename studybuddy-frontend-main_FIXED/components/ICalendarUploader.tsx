"use client";

import { useState } from "react";
import { API_BASE } from "@/lib/env";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

interface ICalendarUploaderProps {
  onUploadSuccess?: () => void;
}

export default function ICalendarUploader({ onUploadSuccess }: ICalendarUploaderProps) {
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

      const res = await fetch(`${API_BASE}/calendar/import`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

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
      alert(error.message || "Failed to import calendar");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="icalendar-uploader">
      <h3 className="uploader-title">📅 Import from Canvas Calendar</h3>
      <p className="uploader-description">
        Download your Canvas calendar (.ics file) and upload it here. 
        We'll automatically match assignments to your classes.
      </p>

      <div className="help-text">
        <strong>How to get your Canvas calendar:</strong>
        <ol>
          <li>Go to Canvas → Calendar</li>
          <li>Click the calendar feed icon</li>
          <li>Copy the URL and download the .ics file</li>
        </ol>
      </div>

      <div className="upload-area">
        <input
          type="file"
          accept=".ics"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          disabled={uploading}
          className="file-input"
          id="ical-file"
        />
        <label htmlFor="ical-file" className="file-label">
          {file ? (
            <>
              <span className="file-icon">📎</span>
              <span className="file-name">{file.name}</span>
            </>
          ) : (
            <>
              <span className="upload-icon">📥</span>
              <span>Choose calendar file (.ics)</span>
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
            Importing assignments...
          </>
        ) : (
          "Import Calendar"
        )}
      </button>

      {result && (
        <div className="result-box">
          <div className="result-header">
            {result.assignments_created > 0 ? "✅" : "⚠️"} Import complete!
          </div>
          <div className="result-content">
            <p>
              <strong>✓ Imported:</strong> {result.assignments_created} assignments
            </p>
            <p>
              <strong>⊘ Skipped:</strong> {result.assignments_skipped} assignments
            </p>
            {result.matched_classes.length > 0 && (
              <div className="matched-classes">
                <strong>Matched classes:</strong>
                <ul>
                  {result.matched_classes.map((className: string, i: number) => (
                    <li key={i}>{className}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.assignments_skipped > 0 && (
              <p className="note">
                Note: Skipped assignments couldn't be matched to existing classes.
              </p>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .icalendar-uploader {
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
          margin-bottom: 16px;
        }

        .help-text {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 20px;
          font-size: 13px;
        }

        .help-text strong {
          display: block;
          margin-bottom: 8px;
          color: #1e293b;
        }

        .help-text ol {
          margin: 0;
          padding-left: 20px;
          color: #475569;
        }

        .help-text li {
          margin: 4px 0;
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

        .matched-classes {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #e2e8f0;
        }

        .matched-classes ul {
          margin: 8px 0 0 0;
          padding-left: 20px;
        }

        .matched-classes li {
          margin: 4px 0;
          color: #475569;
        }

        .note {
          margin-top: 12px;
          font-size: 13px;
          color: #64748b;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
