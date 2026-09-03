"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import Sidebar from "@/components/layout/Sidebar";
import { NavProvider, useNav } from "@/lib/nav-context";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { collapsed, setCollapsed, mobileOpen, closeMobile } = useNav();

  useEffect(() => {
    if (!isLoggedIn()) router.replace("/login");
  }, [router]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", position: "relative" }}>
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="mobile-nav-backdrop mobile-only"
          onClick={closeMobile}
          aria-label="Close menu"
        />
      )}

      {/* Sidebar with Desktop + Mobile Drawer support */}
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={closeMobile}
      />

      {/* Main Content Area — Fully Responsive */}
      <div className={`main-dashboard-content ${collapsed ? "collapsed" : "expanded"}`}>
        <main style={{ flex: 1, width: "100%" }}>{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <NavProvider>
      <DashboardShell>{children}</DashboardShell>
    </NavProvider>
  );
}
