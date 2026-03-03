"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type TodayPlan = {
  class_name: string;
  current_week: number;
  week_title: string;
  today_focus: string[];
  estimated_time: number;
  why_important: string;
  upcoming_assessments: Array<{
    name: string;
    type: string;
    week: number;
    weight: number;
  }>;
  your_progress: {
    concepts_mastered: number;
    this_week_topics: string[];
  };
  study_methods: string[];
};

export default function SmartDashboard() {
  const { id } = useParams();
  const router = useRouter();
  const [todayPlan, setTodayPlan] = useState<TodayPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTodayPlan();
  }, [id]);

  async function loadTodayPlan() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/intelligent/dashboard/${id}/today`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load dashboard');
      }

      const data = await response.json();
      
      if (data.message && data.message.includes('Upload your syllabus')) {
        setError('no_syllabus');
      } else {
        setTodayPlan(data);
      }
    } catch (err) {
      console.error('Dashboard error:', err);
      setError('error');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading your study plan...</p>
        </div>
      </div>
    );
  }

  if (error === 'no_syllabus') {
    return (
      <div className="dashboard-container">
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <h2>Upload Your Syllabus to Get Started</h2>
          <p>Upload your course syllabus and I'll create a personalized study plan for the entire semester!</p>
          <button 
            className="primary-button"
            onClick={() => router.push(`/class/${id}`)}
          >
            Upload Syllabus
          </button>
        </div>
      </div>
    );
  }

  if (error || !todayPlan) {
    return (
      <div className="dashboard-container">
        <div className="error-state">
          <p>Could not load dashboard. Please try again.</p>
          <button onClick={loadTodayPlan}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="dashboard-container">
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-greeting">
            <h1>📚 Today's Study Plan</h1>
            <p className="subtitle">{todayPlan.class_name}</p>
          </div>
          <div className="header-meta">
            <span className="week-badge">Week {todayPlan.current_week}</span>
            <span className="time-badge">⏱ {todayPlan.estimated_time}h today</span>
          </div>
        </header>

        {/* Week Title */}
        <div className="week-focus">
          <h2>{todayPlan.week_title}</h2>
          {todayPlan.your_progress.this_week_topics.length > 0 && (
            <div className="topics-chips">
              {todayPlan.your_progress.this_week_topics.map((topic, i) => (
                <span key={i} className="topic-chip">{topic}</span>
              ))}
            </div>
          )}
        </div>

        {/* Today's Tasks */}
        <section className="today-section">
          <h3>🎯 Focus on Today</h3>
          <div className="tasks-list">
            {todayPlan.today_focus.map((task, i) => (
              <div key={i} className="task-card">
                <div className="task-number">{i + 1}</div>
                <div className="task-content">
                  <p>{task}</p>
                </div>
                <button className="task-action">Start</button>
              </div>
            ))}
          </div>
        </section>

        {/* Why Important */}
        {todayPlan.why_important && (
          <section className="insight-section">
            <div className="insight-icon">💡</div>
            <div>
              <h4>Why This Matters</h4>
              <p>{todayPlan.why_important}</p>
            </div>
          </section>
        )}

        {/* Progress */}
        <section className="progress-section">
          <h3>📈 Your Progress</h3>
          <div className="progress-card">
            <div className="progress-stat">
              <div className="stat-number">{todayPlan.your_progress.concepts_mastered}</div>
              <div className="stat-label">Concepts Mastered</div>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${(todayPlan.your_progress.concepts_mastered / 50) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </section>

        {/* Upcoming Assessments */}
        {todayPlan.upcoming_assessments.length > 0 && (
          <section className="assessments-section">
            <h3>⚠️ Coming Up</h3>
            <div className="assessments-list">
              {todayPlan.upcoming_assessments.map((assessment, i) => (
                <div key={i} className="assessment-card">
                  <div className="assessment-type">{assessment.type}</div>
                  <div className="assessment-info">
                    <h4>{assessment.name}</h4>
                    <p>Week {assessment.week} • {assessment.weight}% of grade</p>
                  </div>
                  <button className="prep-button">Prepare</button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Study Materials */}
        <section className="materials-section">
          <h3>📖 Study Materials</h3>
          <div className="materials-grid">
            <div 
              className="material-card"
              onClick={() => router.push(`/class/${id}/flashcards`)}
            >
              <div className="material-icon">🎴</div>
              <h4>Flashcards</h4>
              <p>Review key concepts</p>
            </div>
            
            <div 
              className="material-card"
              onClick={() => router.push(`/class/${id}/quiz`)}
            >
              <div className="material-icon">📝</div>
              <h4>Practice Quiz</h4>
              <p>Test your knowledge</p>
            </div>
            
            <div 
              className="material-card"
              onClick={() => router.push(`/class/${id}/concept-map`)}
            >
              <div className="material-icon">🗺️</div>
              <h4>Concept Map</h4>
              <p>Visualize connections</p>
            </div>
            
            <div 
              className="material-card"
              onClick={() => router.push(`/class/${id}/help`)}
            >
              <div className="material-icon">🆘</div>
              <h4>Get Help</h4>
              <p>Assignment assistance</p>
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        .dashboard-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          padding: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .loading, .empty-state, .error-state {
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

        .empty-icon {
          font-size: 64px;
        }

        .primary-button {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          padding: 12px 32px;
          border-radius: 12px;
          border: none;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .primary-button:hover {
          transform: translateY(-2px);
        }

        .dashboard-header {
          background: white;
          border-radius: 20px;
          padding: 32px;
          margin-bottom: 24px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .header-greeting h1 {
          margin: 0 0 8px 0;
          font-size: 32px;
          font-weight: 700;
          color: #0f172a;
        }

        .subtitle {
          margin: 0;
          color: #64748b;
          font-size: 16px;
        }

        .header-meta {
          display: flex;
          gap: 12px;
        }

        .week-badge, .time-badge {
          padding: 8px 16px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
        }

        .week-badge {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
        }

        .time-badge {
          background: #f1f5f9;
          color: #475569;
        }

        .week-focus {
          background: white;
          border-radius: 20px;
          padding: 24px 32px;
          margin-bottom: 24px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        .week-focus h2 {
          margin: 0 0 16px 0;
          font-size: 24px;
          color: #0f172a;
        }

        .topics-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .topic-chip {
          padding: 6px 12px;
          background: #eff6ff;
          color: #3b82f6;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
        }

        section {
          background: white;
          border-radius: 20px;
          padding: 32px;
          margin-bottom: 24px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        section h3 {
          margin: 0 0 24px 0;
          font-size: 20px;
          font-weight: 600;
          color: #0f172a;
        }

        .tasks-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .task-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: #f8fafc;
          border-radius: 12px;
          transition: all 0.2s;
        }

        .task-card:hover {
          background: #f1f5f9;
          transform: translateX(4px);
        }

        .task-number {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          flex-shrink: 0;
        }

        .task-content {
          flex: 1;
        }

        .task-content p {
          margin: 0;
          color: #475569;
          line-height: 1.5;
        }

        .task-action {
          padding: 8px 16px;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-weight: 600;
          color: #3b82f6;
          cursor: pointer;
          transition: all 0.2s;
        }

        .task-action:hover {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .insight-section {
          display: flex;
          gap: 16px;
          padding: 24px;
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border-radius: 16px;
          border-left: 4px solid #f59e0b;
        }

        .insight-icon {
          font-size: 32px;
        }

        .insight-section h4 {
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 600;
          color: #78350f;
        }

        .insight-section p {
          margin: 0;
          color: #78350f;
          line-height: 1.5;
        }

        .progress-card {
          display: flex;
          align-items: center;
          gap: 32px;
        }

        .progress-stat {
          text-align: center;
        }

        .stat-number {
          font-size: 48px;
          font-weight: 700;
          background: linear-gradient(135deg, #10b981, #059669);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .stat-label {
          font-size: 14px;
          color: #64748b;
          margin-top: 4px;
        }

        .progress-bar-container {
          flex: 1;
        }

        .progress-bar {
          height: 12px;
          background: #f1f5f9;
          border-radius: 6px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #10b981, #059669);
          border-radius: 6px;
          transition: width 1s ease;
        }

        .assessments-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .assessment-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: #fef2f2;
          border-radius: 12px;
          border-left: 4px solid #ef4444;
        }

        .assessment-type {
          padding: 4px 12px;
          background: #ef4444;
          color: white;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .assessment-info {
          flex: 1;
        }

        .assessment-info h4 {
          margin: 0 0 4px 0;
          font-size: 16px;
          color: #0f172a;
        }

        .assessment-info p {
          margin: 0;
          font-size: 14px;
          color: #64748b;
        }

        .prep-button {
          padding: 8px 16px;
          background: white;
          border: 2px solid #ef4444;
          border-radius: 8px;
          color: #ef4444;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .prep-button:hover {
          background: #ef4444;
          color: white;
        }

        .materials-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .material-card {
          padding: 24px;
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border-radius: 16px;
          border: 2px solid #e2e8f0;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .material-card:hover {
          transform: translateY(-4px);
          border-color: #3b82f6;
          box-shadow: 0 8px 16px rgba(59, 130, 246, 0.2);
        }

        .material-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }

        .material-card h4 {
          margin: 0 0 8px 0;
          font-size: 18px;
          color: #0f172a;
        }

        .material-card p {
          margin: 0;
          font-size: 14px;
          color: #64748b;
        }

        @media (max-width: 768px) {
          .dashboard-header {
            flex-direction: column;
            gap: 16px;
          }

          .progress-card {
            flex-direction: column;
          }

          .materials-grid {
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          }
        }
      `}</style>
    </>
  );
}
