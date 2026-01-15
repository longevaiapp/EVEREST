function Header({ workflowName, version }) {
  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <path d="M20 5L25 15L35 15L27.5 22L30 32L20 26L10 32L12.5 22L5 15L15 15L20 5Z" fill="#4CAF50"/>
            <circle cx="20" cy="20" r="3" fill="white"/>
          </svg>
          <div>
            <h1>{workflowName.replace(/_/g, ' ')}</h1>
            <span className="version">v{version}</span>
          </div>
        </div>
        <div className="header-actions">
          <span className="status-badge">Demo Mode</span>
        </div>
      </div>
    </header>
  );
}

export default Header;
