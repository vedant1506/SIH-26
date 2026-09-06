"use client";
/**
 * AuthContext — RBAC-aware authentication context for PRISM.
 *
 * Provides:
 *  - user: full user profile (id, email, role, name, designation, department)
 *  - role: current active role string
 *  - permissions: precomputed boolean map of what the user can do
 *  - hasRole(roles): helper for checking membership
 *  - login(token, userInfo): persists session and updates state
 *  - logout(): clears session and redirects
 *  - switchRole(newRole): demo-mode instant role switch (calls /auth/switch-role)
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { getToken, getUser, setToken, setUser, clearToken } from "@/lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "decision_maker" | "monitoring_officer" | "analyst";

export interface UserProfile {
  user_id: string;
  email: string;
  role: UserRole;
  full_name?: string | null;
  designation?: string | null;
  department_or_ministry?: string | null;
}

export interface RolePermissions {
  // Project management
  canCreateProjects: boolean;
  canEditProjects: boolean;
  canDeleteProjects: boolean;
  // Alert management
  canAcknowledgeAlerts: boolean;
  canAcknowledgeAllAlerts: boolean;
  // User management (admin portal)
  canManageUsers: boolean;
  canViewAccessControl: boolean;
  // Analytics
  canViewShapExplanations: boolean;
  canViewBenchmarking: boolean;
  canViewMLValidation: boolean;
  // Reports
  canExportBriefs: boolean;
}

export interface AuthContextValue {
  user: UserProfile | null;
  role: UserRole | null;
  permissions: RolePermissions;
  isLoading: boolean;
  hasRole: (roles: UserRole[]) => boolean;
  login: (token: string, userInfo: UserProfile) => void;
  logout: () => void;
  switchRole: (newRole: UserRole) => Promise<void>;
}

// ─── Permission Matrix ────────────────────────────────────────────────────────

export function computePermissions(role: UserRole | null): RolePermissions {
  const is = (r: UserRole) => role === r;
  const isAdmin = is("admin");
  const isDecisionMaker = is("decision_maker");
  const isOfficer = is("monitoring_officer");
  const isAnalyst = is("analyst");

  return {
    canCreateProjects: isAdmin,
    canEditProjects: isAdmin || isOfficer,
    canDeleteProjects: isAdmin,
    canAcknowledgeAlerts: isAdmin || isDecisionMaker || isOfficer,
    canAcknowledgeAllAlerts: isAdmin || isDecisionMaker,
    canManageUsers: isAdmin,
    canViewAccessControl: isAdmin,
    canViewShapExplanations: true,           // All roles can view AI explanations
    canViewBenchmarking: isAdmin || isAnalyst || isDecisionMaker,
    canViewMLValidation: isAdmin || isAnalyst,
    canExportBriefs: isAdmin || isDecisionMaker,
  };
}

// ─── Role display metadata ────────────────────────────────────────────────────

export const ROLE_META: Record<UserRole, { label: string; color: string; bg: string; icon: string }> = {
  admin: {
    label: "Administrator",
    color: "#a78bfa",
    bg: "rgba(139,92,246,0.15)",
    icon: "admin",
  },
  decision_maker: {
    label: "Decision Maker",
    color: "#fbbf24",
    bg: "rgba(245,158,11,0.15)",
    icon: "decision_maker",
  },
  monitoring_officer: {
    label: "Monitoring Officer",
    color: "#60a5fa",
    bg: "rgba(59,130,246,0.15)",
    icon: "monitoring_officer",
  },
  analyst: {
    label: "Data Analyst",
    color: "#34d399",
    bg: "rgba(16,185,129,0.15)",
    icon: "analyst",
  },
};

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUserState] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = getUser() as UserProfile | null;
    if (stored && getToken()) {
      setUserState(stored);
    }
    setIsLoading(false);
  }, []);

  const role: UserRole | null = user?.role ?? null;
  const permissions = computePermissions(role);

  const hasRole = useCallback(
    (roles: UserRole[]) => (role !== null ? roles.includes(role) : false),
    [role]
  );

  const login = useCallback((token: string, userInfo: UserProfile) => {
    setToken(token);
    setUser(userInfo);
    setUserState(userInfo);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUserState(null);
    router.replace("/login");
  }, [router]);

  const switchRole = useCallback(
    async (newRole: UserRole) => {
      const token = getToken();
      if (!token) return;

      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      try {
        const res = await fetch(`${BASE_URL}/api/v1/auth/switch-role`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role: newRole }),
        });
        if (!res.ok) throw new Error(`Switch role failed: ${res.status}`);
        const data = await res.json();

        const updatedUser: UserProfile = {
          user_id: data.user_id,
          email: data.email,
          role: data.role as UserRole,
          full_name: data.full_name,
          designation: data.designation,
          department_or_ministry: data.department_or_ministry,
        };

        login(data.access_token, updatedUser);
      } catch (err) {
        console.error("[PRISM] Role switch failed:", err);
      }
    },
    [login]
  );

  return (
    <AuthContext.Provider
      value={{ user, role, permissions, isLoading, hasRole, login, logout, switchRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth() must be used inside <AuthProvider>.");
  }
  return ctx;
}
