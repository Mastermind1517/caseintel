"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Upload, FileText, Lock, Download, CheckCircle2, Trash2, AlertTriangle, X } from "lucide-react";
import { getDocuments, getDocumentDownloadUrl, deleteDocument } from "@/services/documentsService";
import UploadModal from "@/components/ui/UploadModal";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [notification, setNotification] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [docToDelete, setDocToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadDocuments = async () => {
    const data = await getDocuments();
    setDocuments(data || []);
  };

  useEffect(() => {
    loadDocuments();
    try {
      const u = localStorage.getItem("caseintel_user");
      if (u) setCurrentUser(JSON.parse(u));
    } catch {}
  }, []);

  const canDelete = ['ADMIN', 'INVESTIGATOR'].includes((currentUser?.role || '').toUpperCase());

  const handleDeleteDocument = async () => {
    if (!docToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDocument(docToDelete.id);
      setNotification(`Document "${docToDelete.name}" (${docToDelete.id}) permanently purged from vault.`);
      setTimeout(() => setNotification(""), 5000);
      setDocToDelete(null);
      loadDocuments();
    } catch (err: any) {
      alert(err.message || "Failed to delete document");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUploadSuccess = (newDoc: any) => {
    loadDocuments();
    setNotification(`Successfully encrypted and vaulted "${newDoc?.name || 'document'}"!`);
    setTimeout(() => setNotification(""), 5000);
  };

  const filteredDocuments = documents.filter((doc) =>
    `${doc.id} ${doc.name} ${doc.type} ${doc.caseId}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <main className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Notification Toast */}
      {notification && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-green-600" />
            <span>{notification}</span>
          </div>
          <button
            onClick={() => setNotification("")}
            className="text-xs text-green-600 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vaulted Documents</h1>
          <p className="text-gray-500 mt-1">
            Manage evidence files, envelope encryption records, and automated AI analysis results.
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer shadow-xs"
        >
          <Upload size={17} />
          Upload Document
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border rounded-xl p-4 flex items-center gap-3">
        <Search size={18} className="text-gray-400 shrink-0" />
        <input
          type="text"
          placeholder="Search by Document Name, Case ID, or Document Type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="outline-none w-full text-sm placeholder:text-gray-400"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* Documents Table */}
      <div className="bg-white border rounded-xl overflow-x-auto shadow-xs">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="text-left px-5 py-3.5">Document</th>
              <th className="text-left px-5 py-3.5">Type</th>
              <th className="text-left px-5 py-3.5">Case ID</th>
              <th className="text-left px-5 py-3.5">Vault Security</th>
              <th className="text-left px-5 py-3.5">AI Confidence</th>
              <th className="text-right px-5 py-3.5">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {filteredDocuments.map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-50/70 transition">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 text-gray-700 rounded-lg">
                      <FileText size={18} />
                    </div>
                    <div>
                      <Link
                        href={`/documents/${doc.id}`}
                        className="font-semibold text-gray-900 hover:text-blue-600 transition"
                      >
                        {doc.name}
                      </Link>
                      <p className="text-xs font-mono text-gray-400 mt-0.5">{doc.id}</p>
                    </div>
                  </div>
                </td>

                <td className="px-5 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {doc.type}
                  </span>
                </td>

                <td className="px-5 py-4">
                  <Link
                    href={`/cases/${doc.caseId}`}
                    className="font-mono text-xs text-gray-600 hover:underline"
                  >
                    {doc.caseId}
                  </Link>
                </td>

                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Lock size={11} />
                    AES-256 Encrypted
                  </span>
                </td>

                <td className="px-5 py-4">
                  {doc.confidence !== null && doc.confidence !== undefined ? (
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-green-600 h-full rounded-full"
                          style={{ width: `${doc.confidence}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-700">
                        {doc.confidence}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-amber-600">Processing...</span>
                  )}
                </td>

                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/documents/${doc.id}`}
                      className="px-3 py-1.5 rounded-lg border text-xs font-medium text-gray-700 hover:bg-gray-100 transition"
                    >
                      AI Analysis
                    </Link>
                    <a
                      href={getDocumentDownloadUrl(doc.id)}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg border text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition"
                      title="Download decrypted file"
                    >
                      <Download size={15} />
                    </a>
                    {canDelete && (
                      <button
                        onClick={() => setDocToDelete(doc)}
                        title="Purge Document from Vault"
                        className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 transition cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredDocuments.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            <FileText size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="font-medium">No documents found matching "{search}"</p>
            <p className="text-xs text-gray-400 mt-1">Upload a document to begin analysis.</p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={handleUploadSuccess}
      />

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
                Are you sure you want to permanently purge <strong className="text-gray-900">"{docToDelete.name}"</strong>?
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
                  onClick={handleDeleteDocument}
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