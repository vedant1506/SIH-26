"use client";
import TopBar from "@/components/layout/TopBar";
import AlertFeed from "@/components/features/AlertFeed";

export default function AlertsPage() {
  return (
    <div>
      <TopBar title="Early Warning Feed" subtitle="Real-time risk escalation alerts - all central sector projects" />
      <div style={{ padding: "24px 24px 48px" }}>
        <div className="card">
          <AlertFeed maxItems={100} compact={false} />
        </div>
      </div>
    </div>
  );
}