"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";

export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    if (isLoggedIn()) router.replace("/dashboard");
    else router.replace("/login");
  }, [router]);
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#020617" }}>
      <div className="animate-spin" style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid rgba(6,182,212,0.2)", borderTopColor: "#06b6d4" }} />
    </div>
  );
}
