"use client";

export default function HomePage() {
  return (
    <div className="home-page">
      <div className="welcome-section">
        <h1 className="welcome-title">
          Welcome to <span className="gradient-text">StudyBuddy</span> 🎓
        </h1>
        <p className="welcome-subtitle">
          Your AI-powered study companion is ready to help you ace your classes!
        </p>

        {/* Quick Actions */}
        <div className="quick-actions">
          <div className="action-card card-upload">
            <div className="action-icon">📤</div>
            <h3>Upload Materials</h3>
            <p>Turn your notes into flashcards and study guides</p>
            <a href="/upload" className="action-button">Get Started</a>
          </div>

          <div className="action-card card-classes">
            <div className="action-icon">📚</div>
            <h3>My Classes</h3>
            <p>View and manage all your classes in one place</p>
            <a href="/classes" className="action-button">View Classes</a>
          </div>

          <div className="action-card card-library">
            <div className="action-icon">📁</div>
            <h3>Library</h3>
            <p>Access all your study materials and documents</p>
            <a href="/library" className="action-button">Browse Library</a>
          </div>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="coming-soon-section">
        <h2>Coming Soon</h2>
        <div className="features-preview">
          <div className="preview-item">
            <span className="preview-icon">📊</span>
            <span>Study Analytics</span>
          </div>
          <div className="preview-item">
            <span className="preview-icon">🎯</span>
            <span>Study Goals</span>
          </div>
          <div className="preview-item">
            <span className="preview-icon">📅</span>
            <span>Study Calendar</span>
          </div>
          <div className="preview-item">
            <span className="preview-icon">🏆</span>
            <span>Achievements</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .home-page {
          max-width: 1200px;
          margin: 0 auto;
        }

        .welcome-section {
          text-align: center;
          padding: 60px 20px;
        }

        .welcome-title {
          font-size: 48px;
          font-weight: 800;
          margin-bottom: 16px;
          color: #1e293b;
        }

        .gradient-text {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .welcome-subtitle {
          font-size: 20px;
          color: #64748b;
          margin-bottom: 60px;
        }

        .quick-actions {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
        }

        .action-card {
          background: white;
          border-radius: 20px;
          padding: 32px;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          transition: all 0.3s;
          cursor: pointer;
        }

        .action-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
        }

        .card-upload { border-top: 4px solid #667eea; }
        .card-classes { border-top: 4px solid #f093fb; }
        .card-library { border-top: 4px solid #4facfe; }

        .action-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .action-card h3 {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 12px;
          color: #1e293b;
        }

        .action-card p {
          font-size: 14px;
          color: #64748b;
          margin-bottom: 24px;
          line-height: 1.6;
        }

        .action-button {
          display: inline-block;
          padding: 12px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 10px;
          text-decoration: none;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s;
        }

        .action-button:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .coming-soon-section {
          margin-top: 80px;
          padding: 40px;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          border-radius: 20px;
          text-align: center;
        }

        .coming-soon-section h2 {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 32px;
          color: #1e293b;
        }

        .features-preview {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          justify-content: center;
        }

        .preview-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: white;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          color: #475569;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .preview-icon {
          font-size: 20px;
        }

        @media (max-width: 768px) {
          .welcome-title {
            font-size: 36px;
          }

          .welcome-subtitle {
            font-size: 16px;
          }

          .quick-actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
