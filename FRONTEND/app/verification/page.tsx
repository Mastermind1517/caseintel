"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle,
  FileText,
  ShieldCheck,
  Check,
  RotateCcw,
  ArrowRight,
  Filter,
} from "lucide-react";

import {
  getVerificationIssues,
  resolveVerificationIssue,
} from "@/services/verificationService";

export default function VerificationPage() {
  const [issues, setIssues] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<"ALL" | "pending" | "resolved">("ALL");
  const [toastMessage, setToastMessage] = useState("");

  const loadIssues = async () => {
    const data = await getVerificationIssues();
    setIssues(data || []);
  };

  useEffect(() => {
    loadIssues();
  }, []);

  const resolveIssue = async (issueId: string, decision: string) => {
    const updatedIssue = await resolveVerificationIssue(issueId, decision);
    if (!updatedIssue) return;

    setIssues((currentIssues) =>
      currentIssues.map((issue) =>
        issue.id === issueId ? updatedIssue : issue
      )
    );

    setToastMessage(`Decision logged: "${decision}" recorded to immutable audit ledger.`);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const filteredIssues = issues.filter((iss) => {
    if (filterStatus === "pending") return iss.status === "pending";
    if (filterStatus === "resolved") return iss.status !== "pending";
    return true;
  });

  const pendingCount = issues.filter((i) => i.status === "pending").length;

  return (
    <main className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-7">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-slate-900 text-white text-xs font-medium flex items-center justify-between shadow-md animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage("")}
            className="text-slate-400 hover:text-white text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Human-In-The-Loop Oversight
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-[11px] font-mono text-slate-500 font-medium">
              {pendingCount} Pending Review
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Verification Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Resolve cross-document discrepancies detected by automated Indic AI models before legal submission.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs self-start sm:self-auto font-medium">
          <button
            type="button"
            onClick={() => setFilterStatus("ALL")}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              filterStatus === "ALL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            All ({issues.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("pending")}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              filterStatus === "pending" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("resolved")}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              filterStatus === "resolved" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Resolved ({issues.length - pendingCount})
          </button>
        </div>
      </div>

      {/* Discrepancy Cards List */}
      <div className="space-y-6">
        {filteredIssues.map((issue) => {
          const isPending = issue.status === "pending";
          const fieldName = issue.sourceA?.field || issue.type || "Evidence Discrepancy";

          return (
            <div
              key={issue.id}
              className={`bg-white border rounded-xl shadow-xs overflow-hidden transition-all ${
                isPending ? "border-amber-200/80" : "border-slate-200/80"
              }`}
            >
              {/* Card Header: Eye-catching but calm */}
              <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase border ${
                    isPending
                      ? "bg-amber-50 text-amber-900 border-amber-200"
                      : "bg-emerald-50 text-emerald-800 border-emerald-200/60"
                  }`}>
                    <AlertTriangle size={12} className={isPending ? "text-amber-600" : "text-emerald-600"} />
                    {isPending ? "INCONSISTENCY DETECTED" : "VERIFIED & RESOLVED"}
                  </span>
                  <span className="font-mono text-xs text-slate-400">
                    {issue.caseId} · {issue.id}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-500">
                    Status: <strong className={isPending ? "text-amber-800 font-semibold" : "text-slate-800 font-semibold"}>{issue.status === "pending" ? "Pending verification" : issue.status}</strong>
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-500">
                    Sources: <strong className="text-slate-700">2 documents</strong>
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 sm:p-7 space-y-6">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Contradicting Attribute
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                    {fieldName}
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    {issue.description || "Inconsistency detected across multi-document evidence ingestion."}
                  </p>
                </div>

                {/* Side-by-Side Document Comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Document 1 (Source A) */}
                  <div className="border border-slate-200/90 rounded-xl p-5 bg-white shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs truncate">
                        <FileText size={15} className="text-slate-500 shrink-0" />
                        <span className="truncate">{issue.sourceA?.documentName || "Document A"}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {issue.sourceA?.documentId || "DOC-001"}
                      </span>
                    </div>

                    <div>
                      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                        {issue.sourceA?.field || "Recorded Value"}
                      </p>
                      <p className="text-lg font-bold text-slate-900 mt-1">
                        {issue.sourceA?.value || "Value not available"}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                      Initial Police Evidence Filing
                    </div>
                  </div>

                  {/* Document 2 (Source B) */}
                  <div className="border border-slate-200/90 rounded-xl p-5 bg-white shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs truncate">
                        <FileText size={15} className="text-slate-500 shrink-0" />
                        <span className="truncate">{issue.sourceB?.documentName || "Document B"}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {issue.sourceB?.documentId || "DOC-002"}
                      </span>
                    </div>

                    <div>
                      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                        {issue.sourceB?.field || "Recorded Value"}
                      </p>
                      <p className="text-lg font-bold text-slate-900 mt-1">
                        {issue.sourceB?.value || "Value not available"}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                      Forensic / Field Investigation Report
                    </div>
                  </div>
                </div>

                {/* Human Review Actions */}
                {isPending ? (
                  <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs text-slate-500">
                      Select which source document is authoritative, or mark for investigation.
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => resolveIssue(issue.id, "Source A Confirmed")}
                        className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <Check size={14} />
                        <span>Confirm Finding ({issue.sourceA?.documentName ? issue.sourceA.documentName.split(".")[0] : "Source A"})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => resolveIssue(issue.id, "Source B Confirmed")}
                        className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <Check size={14} />
                        <span>Override ({issue.sourceB?.documentName ? issue.sourceB.documentName.split(".")[0] : "Source B"})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => resolveIssue(issue.id, "Further Review Required")}
                        className="px-3 py-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 text-xs font-medium transition cursor-pointer"
                      >
                        Further Review
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={15} className="text-emerald-600" />
                      <span>Resolution: <strong className="text-slate-900 font-semibold">{issue.status}</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={() => resolveIssue(issue.id, "pending")}
                      className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw size={12} />
                      <span>Reopen for review</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filteredIssues.length === 0 && (
          <div className="bg-white border border-slate-200/80 rounded-xl p-12 text-center space-y-2 shadow-xs">
            <ShieldCheck size={32} className="text-emerald-600 mx-auto" />
            <h3 className="text-base font-semibold text-slate-900">No Discrepancies Found</h3>
            <p className="text-xs text-slate-500">All evidence documents in the selected filter are consistent.</p>
          </div>
        )}
      </div>
    </main>
  );
}