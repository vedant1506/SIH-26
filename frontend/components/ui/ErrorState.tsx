export default function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="card" style={{ textAlign: "center", padding: 32, color: "#f43f5e" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Error Loading Data</div>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>{message || "Something went wrong. Please try again."}</div>
      {onRetry && (
        <button className="btn btn-secondary btn-sm" onClick={onRetry}>Retry</button>
      )}
    </div>
  );
}
