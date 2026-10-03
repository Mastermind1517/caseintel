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
  Cpu,
} from "lucide-react";

import { getCases } from "@/services/casesService";
import { getDocuments } from "@/services/documentsService";
import { getVerificationIssues } from "@/services/verificationService";
import { API_BASE_URL, AI_SERVICE_URL } from "@/config/api";

export default function Home() {
  const [cases, setCases] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState({ backend: "checking", ai: "checking" });

  useEffect(() => {
    async function loadDashboardData() {
      const [casesData, docsData, issuesData] = await Promise.all([
        getCases(),
        getDocuments(),
        getVerificationIssues(),
      ]);

      setCases(casesData || []);
      setDocuments(docsData || []);
      setIssues(issuesData || []);

      // Check Backend & AI Health
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
      }
    }

    loadDashboardData();
  }, []);

  const pendingIssues = issues.filter((i) => i.status === "pending").length;

  return (
    <main className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Investigation Dashboard</h1>
          <p className="text-gray-500 mt-1 text-xs sm:text-sm">
            Real-time case intelligence, envelope-encrypted documents, and Indic AI processing.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/documents"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-black text-white px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-800 transition"
          >
            <Upload size={15} />
            Upload Document
          </Link>
          <Link
            href="/cases"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 border bg-white text-gray-700 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-50 transition"
          >
            <Plus size={15} />
            New Case
          </Link>
        </div>
      </div>

      {/* System Status Banner */}
      <div className="bg-white border rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-6">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                systemHealth.backend === "online"
                  ? "bg-green-500"
                  : systemHealth.backend === "fallback"
                  ? "bg-yellow-500"
                  : "bg-gray-400"
              }`}
            />
            <span className="font-medium text-gray-700">Backend API</span>
            <span className="text-gray-400">
              {systemHealth.backend === "online" ? "Active (Port 3001)" : "Local Mode"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                systemHealth.ai === "online" ? "bg-green-500" : "bg-gray-400"
              }`}
            />
            <span className="font-medium text-gray-700">AI Microservice</span>
            <span className="text-gray-400">
              {systemHealth.ai === "online" ? "Active (Port 8000)" : "PaddleOCR / Tesseract"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="font-medium text-gray-700">Storage Security</span>
            <span className="text-gray-400">AES-256 Envelope Encryption</span>
          </div>
        </div>

        <span className="text-gray-400 font-mono text-[11px]">
          Session: Authorized Investigator
        </span>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Active Cases</p>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <FolderOpen size={18} />
            </div>
          </div>
          <p className="text-3xl font-bold mt-3">{cases.length}</p>
          <p className="text-xs text-gray-400 mt-1">Across all departments</p>
        </div>

        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Vaulted Documents</p>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <FileText size={18} />
            </div>
          </div>
          <p className="text-3xl font-bold mt-3">{documents.length}</p>
          <p className="text-xs text-green-600 mt-1">AES-256 Vault Encrypted</p>
        </div>

        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Pending Verification</p>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <ShieldAlert size={18} />
            </div>
          </div>
          <p className="text-3xl font-bold mt-3 text-amber-600">{pendingIssues}</p>
          <p className="text-xs text-gray-400 mt-1">Requires human investigator review</p>
        </div>

        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">AI Confidence Avg</p>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Cpu size={18} />
            </div>
          </div>
          <p className="text-3xl font-bold mt-3">
            {(() => {
              const valid = documents.filter((d: any) => typeof d.confidence === "number" && d.confidence > 0);
              return valid.length > 0
                ? `${Math.round(valid.reduce((acc: number, curr: any) => acc + curr.confidence, 0) / valid.length)}%`
                : "Ready";
            })()}
          </p>
          <p className="text-xs text-gray-400 mt-1">Calculated across vaulted documents</p>
        </div>
      </div>

      {/* Grid: Recent Cases & Quick AI Workflow */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cases List */}
        <section className="lg:col-span-2 bg-white border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Active Cases</h2>
            <Link
              href="/cases"
              className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1"
            >
              View all cases <ArrowRight size={13} />
            </Link>
          </div>

          <div className="space-y-3">
            {cases.slice(0, 4).map((c) => (
              <Link
                key={c.id}
                href={`/cases/${c.id}`}
                className="block border rounded-lg p-4 hover:border-black/30 hover:bg-gray-50/50 transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{c.name}</span>
                      <span className="text-xs font-mono text-gray-400">{c.id}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {c.department} · Lead: {c.officer}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        c.priority === "High"
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {c.priority}
                    </span>
                    <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                      {c.status}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* AI & Verification Quick Actions */}
        <section className="bg-white border rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-2">Automated Pipeline</h2>
            <p className="text-xs text-gray-500 leading-relaxed mb-4">
              Upload scanned FIRs, charge sheets, or court records in Indian languages (Hindi, Bengali, Tamil, Telugu, Kannada) or English.
            </p>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-gray-50 rounded-lg border flex items-start gap-2.5">
                <div className="p-1 rounded bg-black text-white mt-0.5">
                  <FileText size={12} />
                </div>
                <div>
                  <p className="font-medium text-gray-800">1. Envelope Encryption</p>
                  <p className="text-gray-500 text-[11px]">Vaulted at rest with SHA-256 integrity hash.</p>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border flex items-start gap-2.5">
                <div className="p-1 rounded bg-black text-white mt-0.5">
                  <Cpu size={12} />
                </div>
                <div>
                  <p className="font-medium text-gray-800">2. Indic OCR & Translation</p>
                  <p className="text-gray-500 text-[11px]">High-accuracy PaddleOCR + Tesseract routing.</p>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border flex items-start gap-2.5">
                <div className="p-1 rounded bg-black text-white mt-0.5">
                  <ShieldCheck size={12} />
                </div>
                <div>
                  <p className="font-medium text-gray-800">3. Cross-Document Crosscheck</p>
                  <p className="text-gray-500 text-[11px]">Flags inconsistencies directly in the Verification Center.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t">
            <Link
              href="/verification"
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-medium py-2.5 rounded-lg text-xs transition"
            >
              <ShieldAlert size={15} />
              Review Verification Center ({pendingIssues})
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}