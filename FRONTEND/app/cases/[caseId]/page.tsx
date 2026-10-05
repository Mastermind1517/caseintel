"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  ShieldCheck,
  Clock3,
  Network,
  ClipboardList,
  Brain,
  Upload,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  Download,
  Lock,
  Trash2,
  X,
} from "lucide-react";

import { getCaseById, deleteCase } from "@/services/casesService";
import { getDocuments, getDocumentDownloadUrl, deleteDocument } from "@/services/documentsService";
import { getVerificationIssues, resolveVerificationIssue } from "@/services/verificationService";
import { getTimeline } from "@/services/timelineService";
import { getAuditLogs } from "@/services/auditService";
import UploadModal from "@/components/ui/UploadModal";

const tabs = [
  { name: "Documents", icon: FileText, id: "documents" },
  { name: "AI Analysis", icon: Brain, id: "ai" },
  { name: "Verification", icon: ShieldCheck, id: "verification" },
  { name: "Timeline", icon: Clock3, id: "timeline" },
  { name: "Audit Trail", icon: ClipboardList, id: "audit" },
];

export default function CaseWorkspace() {
  const params = useParams();
  const router = useRouter();
  const caseId = (params.caseId as string) || "CASE-001";

  const [caseData, setCaseData] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("documents");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isDeleteCaseOpen, setIsDeleteCaseOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState("");

  const loadCaseDetails = async () => {
    setLoading(true);
    const [c, allDocs, allIssues, allTimeline, allLogs] = await Promise.all([
      getCaseById(caseId),
      getDocuments(),
      getVerificationIssues(),
      getTimeline(caseId),
      getAuditLogs(),
    ]);

    setCaseData(
      c || {
        id: caseId,
        name: "Case Workspace",
        department: "Investigation",
        priority: "High",
        status: "Active",
      }
    );

    setDocuments((allDocs || []).filter((d: any) => d.caseId === caseId));
    setIssues((allIssues || []).filter((i: any) => i.caseId === caseId));
    setTimeline(allTimeline || []);
    setAuditLogs((allLogs || []).filter((l: any) => l.target === caseId || l.target?.startsWith("DOC")));
    setLoading(false);
  };

  useEffect(() => {
    loadCaseDetails();
    try {
      const u = localStorage.getItem("caseintel_user");
      if (u) setCurrentUser(JSON.parse(u));
    } catch {}
  }, [caseId]);

  const isAdmin = (currentUser?.role || "").toUpperCase() === "ADMIN";
  const canDeleteDoc = isAdmin || (currentUser?.role || "").toUpperCase() === "INVESTIGATOR";

  const handleDeleteCase = async () => {
    setIsDeleting(true);
    try {
      await deleteCase(caseId);
      router.push("/cases");
    } catch (err: any) {
      alert(err.message || "Failed to delete case");
      setIsDeleting(false);
    }
  };

  const handleDeleteDoc = async () => {
    if (!docToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDocument(docToDelete.id);
      setToast(`Document "${docToDelete.name}" (${docToDelete.id}) permanently purged.`);
      setTimeout(() => setToast(""), 4000);
      setDocToDelete(null);
      loadCaseDetails();
    } catch (err: any) {
      alert(err.message || "Failed to delete document");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResolveIssue = async (issueId: string, decision: string) => {
    const updated = await resolveVerificationIssue(issueId, decision);
    if (updated) {
      setIssues((prev) => prev.map((i) => (i.id === issueId ? updated : i)));
    }
  };

  if (loading && !caseData) {
    return (
      <main className="p-8 max-w-7xl mx-auto">
        <div className="bg-white border rounded-xl p-16 text-center">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading case workspace...</p>
        </div>
      </main>
    );
  }

  const pendingIssues = issues.filter((i) => i.status === "pending");

  return (
    <main className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-green-600" />
            <span>{toast}</span>
          </div>
          <button onClick={() => setToast("")} className="text-xs text-green-600 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Back */}
      <Link
        href="/cases"
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-900 transition"
      >
        <ArrowLeft size={14} />
        Back to Cases
      </Link>

      {/* Case Header */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200">
                {caseData.id}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                {caseData.status}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight mt-2 text-slate-900">
              {caseData.name}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Department: <span className="font-medium text-slate-700">{caseData.department}</span> ·
              Priority: <span className="font-medium text-slate-700">{caseData.priority}</span> · Officer:{" "}
              <span className="font-medium text-slate-700">{caseData.officer || "Investigator"}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-lg text-xs font-medium transition shadow-xs cursor-pointer"
            >
              <Upload size={14} />
              Add Evidence File
            </button>
            <Link
              href="/connections"
              className="flex items-center gap-2 border border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50 px-3.5 py-2 rounded-lg text-xs font-medium transition shadow-xs"
            >
              <Network size={14} />
              Entity Graph
            </Link>
            {isAdmin && (
              <button
                onClick={() => setIsDeleteCaseOpen(true)}
                title="Permanently Delete Case (Admin Only)"
                className="flex items-center gap-1.5 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer"
              >
                <Trash2 size={13} />
                Delete Case
              </button>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t text-center">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Vaulted Documents</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{documents.length}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Pending Inconsistencies</p>
            <p className="text-xl font-bold text-amber-600 mt-1">{pendingIssues.length}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Investigation Events</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{timeline.length}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border rounded-xl shadow-xs overflow-hidden">
        <div className="flex border-b overflow-x-auto bg-gray-50/50">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-xs font-semibold whitespace-nowrap transition border-b-2 -mb-px ${
                  isActive
                    ? "border-black text-black bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Icon size={16} />
                {tab.name}
                {tab.id === "verification" && pendingIssues.length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {pendingIssues.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* TAB: DOCUMENTS */}
          {activeTab === "documents" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-gray-900">
                  Case Documents & Vault Records ({documents.length})
                </h3>
              </div>

              {documents.length > 0 ? (
                <div className="border rounded-xl overflow-hidden divide-y divide-gray-100">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-4 flex items-center justify-between hover:bg-gray-50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gray-100 rounded-lg text-gray-700">
                          <FileText size={18} />
                        </div>
                        <div>
                          <Link
                            href={`/documents/${doc.id}`}
                            className="font-semibold text-sm hover:text-blue-600 transition"
                          >
                            {doc.name}
                          </Link>
                          <p className="text-xs text-gray-400 font-mono mt-0.5">
                            {doc.id} · Type: {doc.type}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded">
                          <Lock size={11} /> AES-256
                        </span>
                        <span className="text-xs font-medium text-gray-600">
                          {doc.confidence ? `${doc.confidence}% Conf.` : "Processing"}
                        </span>
                        <Link
                          href={`/documents/${doc.id}`}
                          className="px-3 py-1.5 rounded-lg border text-xs font-medium text-gray-700 hover:bg-gray-100 transition"
                        >
                          View Analysis
                        </Link>
                        <a
                          href={getDocumentDownloadUrl(doc.id)}
                          download
                          className="p-1.5 rounded-lg border text-gray-500 hover:text-gray-800 transition"
                        >
                          <Download size={15} />
                        </a>
                        {canDeleteDoc && (
                          <button
                            onClick={() => setDocToDelete(doc)}
                            title="Purge Document from Vault"
                            className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 transition cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500 border border-dashed rounded-xl">
                  <p className="text-sm font-medium">No documents attached to this case yet.</p>
                  <button
                    onClick={() => setIsUploadOpen(true)}
                    className="mt-3 text-xs bg-black text-white px-3.5 py-2 rounded-lg font-medium"
                  >
                    Upload Document Now
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB: AI ANALYSIS */}
          {activeTab === "ai" && (
            <div className="space-y-6">
              <div className="border rounded-xl p-5 bg-purple-50/40 border-purple-100 flex items-center gap-3">
                <Brain size={24} className="text-purple-700 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-purple-900">
                    Automated Multi-lingual Document Intelligence
                  </h4>
                  <p className="text-xs text-purple-700 mt-0.5">
                    Case files undergo OCR, translation to English, entity linkage, and cross-source verification.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-xl p-5 bg-white">
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-3">
                    Verified Case Entities
                  </h4>
                  <div className="space-y-2 text-xs">
                    <p className="text-gray-700 font-medium">
                      • Primary Suspect / Subject: <span className="font-bold">Rahul Sharma</span>
                    </p>
                    <p className="text-gray-700 font-medium">
                      • Primary Jurisdiction: <span className="font-bold">Siliguri, West Bengal</span>
                    </p>
                    <p className="text-gray-700 font-medium">
                      • Key Date of Event: <span className="font-bold">12 August 2026</span>
                    </p>
                  </div>
                </div>

                <div className="border rounded-xl p-5 bg-white">
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-3">
                    OCR Engine Routing
                  </h4>
                  <div className="space-y-2 text-xs text-gray-600">
                    <p>• Indic Scripts (Hindi, Tamil, Telugu, Kannada): Routed to PaddleOCR</p>
                    <p>• Bengali Script: Routed to Tesseract-OCR (Bengali model)</p>
                    <p>• Neural Machine Translation: IndicTrans2 / Google Cloud API</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: VERIFICATION */}
          {activeTab === "verification" && (
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-gray-900">
                Inconsistencies & Cross-Check Alerts ({issues.length})
              </h3>

              {issues.length > 0 ? (
                <div className="space-y-4">
                  {issues.map((issue) => (
                    <div key={issue.id} className="border rounded-xl p-5 bg-white space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                            <AlertTriangle size={18} />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-gray-900">{issue.type}</h4>
                            <p className="text-xs text-gray-500">{issue.description}</p>
                          </div>
                        </div>

                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            issue.status === "pending"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {issue.status === "pending" ? "Pending Review" : issue.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-gray-50 border text-xs space-y-1">
                          <span className="font-semibold text-gray-500 uppercase">
                            Source A: {issue.sourceA.documentName}
                          </span>
                          <p className="text-gray-900 font-bold text-sm">{issue.sourceA.value}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-gray-50 border text-xs space-y-1">
                          <span className="font-semibold text-gray-500 uppercase">
                            Source B: {issue.sourceB.documentName}
                          </span>
                          <p className="text-gray-900 font-bold text-sm">{issue.sourceB.value}</p>
                        </div>
                      </div>

                      {issue.status === "pending" && (
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => handleResolveIssue(issue.id, "Source A Confirmed")}
                            className="px-3.5 py-1.5 rounded-lg bg-black text-white text-xs font-medium hover:bg-gray-800 transition"
                          >
                            Confirm Source A
                          </button>
                          <button
                            onClick={() => handleResolveIssue(issue.id, "Source B Confirmed")}
                            className="px-3.5 py-1.5 rounded-lg border text-gray-700 text-xs font-medium hover:bg-gray-50 transition"
                          >
                            Confirm Source B
                          </button>
                          <button
                            onClick={() => handleResolveIssue(issue.id, "Further Review")}
                            className="px-3.5 py-1.5 rounded-lg border text-gray-700 text-xs font-medium hover:bg-gray-50 transition"
                          >
                            Mark Further Review
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500 border rounded-xl">
                  <CheckCircle size={28} className="text-green-500 mx-auto mb-2" />
                  <p className="font-medium text-sm">No inconsistencies detected in this case!</p>
                  <p className="text-xs text-gray-400 mt-0.5">All dates, names, and facts match across documents.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: TIMELINE */}
          {activeTab === "timeline" && (
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-gray-900">Chronological Events</h3>
              <div className="border rounded-xl p-6 bg-white space-y-6">
                {timeline.map((event, idx) => (
                  <div key={event.id || idx} className="flex gap-4 items-start">
                    <div className="p-2 rounded-full bg-gray-100 text-gray-700 shrink-0 mt-0.5">
                      <Clock3 size={15} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-gray-900">{event.title}</span>
                        <span className="text-xs font-mono text-gray-400">{event.date}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: AUDIT */}
          {activeTab === "audit" && (
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-gray-900">Chain of Custody Logs</h3>
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b font-medium text-gray-500">
                    <tr>
                      <th className="text-left p-3.5">Time</th>
                      <th className="text-left p-3.5">User / Role</th>
                      <th className="text-left p-3.5">Action</th>
                      <th className="text-left p-3.5">Target</th>
                      <th className="text-left p-3.5">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="p-3.5 text-gray-600">{log.timestamp}</td>
                        <td className="p-3.5 font-medium">{log.user} ({log.role})</td>
                        <td className="p-3.5">{log.action}</td>
                        <td className="p-3.5 font-mono">{log.target}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded bg-green-100 text-green-700">
                            {log.result}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => loadCaseDetails()}
      />

      {/* Delete Case Confirmation Modal */}
      {isDeleteCaseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-red-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-red-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-100 text-red-700 rounded-lg">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Purge Investigation Case</h2>
                  <p className="text-xs text-red-600 font-mono font-medium">{caseId}</p>
                </div>
              </div>
              <button
                onClick={() => setIsDeleteCaseOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                Are you sure you want to permanently delete case <strong className="text-gray-900">"{caseData?.name}"</strong>?
              </p>
              <div className="p-3.5 bg-red-50 rounded-xl border border-red-200/80 text-xs text-red-800 space-y-1.5">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle size={14} className="shrink-0" />
                  Irreversible Cascade Deletion:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-red-700">
                  <li>All associated vault documents (.enc files) will be destroyed</li>
                  <li>Extracted AI analysis, OCR, and entities will be purged</li>
                  <li>Verification issues and audit timeline entries will be cleared</li>
                </ul>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setIsDeleteCaseOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteCase}
                  className="px-4 py-2 text-xs bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Trash2 size={13} />
                  {isDeleting ? "Purging Case..." : "Confirm Permanent Deletion"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Document Confirmation Modal */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-red-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-red-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-100 text-red-700 rounded-lg">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Purge Vault Document</h2>
                  <p className="text-xs text-red-600 font-mono font-medium">{docToDelete.id}</p>
                </div>
              </div>
              <button
                onClick={() => setDocToDelete(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                Permanently purge <strong className="text-gray-900">"{docToDelete.name}"</strong>?
              </p>
              <div className="p-3.5 bg-red-50 rounded-xl border border-red-200/80 text-xs text-red-800 space-y-1.5">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle size={14} className="shrink-0" />
                  Irreversible Security Purge:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-red-700">
                  <li>The AES-256 encrypted payload in the vault will be destroyed</li>
                  <li>Extracted OCR text, entities, and cross-source checks will be deleted</li>
                  <li>Audit trail will record permanent document purge</li>
                </ul>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDocToDelete(null)}
                  className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteDoc}
                  className="px-4 py-2 text-xs bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Trash2 size={13} />
                  {isDeleting ? "Purging Document..." : "Confirm Purge"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}