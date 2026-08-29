export default function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="card" style={{ textAlign: "center", padding: 32, color: "#f43f5e" }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Error Loading Data</div>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>{message || "Something went wrong. Please try again."}</div>
      {onRetry && (
        <button className="btn btn-secondary btn-sm" onClick={onRetry}>Retry</button>
      )}
    </div>
  );
}
