"use client";

import { useState } from "react";
import Link from "next/link";

export default function LandingPage() {
  const [email, setEmail] = useState("");

  return (
    <div className="landing-page">
      {/* HERO SECTION */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            How do you want to <span className="gradient-text">study smarter</span>?
          </h1>
          <p className="hero-subtitle">
            Master whatever you're learning with StudyBuddy's AI-powered flashcards, 
            concept maps, and intelligent study materials.
          </p>
           <div className="hero-buttons">
        <button
          className="btn-primary"
          onClick={() => window.dispatchEvent(new Event("open-signup"))}
        >
          Sign up for free
        </button>

        
      </div>
        </div>

        {/* Feature Cards */}
        <div className="feature-cards-grid">
          <div className="feature-card card-purple">
            <div className="card-icon">🎴</div>
            <div className="card-preview">
              <div className="flashcard-preview">
                <div className="flashcard-question">
                  <strong>What is photosynthesis?</strong>
                </div>
                <div className="flashcard-answer">
                  Process plants use to convert light into energy
                </div>
              </div>
            </div>
            <h3>Smart Flashcards</h3>
            <p>AI-generated flashcards from your notes</p>
          </div>

          <div className="feature-card card-orange">
            <div className="card-icon">🧠</div>
            <div className="card-preview">
              <div className="concept-preview">
                <div className="concept-node">Mitosis</div>
                <div className="concept-arrow">→</div>
                <div className="concept-node">Prophase</div>
              </div>
            </div>
            <h3>Concept Maps</h3>
            <p>Visualize connections between concepts</p>
          </div>

          <div className="feature-card card-cyan">
            <div className="card-icon">✨</div>
            <div className="card-preview">
              <div className="ai-preview">
                <div className="ai-badge">AI Smart Assist</div>
                <div className="ai-text">
                  Create study materials instantly
                </div>
              </div>
            </div>
            <h3>AI Study Assistant</h3>
            <p>Instant study guides and practice questions</p>
          </div>

          <div className="feature-card card-yellow">
            <div className="card-icon">📊</div>
            <div className="card-preview">
              <div className="progress-preview">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: '75%' }}></div>
                </div>
                <div className="progress-text">75% mastered</div>
              </div>
            </div>
            <h3>Track Progress</h3>
            <p>See your learning journey in real-time</p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="features" className="how-it-works-section">
        <h2 className="section-title">Every class, every test, one ultimate study app</h2>
        <p className="section-subtitle">
          Upload your materials and let AI do the heavy lifting. Study smarter, not harder.
        </p>

        <div className="steps-grid">
          <div className="step-item">
            <div className="step-visual gradient-purple">
              <div className="upload-icon">📄</div>
              <div className="upload-arrow">↓</div>
              <div className="upload-cloud">☁️</div>
            </div>
            <div className="step-content">
              <h3>1. Upload your materials</h3>
              <p>
                Drop your lecture slides, notes, or syllabus. 
                PDF, images, any format works.
              </p>
            </div>
          </div>

          <div className="step-item">
            <div className="step-visual gradient-orange">
              <div className="ai-processing">
                <div className="ai-circle"></div>
                <div className="ai-pulse"></div>
              </div>
            </div>
            <div className="step-content">
              <h3>2. AI processes everything</h3>
              <p>
                Our AI extracts key concepts, creates flashcards, 
                and builds your personalized concept map.
              </p>
            </div>
          </div>

          <div className="step-item">
            <div className="step-visual gradient-cyan">
              <div className="materials-preview">
                <div className="material-pill">📝 Study Guide</div>
                <div className="material-pill">🎴 Flashcards</div>
                <div className="material-pill">🧠 Concept Map</div>
              </div>
            </div>
            <div className="step-content">
              <h3>3. Study with your materials</h3>
              <p>
                Everything you need in one place. Flashcards, quizzes, 
                concept maps, and more.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* INSTANT STUDY CONTENT */}
      <section className="instant-content-section">
        <div className="content-grid">
          <div className="content-visual">
            <div className="document-transform">
              <div className="doc-before">
                <div className="doc-lines"></div>
                <div className="doc-lines"></div>
                <div className="doc-lines"></div>
              </div>
              <div className="transform-arrow">→</div>
              <div className="doc-after">
                <div className="flashcard-stack">
                  <div className="mini-card card-1"></div>
                  <div className="mini-card card-2"></div>
                  <div className="mini-card card-3"></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="content-text">
            <h2>Make class material instantly studiable</h2>
            <p>
              Turn your slides, videos, and notes into flashcard sets, 
              practice tests, and study guides in seconds.
            </p>
            <button
          className="btn-primary"
          onClick={() => window.dispatchEvent(new Event("open-signup"))}
        >
          Try it Out
        </button>
          </div>
        </div>
      </section>

      {/* SUBJECT AWARENESS */}
      <section className="subject-section">
        <h2 className="section-title">Smart study for any subject</h2>
        <p className="section-subtitle">
          Our AI understands the difference between STEM, Humanities, and more
        </p>

        <div className="subject-grid">
          <div className="subject-card stem-card">
            <div className="subject-icon">🔬</div>
            <h3>STEM</h3>
            <ul className="subject-features">
              <li>Formula recognition</li>
              <li>Step-by-step problem solving</li>
              <li>Algorithm visualization</li>
            </ul>
          </div>

          <div className="subject-card humanities-card">
            <div className="subject-icon">📚</div>
            <h3>Humanities</h3>
            <ul className="subject-features">
              <li>Thematic analysis</li>
              <li>Historical context</li>
              <li>Critical arguments</li>
            </ul>
          </div>

          <div className="subject-card social-card">
            <div className="subject-icon">🌍</div>
            <h3>Social Science</h3>
            <ul className="subject-features">
              <li>Theory frameworks</li>
              <li>Research studies</li>
              <li>Case analysis</li>
            </ul>
          </div>
        </div>
      </section>

      {/* STATS SECTION */}
      <section className="stats-section">
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-number">500+</div>
            <div className="stat-label">Students helped</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">100%</div>
            <div className="stat-label">Better grades reported</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">2K+</div>
            <div className="stat-label">Summaries created</div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="cta-section">
        <h2>Ready to study smarter?</h2>
        <p>Join thousdands of students already using StudyBuddy</p>
        <div className="cta-form">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="email-input"
          />
          <button className="btn-primary">Get started free</button>
        </div>
      </section>

      <style jsx>{`
        .landing-page {
          width: 100%;
          overflow-x: hidden;
        }

        /* HERO SECTION */
        .hero-section {
          padding: 80px 20px 100px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-align: center;
        }

        .hero-content {
          max-width: 900px;
          margin: 0 auto 60px;
        }

        .hero-title {
          font-size: 56px;
          font-weight: 800;
          line-height: 1.2;
          margin-bottom: 24px;
        }

        .gradient-text {
          background: linear-gradient(135deg, #ffd89b 0%, #19547b 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-subtitle {
          font-size: 20px;
          line-height: 1.6;
          opacity: 0.95;
          margin-bottom: 40px;
          max-width: 700px;
          margin-left: auto;
          margin-right: auto;
        }

        .hero-buttons {
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .btn-primary {
          padding: 16px 32px;
          background: white;
          color: #667eea;
          border: none;
          border-radius: 12px;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
        }

        .btn-secondary {
          padding: 16px 32px;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 2px solid white;
          border-radius: 12px;
          font-size: 18px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.3s;
          display: inline-block;
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        /* FEATURE CARDS */
        .feature-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .feature-card {
          background: white;
          border-radius: 24px;
          padding: 32px;
          text-align: center;
          transition: all 0.3s;
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }

        .feature-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
        }

        .card-purple { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .card-orange { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; }
        .card-cyan { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; }
        .card-yellow { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; }

        .card-icon {
          font-size: 48px;
          margin-bottom: 20px;
        }

        .card-preview {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
          backdrop-filter: blur(10px);
        }

        .flashcard-preview {
          background: white;
          color: #333;
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .flashcard-question {
          font-size: 14px;
          margin-bottom: 12px;
        }

        .flashcard-answer {
          font-size: 12px;
          color: #666;
        }

        .concept-preview {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }

        .concept-node {
          background: white;
          color: #333;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .concept-arrow {
          font-size: 20px;
        }

        .ai-preview {
          text-align: center;
        }

        .ai-badge {
          background: white;
          color: #4facfe;
          padding: 6px 12px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          display: inline-block;
          margin-bottom: 12px;
        }

        .ai-text {
          font-size: 13px;
        }

        .progress-preview {
          text-align: center;
        }

        .progress-bar {
          background: rgba(255, 255, 255, 0.3);
          height: 8px;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-fill {
          background: white;
          height: 100%;
          border-radius: 4px;
          transition: width 0.5s;
        }

        .progress-text {
          font-size: 12px;
        }

        .feature-card h3 {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .feature-card p {
          font-size: 14px;
          opacity: 0.9;
        }

        /* HOW IT WORKS */
        .how-it-works-section {
          padding: 100px 20px;
          background: #f8fafc;
        }

        .section-title {
          font-size: 42px;
          font-weight: 800;
          text-align: center;
          margin-bottom: 16px;
          color: #1e293b;
        }

        .section-subtitle {
          font-size: 18px;
          text-align: center;
          color: #64748b;
          margin-bottom: 60px;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        .steps-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 40px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .step-item {
          text-align: center;
        }

        .step-visual {
          height: 200px;
          border-radius: 20px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 16px;
        }

        .gradient-purple { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .gradient-orange { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
        .gradient-cyan { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }

        .upload-icon, .upload-cloud {
          font-size: 48px;
        }

        .upload-arrow {
          font-size: 32px;
          color: white;
        }

        .ai-processing {
          position: relative;
          width: 80px;
          height: 80px;
        }

        .ai-circle {
          width: 80px;
          height: 80px;
          border: 4px solid white;
          border-radius: 50%;
          border-top-color: transparent;
          animation: spin 1.5s linear infinite;
        }

        .ai-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 40px;
          height: 40px;
          background: white;
          border-radius: 50%;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.5; transform: translate(-50%, -50%) scale(1.2); }
        }

        .materials-preview {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 20px;
        }

        .material-pill {
          background: white;
          padding: 12px 20px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          color: #4facfe;
        }

        .step-content h3 {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 12px;
          color: #1e293b;
        }

        .step-content p {
          font-size: 16px;
          color: #64748b;
          line-height: 1.6;
        }

        /* INSTANT CONTENT */
        .instant-content-section {
          padding: 100px 20px;
          background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
        }

        .content-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 60px;
          max-width: 1200px;
          margin: 0 auto;
          align-items: center;
        }

        .content-visual {
          display: flex;
          justify-content: center;
        }

        .document-transform {
          display: flex;
          align-items: center;
          gap: 32px;
        }

        .doc-before, .doc-after {
          background: white;
          padding: 24px;
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }

        .doc-lines {
          height: 12px;
          background: linear-gradient(90deg, #e2e8f0 0%, #cbd5e1 100%);
          border-radius: 6px;
          margin-bottom: 12px;
        }

        .transform-arrow {
          font-size: 36px;
          font-weight: bold;
          color: #f5576c;
        }

        .flashcard-stack {
          position: relative;
          width: 120px;
          height: 100px;
        }

        .mini-card {
          position: absolute;
          width: 100%;
          height: 70px;
          border-radius: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .card-1 { transform: rotate(-5deg); opacity: 0.4; }
        .card-2 { transform: rotate(0deg); opacity: 0.7; }
        .card-3 { transform: rotate(5deg); opacity: 1; }

        .content-text h2 {
          font-size: 40px;
          font-weight: 800;
          margin-bottom: 20px;
          color: #1e293b;
        }

        .content-text p {
          font-size: 18px;
          line-height: 1.6;
          color: #475569;
          margin-bottom: 32px;
        }

        /* SUBJECT SECTION */
        .subject-section {
          padding: 100px 20px;
          background: white;
        }

        .subject-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 32px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .subject-card {
          padding: 40px;
          border-radius: 24px;
          text-align: center;
          transition: all 0.3s;
          cursor: pointer;
        }

        .subject-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        }

        .stem-card { background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); }
        .humanities-card { background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); }
        .social-card { background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%); }

        .subject-icon {
          font-size: 56px;
          margin-bottom: 20px;
        }

        .subject-card h3 {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 20px;
          color: #1e293b;
        }

        .subject-features {
          list-style: none;
          padding: 0;
          text-align: left;
        }

        .subject-features li {
          padding: 12px 0;
          color: #475569;
          font-size: 16px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }

        .subject-features li:last-child {
          border-bottom: none;
        }

        .subject-features li:before {
          content: "✓ ";
          color: #10b981;
          font-weight: bold;
          margin-right: 8px;
        }

        /* STATS SECTION */
        .stats-section {
          padding: 80px 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 40px;
          max-width: 1000px;
          margin: 0 auto;
          text-align: center;
        }

        .stat-number {
          font-size: 56px;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .stat-label {
          font-size: 18px;
          opacity: 0.9;
        }

        /* CTA SECTION */
        .cta-section {
          padding: 100px 20px;
          background: #f8fafc;
          text-align: center;
        }

        .cta-section h2 {
          font-size: 48px;
          font-weight: 800;
          margin-bottom: 16px;
          color: #1e293b;
        }

        .cta-section > p {
          font-size: 20px;
          color: #64748b;
          margin-bottom: 40px;
        }

        .cta-form {
          display: flex;
          gap: 12px;
          max-width: 600px;
          margin: 0 auto 16px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .email-input {
          flex: 1;
          min-width: 280px;
          padding: 16px 24px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 16px;
          transition: all 0.3s;
        }

        .email-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }

        .cta-subtext {
          color: #94a3b8;
          font-size: 14px;
        }

        /* RESPONSIVE */
        @media (max-width: 768px) {
          .hero-title {
            font-size: 36px;
          }

          .hero-subtitle {
            font-size: 16px;
          }

          .section-title {
            font-size: 32px;
          }

          .feature-cards-grid {
            grid-template-columns: 1fr;
          }

          .document-transform {
            flex-direction: column;
            gap: 16px;
          }

          .transform-arrow {
            transform: rotate(90deg);
          }

          .cta-form {
            flex-direction: column;
          }

          .email-input {
            min-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
