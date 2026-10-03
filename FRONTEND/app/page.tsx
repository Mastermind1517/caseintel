"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FolderOpen,
  FileText,
  ShieldAlert,
  ShieldCheck,
  Upload,
  ArrowRight,
  Plus,
  Lock,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Check,
} from "lucide-react";

import { getCases } from "@/services/casesService";
import { getDocuments } from "@/services/documentsService";
import { getVerificationIssues } from "@/services/verificationService";
import { getAuditLogs } from "@/services/auditService";
import { API_BASE_URL, AI_SERVICE_URL } from "@/config/api";

export default function Home() {
  const [cases, setCases] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState({ backend: "checking", ai: "checking" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      const [casesData, docsData, issuesData, logsData] = await Promise.all([
        getCases(),
        getDocuments(),
        getVerificationIssues(),
        getAuditLogs(),
      ]);

      setCases(casesData || []);
      setDocuments(docsData || []);
      setIssues(issuesData || []);
      setAuditLogs(logsData || []);

      // Check System Health
      try {
        const bRes = await fetch(`${API_BASE_URL}/health`);
        const bData = bRes.ok ? await bRes.json() : null;
        setSystemHealth((prev) => ({
          ...prev,
          backend: bRes.ok ? "online" : "error",
          ai: bData?.aiService?.status === "ok" ? "online" : "checking",
        }));

        if (bData?.aiService?.status !== "ok") {
          const aiRes = await fetch(`${AI_SERVICE_URL}/health`);
          setSystemHealth((prev) => ({
            ...prev,
            ai: aiRes.ok ? "online" : "offline",
          }));
        }
      } catch {
        setSystemHealth({ backend: "fallback", ai: "offline" });
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const pendingIssues = issues.filter((i) => i.status === "pending");
  const recentFindings = issues.slice(0, 4);
  const recentActivity = auditLogs.slice(0, 6);

  return (
    <main className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-7">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Investigation Workspace
            </span>
            <span className="text-slate-300">·</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Vault
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Case Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Cryptographic evidence vaulting, cross-document discrepancy intelligence, and audit tracking.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/cases"
            className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors shadow-xs"
          >
            <Plus size={15} />
            <span>New Case</span>
          </Link>
          <Link
            href="/documents"
            className="flex items-center justify-center gap-2 border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors shadow-xs"
          >
            <Upload size={15} />
            <span>Ingest Document</span>
          </Link>
        </div>
      </div>

      {/* 4 Priority Workspace Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Active Cases */}
        <Link
          href="/cases"
          className="bg-white border border-slate-200/80 rounded-xl p-5 hover:border-slate-300 transition-colors shadow-xs group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Cases
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
              <FolderOpen size={16} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold text-slate-900 tracking-tight">{cases.length}</p>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span>High & Medium Priority Dossiers</span>
            </p>
          </div>
        </Link>

        {/* Metric 2: Vaulted Documents */}
        <Link
          href="/documents"
          className="bg-white border border-slate-200/80 rounded-xl p-5 hover:border-slate-300 transition-colors shadow-xs group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Vaulted Evidence
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <FileText size={16} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold text-slate-900 tracking-tight">{documents.length}</p>
            <p className="text-xs text-emerald-700 font-medium mt-1 flex items-center gap-1">
              <Lock size={12} />
              <span>AES-256 Envelope Encrypted</span>
            </p>
          </div>
        </Link>

        {/* Metric 3: Pending Verification */}
        <Link
          href="/verification"
          className="bg-white border border-slate-200/80 rounded-xl p-5 hover:border-slate-300 transition-colors shadow-xs group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pending Verification
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <ShieldAlert size={16} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold text-slate-900 tracking-tight">{pendingIssues.length}</p>
            <p className="text-xs text-amber-800 font-medium mt-1">
              Requires Human Review & Decision
            </p>
          </div>
        </Link>

        {/* Metric 4: Inconsistency Findings */}
        <Link
          href="/verification"
          className="bg-white border border-slate-200/80 rounded-xl p-5 hover:border-slate-300 transition-colors shadow-xs group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Recent Findings
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold text-slate-900 tracking-tight">{issues.length}</p>
            <p className="text-xs text-slate-500 mt-1">Cross-Document Correlated</p>
          </div>
        </Link>
      </div>

      {/* Main Investigation Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: Active Investigation Cases */}
        <section className="lg:col-span-7 bg-white border border-slate-200/80 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Active Investigation Cases</h2>
                <p className="text-xs text-slate-500 mt-0.5">Assigned dossiers currently under active inquiry.</p>
              </div>
              <Link
                href="/cases"
                className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 transition"
              >
                <span>View all</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {cases.slice(0, 5).map((c) => (
                <div key={c.id} className="py-3.5 flex items-center justify-between gap-3 group">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-400 font-semibold">{c.id}</span>
                      <span className="text-slate-300">·</span>
                      <Link
                        href={`/cases/${c.id}`}
                        className="text-xs sm:text-sm font-semibold text-slate-900 hover:text-blue-600 transition truncate"
                      >
                        {c.name}
                      </Link>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      <span>{c.department || "Investigation Bureau"}</span>
                      <span>·</span>
                      <span>Officer: {c.officer || "Assigned"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        c.priority === "High"
                          ? "bg-rose-50 text-rose-700 border-rose-200/60"
                          : "bg-amber-50 text-amber-700 border-amber-200/60"
                      }`}
                    >
                      {c.priority}
                    </span>
                    <Link
                      href={`/cases/${c.id}`}
                      className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                      title="Open case dossier"
                    >
                      <ArrowUpRight size={15} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Showing {Math.min(cases.length, 5)} of {cases.length} cases</span>
            <Link href="/cases" className="text-slate-700 hover:underline">
              Create new investigation case →
            </Link>
          </div>
        </section>

        {/* Right 5 Columns: Findings & Cryptographic Activity Stream */}
        <div className="lg:col-span-5 space-y-6">
          {/* Priority Verification Card */}
          <section className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <h2 className="text-sm font-semibold text-slate-900">Verification Center Alerts</h2>
              </div>
              <Link href="/verification" className="text-xs text-slate-500 hover:text-slate-900 font-medium flex items-center gap-1">
                <span>Review</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="space-y-3 mt-3.5">
              {pendingIssues.length > 0 ? (
                pendingIssues.slice(0, 2).map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-amber-200/70 bg-amber-50/40 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-900 tracking-wide uppercase text-[10px]">
                        {item.type || "Inconsistency Detected"}
                      </span>
                      <span className="font-mono text-[10px] text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded">
                        {item.caseId}
                      </span>
                    </div>
                    <p className="text-slate-700 font-medium">
                      {item.description || "Discrepancy detected between evidence documents."}
                    </p>
                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                      <span>Source: {item.sourceA?.documentName || "Doc 1"} vs {item.sourceB?.documentName || "Doc 2"}</span>
                      <Link
                        href="/verification"
                        className="font-semibold text-slate-900 hover:underline"
                      >
                        Inspect →
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-400 flex flex-col items-center">
                  <CheckCircle2 size={24} className="text-emerald-500 mb-2" />
                  <p className="font-medium text-slate-600">All findings verified</p>
                  <p className="mt-0.5">No pending cross-document discrepancies.</p>
                </div>
              )}
            </div>
          </section>

          {/* Cryptographic Ledger Activity Stream */}
          <section className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-900">Cryptographic Chain of Custody</h2>
              </div>
              <Link href="/audit" className="text-xs text-slate-500 hover:text-slate-900 font-medium">
                Full Log
              </Link>
            </div>

            <div className="space-y-3 mt-3.5">
              {recentActivity.map((log) => (
                <div key={log.id} className="flex items-start justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{log.action}</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {log.target || log.user} · By {log.user} ({log.role})
                    </p>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 shrink-0">
                    {log.timestamp ? log.timestamp.split(",")[0] : "Recorded"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}