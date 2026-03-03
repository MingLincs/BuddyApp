"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type AssignmentHelp = {
  assignment_type: string;
  difficulty: string;
  concepts_needed: string[];
  approach: Record<string, string>;
  resources_to_review: Array<{
    type: string;
    name: string;
    why: string;
  }>;
  tips: string[];
  common_mistakes: string[];
  estimated_time: number;
};

export default function AssignmentHelper() {
  const { id } = useParams();
  const router = useRouter();
  const [assignmentText, setAssignmentText] = useState('');
  const [help, setHelp] = useState<AssignmentHelp | null>(null);
  const [loading, setLoading] = useState(false);

  async function getHelp() {
    if (!assignmentText.trim()) return;
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/intelligent/help/assignment`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            class_id: id,
            assignment_text: assignmentText
          })
        }
      );

      const data = await response.json();
      setHelp(data);
    } catch (err) {
      console.error('Assignment help error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="help-container">
        {/* Header */}
        <header className="help-header">
          <h1>🆘 Assignment Helper</h1>
          <p className="subtitle">
            Get intelligent guidance (not answers!) to help you understand and approach your assignment
          </p>
        </header>

        {/* Input Section */}
        <section className="input-section">
          <label htmlFor="assignment">Paste Your Assignment</label>
          <textarea
            id="assignment"
            placeholder="Paste the full assignment description here. I'll analyze it and provide guidance on how to approach it..."
            value={assignmentText}
            onChange={(e) => setAssignmentText(e.target.value)}
            rows={12}
            className="assignment-input"
          />
          
          <div className="input-actions">
            <button 
              onClick={getHelp}
              disabled={loading || !assignmentText.trim()}
              className="analyze-button"
            >
              {loading ? (
                <>
                  <span className="button-spinner"></span>
                  Analyzing...
                </>
              ) : (
                '🔍 Analyze Assignment'
              )}
            </button>
            
            {assignmentText && (
              <button 
                onClick={() => {
                  setAssignmentText('');
                  setHelp(null);
                }}
                className="clear-button"
              >
                Clear
              </button>
            )}
          </div>
        </section>

        {/* Results */}
        {help && (
          <div className="results-container">
            {/* Overview */}
            <section className="result-section overview-section">
              <h2>📊 Assignment Overview</h2>
              <div className="overview-grid">
                <div className="overview-item">
                  <div className="overview-label">Type</div>
                  <div className="overview-value">{help.assignment_type}</div>
                </div>
                <div className="overview-item">
                  <div className="overview-label">Difficulty</div>
                  <div className={`overview-value difficulty-${help.difficulty}`}>
                    {help.difficulty}
                  </div>
                </div>
                <div className="overview-item">
                  <div className="overview-label">Estimated Time</div>
                  <div className="overview-value">{help.estimated_time} minutes</div>
                </div>
              </div>
            </section>

            {/* Concepts Needed */}
            <section className="result-section">
              <h2>📚 Concepts You Need</h2>
              <p className="section-description">
                Make sure you understand these concepts before starting:
              </p>
              <div className="concepts-list">
                {help.concepts_needed.map((concept, i) => (
                  <div key={i} className="concept-chip">
                    {concept}
                  </div>
                ))}
              </div>
            </section>

            {/* Approach */}
            <section className="result-section">
              <h2>🎯 How to Approach This</h2>
              <p className="section-description">
                Follow these steps to solve the assignment:
              </p>
              <div className="approach-steps">
                {Object.entries(help.approach).map(([step, description], i) => (
                  <div key={step} className="approach-step">
                    <div className="step-number">{i + 1}</div>
                    <div className="step-content">
                      <h3>{step.replace('step', 'Step ')}</h3>
                      <p>{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Resources */}
            {help.resources_to_review.length > 0 && (
              <section className="result-section">
                <h2>📖 Review These First</h2>
                <p className="section-description">
                  Before starting, review these concepts:
                </p>
                <div className="resources-list">
                  {help.resources_to_review.map((resource, i) => (
                    <div key={i} className="resource-card">
                      <div className="resource-icon">
                        {resource.type === 'concept' ? '💡' : '📝'}
                      </div>
                      <div className="resource-content">
                        <h4>{resource.name}</h4>
                        <p>{resource.why}</p>
                      </div>
                      <button className="resource-button">Review</button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Tips */}
            <section className="result-section tips-section">
              <h2>💡 Pro Tips</h2>
              <ul className="tips-list">
                {help.tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </section>

            {/* Common Mistakes */}
            <section className="result-section mistakes-section">
              <h2>⚠️ Common Pitfalls</h2>
              <p className="section-description">
                Watch out for these common mistakes:
              </p>
              <ul className="mistakes-list">
                {help.common_mistakes.map((mistake, i) => (
                  <li key={i}>{mistake}</li>
                ))}
              </ul>
            </section>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button 
                onClick={() => router.push(`/class/${id}/concept-map`)}
                className="action-button"
              >
                📍 View Concept Map
              </button>
              <button 
                onClick={() => router.push(`/class/${id}/flashcards`)}
                className="action-button"
              >
                🎴 Review Flashcards
              </button>
              <button 
                onClick={() => router.push(`/class/${id}/dashboard`)}
                className="action-button"
              >
                📚 Back to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Educational Note */}
        <div className="educational-note">
          <div className="note-icon">ℹ️</div>
          <div className="note-content">
            <strong>How This Helps You Learn:</strong>
            <p>
              This tool provides guidance on HOW to approach your assignment, not the answers.
              It helps you understand the concepts and develop problem-solving skills.
              Use it to learn, not to cheat! 📚
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .help-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          padding: 24px;
          max-width: 1000px;
          margin: 0 auto;
        }

        .help-header {
          margin-bottom: 32px;
        }

        .help-header h1 {
          margin: 0 0 12px 0;
          font-size: 32px;
          font-weight: 700;
          color: #0f172a;
        }

        .subtitle {
          margin: 0;
          color: #64748b;
          font-size: 16px;
          line-height: 1.5;
        }

        .input-section {
          background: white;
          border-radius: 20px;
          padding: 32px;
          margin-bottom: 24px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        .input-section label {
          display: block;
          margin-bottom: 12px;
          font-weight: 600;
          color: #0f172a;
          font-size: 16px;
        }

        .assignment-input {
          width: 100%;
          padding: 16px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 15px;
          font-family: inherit;
          line-height: 1.6;
          resize: vertical;
          transition: all 0.2s;
        }

        .assignment-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .input-actions {
          display: flex;
          gap: 12px;
          margin-top: 16px;
        }

        .analyze-button {
          flex: 1;
          padding: 14px 24px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .analyze-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3);
        }

        .analyze-button:disabled {
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

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .clear-button {
          padding: 14px 24px;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }

        .clear-button:hover {
          border-color: #ef4444;
          color: #ef4444;
        }

        .results-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .result-section {
          background: white;
          border-radius: 20px;
          padding: 32px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        .result-section h2 {
          margin: 0 0 16px 0;
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
        }

        .section-description {
          margin: 0 0 20px 0;
          color: #64748b;
          line-height: 1.6;
        }

        .overview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .overview-item {
          padding: 20px;
          background: #f8fafc;
          border-radius: 12px;
          text-align: center;
        }

        .overview-label {
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .overview-value {
          font-size: 20px;
          font-weight: 700;
          color: #0f172a;
          text-transform: capitalize;
        }

        .difficulty-easy {
          color: #10b981;
        }

        .difficulty-medium {
          color: #f59e0b;
        }

        .difficulty-hard {
          color: #ef4444;
        }

        .concepts-list {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .concept-chip {
          padding: 8px 16px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border-radius: 12px;
          font-weight: 600;
          font-size: 14px;
        }

        .approach-steps {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .approach-step {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .step-number {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          flex-shrink: 0;
        }

        .step-content {
          flex: 1;
        }

        .step-content h3 {
          margin: 0 0 8px 0;
          font-size: 16px;
          color: #0f172a;
        }

        .step-content p {
          margin: 0;
          color: #475569;
          line-height: 1.6;
        }

        .resources-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .resource-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: #f8fafc;
          border-radius: 12px;
          border: 2px solid #e2e8f0;
        }

        .resource-icon {
          font-size: 32px;
        }

        .resource-content {
          flex: 1;
        }

        .resource-content h4 {
          margin: 0 0 4px 0;
          font-size: 16px;
          color: #0f172a;
        }

        .resource-content p {
          margin: 0;
          font-size: 14px;
          color: #64748b;
        }

        .resource-button {
          padding: 8px 16px;
          background: white;
          border: 2px solid #3b82f6;
          border-radius: 8px;
          color: #3b82f6;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .resource-button:hover {
          background: #3b82f6;
          color: white;
        }

        .tips-section {
          background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
          border: 2px solid #10b981;
        }

        .tips-list {
          margin: 0;
          padding-left: 24px;
          color: #065f46;
        }

        .tips-list li {
          margin-bottom: 12px;
          line-height: 1.6;
        }

        .mistakes-section {
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
          border: 2px solid #ef4444;
        }

        .mistakes-list {
          margin: 0;
          padding-left: 24px;
          color: #991b1b;
        }

        .mistakes-list li {
          margin-bottom: 12px;
          line-height: 1.6;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .action-button {
          flex: 1;
          min-width: 200px;
          padding: 14px 20px;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-button:hover {
          border-color: #3b82f6;
          color: #3b82f6;
          transform: translateY(-2px);
        }

        .educational-note {
          display: flex;
          gap: 16px;
          padding: 24px;
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          border-radius: 16px;
          border-left: 4px solid #3b82f6;
          margin-top: 24px;
        }

        .note-icon {
          font-size: 32px;
        }

        .note-content strong {
          display: block;
          margin-bottom: 8px;
          color: #1e40af;
          font-size: 16px;
        }

        .note-content p {
          margin: 0;
          color: #1e3a8a;
          line-height: 1.6;
        }

        @media (max-width: 768px) {
          .overview-grid {
            grid-template-columns: 1fr;
          }

          .action-buttons {
            flex-direction: column;
          }

          .action-button {
            min-width: 100%;
          }
        }
      `}</style>
    </>
  );
}
