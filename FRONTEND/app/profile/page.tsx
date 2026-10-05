"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  User,
  Shield,
  Mail,
  Building,
  KeyRound,
  Clock,
  Users,
  UserCheck,
  ShieldAlert,
  Lock,
  LogOut,
  FolderOpen,
  CheckCircle2,
  RefreshCw,
  BadgeCheck,
} from "lucide-react";
import { getAdminUsers } from "@/services/adminService";

export default function ProfilePage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [adminData, setAdminData] = useState<any>(null);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("caseintel_user");
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      } else {
        // Fallback default
        setCurrentUser({
          id: "usr-inv-001",
          username: "investigator",
          name: "Inspector Rajesh Verma",
          email: "investigator@caseintel.local",
          role: "INVESTIGATOR",
          department: "Cyber Crime",
          status: "Active",
          lastLoginAt: new Date().toISOString(),
        });
      }
    } catch {
      setCurrentUser(null);
    }
  }, []);

  const isAdmin = (currentUser?.role || "").toUpperCase() === "ADMIN";

  const fetchAdminRoster = async () => {
    if (!isAdmin) return;
    setLoadingAdmin(true);
    try {
      const data = await getAdminUsers();
      setAdminData(data);
    } catch (e) {
      console.error("Failed to load admin user roster:", e);
    } finally {
      setLoadingAdmin(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAdminRoster();
    }
  }, [isAdmin]);

  const handleLogout = () => {
    localStorage.removeItem("caseintel_token");
    localStorage.removeItem("caseintel_user");
    window.location.href = "/login";
  };

  const userInitials = (currentUser?.name || currentUser?.username || "IV")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const clearanceLevel = isAdmin
    ? "Level 4 · National Security Director Clearance"
    : "Level 3 · Forensic Investigator Clearance";

  return (
    <main className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Personnel Credentials & Profile
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Official investigator identity, cryptographic session tokens, and department authorization.
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs"
        >
          <LogOut size={14} />
          Sign Out of Session
        </button>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
              {userInitials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-2xl font-bold text-slate-900">
                  {currentUser?.name || currentUser?.username || "Authorized Officer"}
                </h2>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                    isAdmin
                      ? "bg-purple-50 text-purple-700 border-purple-200/70"
                      : "bg-indigo-50 text-indigo-700 border-indigo-200/70"
                  }`}
                >
                  <Shield size={12} />
                  {currentUser?.role || "INVESTIGATOR"}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-1">
                Badge / Personnel ID: <span className="font-semibold text-slate-700">{currentUser?.id || "USR-2026-X"}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Cryptographic Session Active
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200">
              <Lock size={12} className="text-emerald-600" />
              AES-256 Vault Access
            </span>
          </div>
        </div>

        {/* Credentials Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <User size={13} /> Official Username
            </span>
            <p className="text-sm font-semibold text-slate-900 font-mono">
              @{currentUser?.username || "investigator"}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Mail size={13} /> Department Email
            </span>
            <p className="text-sm font-semibold text-slate-900">
              {currentUser?.email || "officer@caseintel.local"}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Building size={13} /> Assigned Unit
            </span>
            <p className="text-sm font-semibold text-slate-900">
              {currentUser?.department || "Cyber Crime & Special Operations"}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound size={13} /> Security Clearance
            </span>
            <p className="text-xs font-medium text-slate-700">
              {clearanceLevel}
            </p>
          </div>
        </div>
      </div>

      {/* ADMIN-ONLY OVERSIGHT SECTION */}
      {isAdmin ? (
        <div className="space-y-6 pt-2">
          {/* Admin Header & Stats */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                  Administrator Oversight
                </span>
                <span className="text-xs text-slate-500">Restricted Level 4 Access</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 mt-1">
                Active Personnel & Logged-In Investigators Roster
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time security monitoring of all authorized users, assigned departments, and cryptographic session statuses.
              </p>
            </div>

            <button
              onClick={fetchAdminRoster}
              disabled={loadingAdmin}
              className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-medium transition cursor-pointer shadow-xs self-start sm:self-auto disabled:opacity-50"
            >
              <RefreshCw size={13} className={loadingAdmin ? "animate-spin" : ""} />
              Refresh Roster
            </button>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Users</span>
                <Users size={16} className="text-slate-400" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {adminData?.totalUsers ?? 2}
              </p>
              <span className="text-[11px] text-slate-400">Registered platform identities</span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Investigators</span>
                <UserCheck size={16} className="text-indigo-500" />
              </div>
              <p className="text-2xl font-bold text-indigo-600 mt-2">
                {adminData?.totalInvestigators ?? 1}
              </p>
              <span className="text-[11px] text-slate-400">Active forensic field agents</span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Administrators</span>
                <Shield size={16} className="text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-purple-600 mt-2">
                {adminData?.totalAdmins ?? 1}
              </p>
              <span className="text-[11px] text-slate-400">Security & audit directors</span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Active Sessions</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-2xl font-bold text-emerald-600 mt-2">
                {adminData?.activeCount ?? 2}
              </p>
              <span className="text-[11px] text-slate-400">Currently authenticated</span>
            </div>
          </div>

          {/* Personnel Table */}
          <div className="bg-white border border-slate-200/80 rounded-xl overflow-x-auto shadow-xs">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-slate-50/70 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="text-left px-5 py-3.5">Officer / User</th>
                  <th className="text-left px-5 py-3.5">Email</th>
                  <th className="text-left px-5 py-3.5">Role</th>
                  <th className="text-left px-5 py-3.5">Department</th>
                  <th className="text-left px-5 py-3.5">Session Status</th>
                  <th className="text-right px-5 py-3.5">Last Login</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {(adminData?.users || [
                  {
                    id: "usr-admin-001",
                    username: "admin",
                    name: "Director Sharma",
                    email: "admin@caseintel.local",
                    role: "ADMIN",
                    department: "Special Operations",
                    status: "Active",
                    lastLoginAt: new Date().toISOString(),
                  },
                  {
                    id: "usr-inv-001",
                    username: "investigator",
                    name: "Inspector Rajesh Verma",
                    email: "investigator@caseintel.local",
                    role: "INVESTIGATOR",
                    department: "Cyber Crime",
                    status: "Active",
                    lastLoginAt: new Date().toISOString(),
                  },
                ]).map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                          {(u.name || u.username).substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-xs sm:text-sm">
                            {u.name}
                          </p>
                          <p className="text-[11px] font-mono text-slate-400">
                            @{u.username} · {u.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-600 font-mono">
                      {u.email}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase ${
                          u.role === "ADMIN"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-600">
                      {u.department}
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {u.status || "Active"}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right text-xs font-mono text-slate-500">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }) : "Current Session"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* NON-ADMIN INVESTIGATOR VIEW */
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2.5 text-slate-800">
            <BadgeCheck size={18} className="text-emerald-600" />
            <h3 className="font-semibold text-sm">Forensic Chain of Custody & Security Compliance</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            All document uploads, OCR extractions, and verification overrides conducted under this identity are cryptographically logged with SHA-256 hashes pursuant to Section 65B of the Indian Evidence Act.
          </p>
          <div className="pt-2 flex items-center gap-4 text-xs font-medium">
            <Link href="/cases" className="text-slate-900 underline hover:text-blue-600">
              Go to Assigned Cases →
            </Link>
            <Link href="/documents" className="text-slate-900 underline hover:text-blue-600">
              View Vaulted Exhibits →
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
