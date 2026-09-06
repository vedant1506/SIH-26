"use client";
import TopBar from "@/components/layout/TopBar";
import AlertFeed from "@/components/features/AlertFeed";
import Link from "next/link";

export default function AlertsPage() {
  return (
    <div>
      <TopBar
        title="Alert Operations Center"
        subtitle="Real-time risk escalation alerts & multi-stage triage pipeline across all central sector projects"
        action={
          <Link
            href="/actions"
            className="btn btn-primary"
            style={{
              textDecoration: "none",
              fontSize: 12,
              padding: "7px 14px",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 11 12 14 22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            Open Action Board
          </Link>
        }
      />
      <div className="responsive-container">
        <div className="card">
          <AlertFeed compact={false} />
        </div>
      </div>
    </div>
  );
}