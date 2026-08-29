"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import Sidebar from "@/components/layout/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) router.replace("/login");
  }, [router]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div style={{ paddingLeft: collapsed ? 72 : 240, minHeight: "100vh", display: "flex", flexDirection: "column", transition: "padding-left 0.3s ease" }}>
        <main style={{ flex: 1 }}>{children}</main>
      </div>
    </div>
  );
}
