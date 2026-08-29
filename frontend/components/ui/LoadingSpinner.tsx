export default function LoadingSpinner({ size = 32, label }: { size?: number; label?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: "#64748b" }}>
      <div className="animate-spin" style={{
        width: size, height: size, borderRadius: "50%",
        border: `3px solid rgba(6,182,212,0.2)`,
        borderTopColor: "#06b6d4",
      }} />
      {label && <span style={{ fontSize: 13 }}>{label}</span>}
    </div>
  );
}
