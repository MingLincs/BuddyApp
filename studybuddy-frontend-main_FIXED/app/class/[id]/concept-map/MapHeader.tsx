"use client";

type Props = {
  conceptCount: number;
  connectionCount: number;
  viewMode: 'graph' | 'list';
  setViewMode: (mode: 'graph' | 'list') => void;
  filterImportance: string;
  setFilterImportance: (importance: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
};

export default function MapHeader({
  conceptCount,
  connectionCount,
  viewMode,
  setViewMode,
  filterImportance,
  setFilterImportance,
  searchTerm,
  setSearchTerm
}: Props) {
  return (
    <>
      <header className="map-header">
        <div className="header-content">
          <div className="title-section">
            <h1 className="header-title">🧠 Your Knowledge Graph</h1>
            <div className="stats-row">
              <div className="stat">
                <span className="stat-value">{conceptCount}</span>
                <span className="stat-label">concepts</span>
              </div>
              <span className="stat-divider">•</span>
              <div className="stat">
                <span className="stat-value">{connectionCount}</span>
                <span className="stat-label">connections</span>
              </div>
              <span className="stat-divider">•</span>
              <div className="stat">
                <span className="stat-label">Last updated 2m ago</span>
              </div>
            </div>
          </div>

          <div className="controls-section">
            {/* Search */}
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search concepts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              {searchTerm && (
                <button 
                  className="clear-button"
                  onClick={() => setSearchTerm('')}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="filter-group">
              <span className="filter-label">Filter:</span>
              <button
                className={`filter-button ${filterImportance === 'all' ? 'active' : ''}`}
                onClick={() => setFilterImportance('all')}
              >
                All
              </button>
              <button
                className={`filter-button ${filterImportance === 'core' ? 'active' : ''}`}
                onClick={() => setFilterImportance('core')}
              >
                ⭐ Core
              </button>
              <button
                className={`filter-button ${filterImportance === 'important' ? 'active' : ''}`}
                onClick={() => setFilterImportance('important')}
              >
                ● Important
              </button>
              <button
                className={`filter-button ${filterImportance === 'advanced' ? 'active' : ''}`}
                onClick={() => setFilterImportance('advanced')}
              >
                ◆ Advanced
              </button>
            </div>

            {/* View Toggle */}
            <div className="view-toggle">
              <span className="filter-label">View:</span>
              <button
                className={`view-button ${viewMode === 'graph' ? 'active' : ''}`}
                onClick={() => setViewMode('graph')}
              >
                🗺️ Map
              </button>
              <button
                className={`view-button ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                📋 List
              </button>
            </div>
          </div>
        </div>
      </header>

      <style jsx>{`
        .map-header {
          background: white;
          border-bottom: 1px solid #e2e8f0;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px;
        }

        .title-section {
          margin-bottom: 20px;
        }

        .header-title {
          margin: 0 0 8px 0;
          font-size: 28px;
          font-weight: 700;
          color: #0f172a;
        }

        .stats-row {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
        }

        .stat {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .stat-value {
          font-weight: 600;
          color: #3b82f6;
        }

        .stat-label {
          color: #64748b;
        }

        .stat-divider {
          color: #cbd5e1;
        }

        .controls-section {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          align-items: center;
        }

        .search-box {
          position: relative;
          flex: 1;
          min-width: 250px;
          max-width: 400px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 16px;
        }

        .search-input {
          width: 100%;
          padding: 10px 40px 10px 40px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 14px;
          transition: all 0.2s;
        }

        .search-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .clear-button {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
          font-size: 14px;
        }

        .clear-button:hover {
          color: #64748b;
        }

        .filter-group, .view-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f8fafc;
          padding: 4px;
          border-radius: 12px;
        }

        .filter-label {
          font-size: 14px;
          font-weight: 500;
          color: #64748b;
          padding: 0 8px;
        }

        .filter-button, .view-button {
          padding: 8px 16px;
          border: none;
          background: transparent;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-button:hover, .view-button:hover {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
        }

        .filter-button.active, .view-button.active {
          background: white;
          color: #3b82f6;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        @media (max-width: 768px) {
          .header-content {
            padding: 16px;
          }

          .header-title {
            font-size: 22px;
          }

          .controls-section {
            flex-direction: column;
            align-items: stretch;
          }

          .search-box {
            max-width: none;
          }

          .filter-group, .view-toggle {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </>
  );
}