"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { generateClassFlashcards } from "@/lib/api";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Flashcard = {
  front: string;
  back: string;
  type: string;
  difficulty: string;
  concept_name: string;
};

export default function FlashcardsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [shuffled, setShuffled] = useState(false);

  useEffect(() => {
    loadFlashcards();
  }, [id]);

  async function loadFlashcards() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/intelligent/materials/${id}/flashcards`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      const data = await response.json();
      setFlashcards(data.flashcards || []);
    } catch (err) {
      console.error('Flashcards error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setGenerateError("");
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      const result = await generateClassFlashcards(String(id), session.access_token);
      setFlashcards((result.flashcards || []) as Flashcard[]);
      setCurrentIndex(0);
      setFlipped(false);
    } catch (e: unknown) {
      setGenerateError(e instanceof Error ? e.message : "Failed to generate flashcards.");
    } finally {
      setGenerating(false);
    }
  }

  const filteredCards = flashcards.filter(card => 
    filterDifficulty === 'all' || card.difficulty === filterDifficulty
  );

  const currentCard = filteredCards[currentIndex];

  function nextCard() {
    setFlipped(false);
    setTimeout(() => {
      setCurrentIndex((i) => (i + 1) % filteredCards.length);
    }, 150);
  }

  function prevCard() {
    setFlipped(false);
    setTimeout(() => {
      setCurrentIndex((i) => (i - 1 + filteredCards.length) % filteredCards.length);
    }, 150);
  }

  function shuffleCards() {
    const shuffled = [...filteredCards].sort(() => Math.random() - 0.5);
    setFlashcards(shuffled);
    setCurrentIndex(0);
    setFlipped(false);
    setShuffled(true);
  }

  if (loading) {
    return (
      <div className="flashcards-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading flashcards...</p>
        </div>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="flashcards-container">
        <div className="empty-state">
          <div className="empty-icon">🎴</div>
          <h2>No Flashcards Yet</h2>
          <p>Upload course materials and I'll generate flashcards automatically!</p>
          {generateError && <p className="error-text">{generateError}</p>}
          <div className="empty-actions">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="generate-button"
            >
              {generating ? "Generating…" : "✨ Generate Flashcards"}
            </button>
            <button onClick={() => router.push(`/class/${id}`)}>
              Upload Materials
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flashcards-container">
        {/* Header */}
        <header className="flashcards-header">
          <div>
            <h1>🎴 Flashcards</h1>
            <p className="subtitle">
              {currentIndex + 1} of {filteredCards.length}
            </p>
          </div>
          
          <div className="header-controls">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="shuffle-button regenerate-button"
            >
              {generating ? "Generating…" : "✨ Regenerate"}
            </button>

            <select 
              value={filterDifficulty}
              onChange={(e) => {
                setFilterDifficulty(e.target.value);
                setCurrentIndex(0);
                setFlipped(false);
              }}
              className="difficulty-filter"
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            
            <button 
              onClick={shuffleCards}
              className="shuffle-button"
            >
              🔀 Shuffle
            </button>
          </div>
        </header>

        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${((currentIndex + 1) / filteredCards.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Flashcard */}
        <div className="card-container">
          <div 
            className={`flashcard ${flipped ? 'flipped' : ''}`}
            onClick={() => setFlipped(!flipped)}
          >
            <div className="card-inner">
              {/* Front */}
              <div className="card-face card-front">
                <div className="card-label">Question</div>
                <div className="card-content">
                  {currentCard?.front}
                </div>
                <div className="card-hint">Click to reveal answer</div>
              </div>
              
              {/* Back */}
              <div className="card-face card-back">
                <div className="card-label">Answer</div>
                <div className="card-content">
                  {currentCard?.back}
                </div>
                {currentCard?.concept_name && (
                  <div className="card-meta">
                    📚 {currentCard.concept_name}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Difficulty Badge */}
          {currentCard && (
            <div className={`difficulty-badge difficulty-${currentCard.difficulty}`}>
              {currentCard.difficulty}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="navigation">
          <button 
            onClick={prevCard}
            className="nav-button"
            disabled={currentIndex === 0}
          >
            ← Previous
          </button>
          
          <div className="nav-dots">
            {filteredCards.slice(0, 10).map((_, i) => (
              <div 
                key={i}
                className={`dot ${i === currentIndex ? 'active' : ''}`}
                onClick={() => {
                  setCurrentIndex(i);
                  setFlipped(false);
                }}
              />
            ))}
            {filteredCards.length > 10 && <span>...</span>}
          </div>
          
          <button 
            onClick={nextCard}
            className="nav-button"
          >
            Next →
          </button>
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="shortcuts-hint">
          <kbd>Space</kbd> Flip card · <kbd>←</kbd> Previous · <kbd>→</kbd> Next
        </div>
      </div>

      <style jsx>{`
        .flashcards-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          padding: 24px;
        }

        .loading, .empty-state {
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

        .flashcards-header {
          max-width: 800px;
          margin: 0 auto 24px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .flashcards-header h1 {
          margin: 0;
          font-size: 32px;
          font-weight: 700;
          color: #0f172a;
        }

        .subtitle {
          margin: 8px 0 0 0;
          color: #64748b;
          font-size: 16px;
        }

        .header-controls {
          display: flex;
          gap: 12px;
        }

        .difficulty-filter, .shuffle-button {
          padding: 8px 16px;
          border-radius: 8px;
          border: 2px solid #e2e8f0;
          background: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .difficulty-filter:hover, .shuffle-button:hover {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .regenerate-button {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border-color: #3b82f6;
        }

        .regenerate-button:hover {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          border-color: #2563eb;
        }

        .generate-button {
          padding: 12px 24px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .generate-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3);
        }

        .generate-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .empty-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .error-text {
          color: #dc2626;
          font-size: 14px;
          margin: 0;
        }

        .progress-container {
          max-width: 800px;
          margin: 0 auto 32px;
        }

        .progress-bar {
          height: 6px;
          background: #e2e8f0;
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #2563eb);
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .card-container {
          max-width: 800px;
          margin: 0 auto 32px;
          perspective: 1000px;
          position: relative;
        }

        .flashcard {
          width: 100%;
          height: 400px;
          cursor: pointer;
          position: relative;
        }

        .card-inner {
          width: 100%;
          height: 100%;
          transition: transform 0.6s;
          transform-style: preserve-3d;
        }

        .flashcard.flipped .card-inner {
          transform: rotateY(180deg);
        }

        .card-face {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          border-radius: 20px;
          padding: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
        }

        .card-front {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border: 2px solid #e2e8f0;
        }

        .card-back {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          transform: rotateY(180deg);
        }

        .card-label {
          position: absolute;
          top: 20px;
          left: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          opacity: 0.7;
        }

        .card-content {
          font-size: 24px;
          line-height: 1.6;
          text-align: center;
          max-width: 600px;
        }

        .card-hint {
          position: absolute;
          bottom: 20px;
          font-size: 14px;
          opacity: 0.6;
        }

        .card-meta {
          position: absolute;
          bottom: 20px;
          font-size: 14px;
          opacity: 0.9;
        }

        .difficulty-badge {
          position: absolute;
          top: 20px;
          right: 20px;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .difficulty-easy {
          background: #10b981;
          color: white;
        }

        .difficulty-medium {
          background: #f59e0b;
          color: white;
        }

        .difficulty-hard {
          background: #ef4444;
          color: white;
        }

        .navigation {
          max-width: 800px;
          margin: 0 auto 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .nav-button {
          padding: 12px 24px;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-weight: 600;
          color: #3b82f6;
          cursor: pointer;
          transition: all 0.2s;
        }

        .nav-button:hover:not(:disabled) {
          border-color: #3b82f6;
          background: #eff6ff;
          transform: translateY(-2px);
        }

        .nav-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .nav-dots {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #cbd5e1;
          cursor: pointer;
          transition: all 0.2s;
        }

        .dot.active {
          width: 32px;
          border-radius: 4px;
          background: #3b82f6;
        }

        .shortcuts-hint {
          max-width: 800px;
          margin: 0 auto;
          text-align: center;
          font-size: 14px;
          color: #64748b;
        }

        kbd {
          padding: 4px 8px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          font-family: monospace;
          font-size: 12px;
        }

        @media (max-width: 768px) {
          .flashcards-header {
            flex-direction: column;
            gap: 16px;
          }

          .card-content {
            font-size: 20px;
          }

          .flashcard {
            height: 350px;
          }
        }
      `}</style>

      <script dangerouslySetInnerHTML={{__html: `
        document.addEventListener('keydown', (e) => {
          if (e.key === ' ') {
            e.preventDefault();
            document.querySelector('.flashcard').click();
          } else if (e.key === 'ArrowLeft') {
            document.querySelector('.nav-button:first-child')?.click();
          } else if (e.key === 'ArrowRight') {
            document.querySelector('.nav-button:last-child')?.click();
          }
        });
      `}} />
    </>
  );
}
